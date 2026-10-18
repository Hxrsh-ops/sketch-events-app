import { describe, it, expect, vi, beforeEach } from "vitest";
import { SketchRepository } from "@/lib/supabase/repository";
import { resetAppEnvCache } from "@/lib/env";
import { saveEvent, getStoredEvents } from "@/lib/registration-store";
import { updateEventAction, setEventLifecycleAction } from "@/app/actions/event-actions";
import * as sessionModule from "@/lib/auth/session";
import * as supabaseServerModule from "@/lib/supabase/server";
import EventsPage from "@/app/(admin)/events/page";
import { EventItem } from "@/types";

// Mock next/cache so revalidatePath does not fail in test environment
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Slice 3.2: Persistent Event Directory & Detail UI Testing", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetAppEnvCache();
    process.env = { ...originalEnv };
    process.env.APP_MODE = "preview";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    vi.restoreAllMocks();
  });

  describe("1. Directory Lifecycle, Category Filtering & Search", () => {
    it("filters events by lifecycle tab (published vs draft vs completed)", async () => {
      const all = await SketchRepository.listEvents({ status: "all" });
      expect(all.length).toBeGreaterThan(0);

      const published = await SketchRepository.listEvents({ status: "published" });
      expect(published.every((e) => e.lifecycle === "published")).toBe(true);

      const drafts = await SketchRepository.listEvents({ status: "draft" });
      expect(drafts.every((e) => e.lifecycle === "draft")).toBe(true);
    });

    it("filters events by category", async () => {
      const workshops = await SketchRepository.listEvents({ category: "Workshop" });
      expect(workshops.length).toBeGreaterThan(0);
      expect(workshops.every((e) => e.category === "Workshop")).toBe(true);
    });

    it("searches events by title and venue keywords", async () => {
      const searchTitle = await SketchRepository.listEvents({ search: "Diet" });
      expect(searchTitle.length).toBeGreaterThan(0);
      expect(searchTitle.some((e) => e.title.includes("Diet"))).toBe(true);

      const searchVenue = await SketchRepository.listEvents({ search: "Campus" });
      expect(searchVenue.length).toBeGreaterThan(0);
      expect(searchVenue.some((e) => e.venue.includes("Campus"))).toBe(true);
    });
  });

  describe("2. Empty and Error State Handling", () => {
    it("returns an empty array when search yields no matches", async () => {
      const empty = await SketchRepository.listEvents({ search: "xyz-no-event-exists-999" });
      expect(Array.isArray(empty)).toBe(true);
      expect(empty.length).toBe(0);
    });

    it("never silently falls back to mock events when a production database fails", async () => {
      process.env.APP_MODE = "production";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://sketch-actual-project.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_token";
      resetAppEnvCache();

      // Mock database returning error in production
      vi.spyOn(supabaseServerModule, "createClient").mockResolvedValueOnce({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "Connection to database failed: 503 Service Unavailable" },
            }),
          }),
        }),
      } as any);

      // In production mode with failing query, it must throw rather than silently returning mock data
      await expect(SketchRepository.listEvents()).rejects.toThrow(
        "Failed to list events: Connection to database failed: 503 Service Unavailable"
      );
    });
  });

  describe("3. Event Detail Lookup and Missing Records", () => {
    it("returns null for non-existent event IDs rather than falling back to default event", async () => {
      const result = await SketchRepository.getEventById("completely-invalid-uuid-or-id");
      expect(result).toBeNull();
    });

    it("retrieves the exact event by ID when it exists", async () => {
      const all = await SketchRepository.listEvents();
      const firstEvent = all[0];
      expect(firstEvent).toBeDefined();

      const retrieved = await SketchRepository.getEventById(firstEvent.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(firstEvent.id);
      expect(retrieved?.title).toBe(firstEvent.title);
    });

    it("restricts public getEventBySlug to published or live events only (drafts return null)", async () => {
      // Seed a test draft event
      const draftEvent: EventItem = {
        id: "evt-secret-draft",
        slug: "secret-unreleased-event",
        title: "Secret Draft Event",
        category: "Design",
        shortDescription: "Unpublished draft event",
        description: "Draft",
        posterUrl: "",
        startDate: "2026-12-01T10:00:00Z",
        endDate: "2026-12-01T12:00:00Z",
        venue: "Hall 1",
        venueMode: "in-person",
        capacity: 50,
        registeredCount: 0,
        checkedInCount: 0,
        lifecycle: "draft",
        registrationState: "upcoming",
        hasTeams: false,
        hasRounds: false,
      };
      saveEvent(draftEvent);

      // Public resolver must NOT expose the draft event
      const publicResult = await SketchRepository.getEventBySlug("secret-unreleased-event");
      expect(publicResult).toBeNull();

      // When published, it is accessible
      draftEvent.lifecycle = "published";
      saveEvent(draftEvent);

      const publishedResult = await SketchRepository.getEventBySlug("secret-unreleased-event");
      expect(publishedResult).not.toBeNull();
      expect(publishedResult?.id).toBe("evt-secret-draft");
    });
  });

  describe("4. Role-Restricted Mutation Controls in Detail View", () => {
    it("forbids attendance_staff from editing event details", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValueOnce({
        isAuthenticated: true,
        isAdmin: true,
        user: {
          id: "staff-1",
          name: "Gate Staff",
          email: "gate@sketch.org",
          role: "attendance_staff",
        },
      });

      const res = await updateEventAction({
        id: "evt-diet-code",
        title: "Malicious Edit",
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe("FORBIDDEN");
      }
    });

    it("forbids analysts from modifying event lifecycle status", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValueOnce({
        isAuthenticated: true,
        isAdmin: true,
        user: {
          id: "analyst-1",
          name: "Analyst",
          email: "analyst@sketch.org",
          role: "analyst",
        },
      });

      const res = await setEventLifecycleAction({
        id: "evt-diet-code",
        lifecycle: "archived",
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe("FORBIDDEN");
      }
    });
  });

  describe("5. Preview vs. Production Separation", () => {
    it("identifies preview mode and prevents mock mutation from claiming production persistence", () => {
      process.env.APP_MODE = "preview";
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      resetAppEnvCache();
      expect(SketchRepository.isPreview()).toBe(true);

      process.env.APP_MODE = "production";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://sketch-actual-project.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_token";
      resetAppEnvCache();
      expect(SketchRepository.isPreview()).toBe(false);
    });
  });

  describe("6. Artwork & Registration Form Schema Preservation", () => {
    it("preserves independent directory and hero artwork properties", async () => {
      const testEvent: EventItem = {
        id: "evt-artwork-test",
        slug: "artwork-test",
        title: "Artwork Verification Event",
        category: "Design",
        shortDescription: "Testing independent artwork fields",
        description: "Description",
        posterUrl: "https://example.com/poster.jpg",
        heroImage: "https://example.com/hero.jpg",
        heroImageFocalPoint: "center 25%",
        directoryImage: "https://example.com/dir.jpg",
        directoryImageFocalPoint: "center 75%",
        startDate: "2026-11-01T10:00:00Z",
        endDate: "2026-11-01T12:00:00Z",
        venue: "Hall X",
        venueMode: "in-person",
        capacity: 100,
        registeredCount: 0,
        checkedInCount: 0,
        lifecycle: "draft",
        registrationState: "upcoming",
        hasTeams: false,
        hasRounds: false,
        registrationForm: {
          version: 1,
          sections: [
            {
              id: "sec-1",
              title: "Custom Section",
              fields: [
                {
                  id: "fld-1",
                  label: "Portfolio Link",
                  type: "url",
                  required: true,
                },
              ],
            },
          ],
        },
      };

      saveEvent(testEvent);

      const retrieved = await SketchRepository.getEventById("evt-artwork-test");
      expect(retrieved).not.toBeNull();
      expect(retrieved?.heroImage).toBe("https://example.com/hero.jpg");
      expect(retrieved?.heroImageFocalPoint).toBe("center 25%");
      expect(retrieved?.directoryImage).toBe("https://example.com/dir.jpg");
      expect(retrieved?.directoryImageFocalPoint).toBe("center 75%");
      expect(retrieved?.registrationForm?.sections[0].fields[0].id).toBe("fld-1");
    });
  });

  describe("7. Server Component Data Loading & Boundary Integrity", () => {
    it("loads events successfully in EventsPage server component during preview mode without throwing client boundary errors", async () => {
      process.env.APP_MODE = "preview";
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      resetAppEnvCache();

      const pageComponent = await EventsPage();
      expect(pageComponent).toBeDefined();
      expect(pageComponent.props.isPreview).toBe(true);
      expect(pageComponent.props.initialError).toBeNull();
      expect(Array.isArray(pageComponent.props.initialEvents)).toBe(true);
      expect(pageComponent.props.initialEvents.length).toBeGreaterThan(0);
    });

    it("honestly passes database errors to EventsDirectoryClient props when persistent query fails and does not inject fake events", async () => {
      process.env.APP_MODE = "production";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://sketch-actual-project.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_token";
      resetAppEnvCache();

      vi.spyOn(supabaseServerModule, "createClient").mockResolvedValueOnce({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "Failed to connect to database: 500 Internal Error" },
            }),
          }),
        }),
      } as any);

      const pageComponent = await EventsPage();
      expect(pageComponent).toBeDefined();
      expect(pageComponent.props.isPreview).toBe(false);
      expect(pageComponent.props.initialError).toBe("Failed to list events: Failed to connect to database: 500 Internal Error");
      expect(pageComponent.props.initialEvents).toEqual([]);
    });

    it("allows getStoredEvents to be executed in a server environment (Node.js) without window reference errors", () => {
      expect(typeof window).toBe("undefined");
      const events = getStoredEvents();
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBeGreaterThan(0);
      expect(events[0]).toHaveProperty("id");
      expect(events[0]).toHaveProperty("title");
    });
  });
});
