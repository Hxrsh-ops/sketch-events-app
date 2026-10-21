import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createEventAction,
  updateEventAction,
  setEventLifecycleAction,
} from "@/app/actions/event-actions";
import {
  CreateEventSchema,
  UpdateEventSchema,
} from "@/lib/validations/event-schemas";

import * as sessionModule from "@/lib/auth/session";
import { resetAppEnvCache } from "@/lib/env";
import { getStoredEvents, saveEvent } from "@/lib/registration-store";
import { EventItem } from "@/types";

// Mock next/cache so revalidatePath does not fail in test environment
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Slice 3.1: Event Management Server Actions & Security Invariants", () => {
  const originalEnv = { ...process.env };

  const validEventInput = {
    title: "Sketch Design Hackathon 2026",
    category: "Hackathon",
    shortDescription: "A weekend design and build sprint for university creatives.",
    description: "Detailed description of the design hackathon...",
    startDate: "2026-11-20T09:00:00Z",
    endDate: "2026-11-21T18:00:00Z",
    venue: "Main Auditorium, Block C",
    venueMode: "in-person" as const,
    capacity: 100,
    lifecycle: "draft" as const,
    registrationState: "upcoming" as const,
    hasTeams: true,
    minTeamSize: 2,
    maxTeamSize: 4,
  };

  beforeEach(() => {
    resetAppEnvCache();
    process.env = { ...originalEnv };
    process.env.APP_MODE = "preview";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    vi.restoreAllMocks();
  });

  describe("1. Authentication Verification", () => {
    it("strictly rejects createEventAction when caller is unauthenticated", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValueOnce({
        isAuthenticated: false,
        isAdmin: false,
        user: null,
      });

      const result = await createEventAction(validEventInput);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("UNAUTHORIZED");
      }
    });

    it("strictly rejects updateEventAction when caller is unauthenticated", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValueOnce({
        isAuthenticated: false,
        isAdmin: false,
        user: null,
      });

      const result = await updateEventAction({ id: "evt-diet-code", title: "Renamed" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("UNAUTHORIZED");
      }
    });

    it("strictly rejects setEventLifecycleAction when caller is unauthenticated", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValueOnce({
        isAuthenticated: false,
        isAdmin: false,
        user: null,
      });

      const result = await setEventLifecycleAction({ id: "evt-diet-code", lifecycle: "live" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("UNAUTHORIZED");
      }
    });
  });

  describe("2. Role-Based Least Privilege Matrix", () => {
    it("forbids attendance_staff from creating events", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValueOnce({
        isAuthenticated: true,
        isAdmin: true,
        user: {
          id: "staff-1",
          name: "Gatekeeper Staff",
          email: "gatekeeper@sketch.org",
          role: "attendance_staff",
        },
      });

      const result = await createEventAction(validEventInput);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("FORBIDDEN");
      }
    });

    it("forbids attendance_staff from editing events", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValueOnce({
        isAuthenticated: true,
        isAdmin: true,
        user: {
          id: "staff-1",
          name: "Gatekeeper Staff",
          email: "gatekeeper@sketch.org",
          role: "attendance_staff",
        },
      });

      const result = await updateEventAction({ id: "evt-diet-code", capacity: 150 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("FORBIDDEN");
      }
    });

    it("forbids analyst from publishing or changing event lifecycles", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValueOnce({
        isAuthenticated: true,
        isAdmin: true,
        user: {
          id: "analyst-1",
          name: "Data Analyst",
          email: "analyst@sketch.org",
          role: "analyst",
        },
      });

      const result = await setEventLifecycleAction({ id: "evt-diet-code", lifecycle: "live" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("FORBIDDEN");
      }
    });

    it("permits event_manager to perform event operations", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValue({
        isAuthenticated: true,
        isAdmin: true,
        isPreview: true,
        user: {
          id: "mgr-1",
          name: "Event Lead",
          email: "lead@sketch.org",
          role: "event_manager",
        },
      });

      const result = await createEventAction(validEventInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe(validEventInput.title);
      }
    });
  });

  describe("3. Zod Input Validation & Invariant Guardrails", () => {
    it("fails validation if title is too short (< 2 chars)", () => {
      const parsed = CreateEventSchema.safeParse({
        ...validEventInput,
        title: "X",
      });
      expect(parsed.success).toBe(false);
    });

    it("fails validation if end date occurs before or equal to start date", () => {
      const parsed = CreateEventSchema.safeParse({
        ...validEventInput,
        startDate: "2026-11-20T18:00:00Z",
        endDate: "2026-11-20T10:00:00Z",
      });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.flatten().fieldErrors.endDate).toBeDefined();
      }
    });

    it("fails validation if max team size is less than min team size", () => {
      const parsed = CreateEventSchema.safeParse({
        ...validEventInput,
        hasTeams: true,
        minTeamSize: 4,
        maxTeamSize: 2,
      });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.flatten().fieldErrors.maxTeamSize).toBeDefined();
      }
    });

    it("fails validation if capacity is not positive", () => {
      const parsed = CreateEventSchema.safeParse({
        ...validEventInput,
        capacity: 0,
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe("4. Locked Event Invariants", () => {
    const testAdminSession = {
      isAuthenticated: true,
      isAdmin: true,
      isPreview: true,
      user: {
        id: "admin-1",
        name: "Admin User",
        email: "admin@sketch.org",
        role: "master_admin" as const,
      },
    };

    it("strictly rejects capacity reduction below current registered count", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValue(testAdminSession);

      // Seed an event with 48 registrations
      const testEvent: EventItem = {
        id: "evt-capacity-guard-test",
        slug: "capacity-guard-test",
        title: "Capacity Guard Event",
        category: "Workshop",
        shortDescription: "Testing capacity reduction guard",
        description: "Testing capacity reduction guard",
        posterUrl: "",
        startDate: "2026-11-20T10:00:00Z",
        endDate: "2026-11-20T13:00:00Z",
        venue: "Hall A",
        venueMode: "in-person",
        capacity: 100,
        registeredCount: 48,
        checkedInCount: 0,
        lifecycle: "published",
        registrationState: "open",
        hasTeams: false,
        hasRounds: false,
        featured: false,
      };
      saveEvent(testEvent);

      // Attempt reducing capacity to 40 (below registeredCount 48)
      const res = await updateEventAction({
        id: "evt-capacity-guard-test",
        capacity: 40,
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe("CAPACITY_BELOW_REGISTERED");
      }

      // Increasing capacity to 120 must succeed
      const okRes = await updateEventAction({
        id: "evt-capacity-guard-test",
        capacity: 120,
      });
      expect(okRes.success).toBe(true);
    });

    it("locks slug once event is published or live", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValue(testAdminSession);

      const publishedEvent: EventItem = {
        id: "evt-slug-locked-test",
        slug: "immutable-slug-test",
        title: "Published Event",
        category: "Design",
        shortDescription: "Testing slug lock",
        description: "Testing slug lock",
        posterUrl: "",
        startDate: "2026-11-20T10:00:00Z",
        endDate: "2026-11-20T13:00:00Z",
        venue: "Hall B",
        venueMode: "in-person",
        capacity: 50,
        registeredCount: 5,
        checkedInCount: 0,
        lifecycle: "published",
        registrationState: "open",
        hasTeams: false,
        hasRounds: false,
        featured: false,
      };
      saveEvent(publishedEvent);

      // Attempt altering slug on published event
      const res = await updateEventAction({
        id: "evt-slug-locked-test",
        slug: "altered-new-slug",
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe("SLUG_LOCKED");
      }
    });

    it("allows slug modification while event is still in draft lifecycle", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValue(testAdminSession);

      const draftEvent: EventItem = {
        id: "evt-draft-slug-test",
        slug: "original-draft-slug",
        title: "Draft Event",
        category: "Design",
        shortDescription: "Draft slug modification test",
        description: "Draft slug modification test",
        posterUrl: "",
        startDate: "2026-11-20T10:00:00Z",
        endDate: "2026-11-20T13:00:00Z",
        venue: "Hall C",
        venueMode: "in-person",
        capacity: 50,
        registeredCount: 0,
        checkedInCount: 0,
        lifecycle: "draft",
        registrationState: "upcoming",
        hasTeams: false,
        hasRounds: false,
        featured: false,
      };
      saveEvent(draftEvent);

      const res = await updateEventAction({
        id: "evt-draft-slug-test",
        slug: "updated-draft-slug",
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.slug).toBe("updated-draft-slug");
      }
    });

    it("strictly prevents reverting an event to draft once registrations have been recorded", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValue(testAdminSession);

      const registeredEvent: EventItem = {
        id: "evt-draft-revert-test",
        slug: "no-draft-revert",
        title: "Active Event With Attendees",
        category: "Design",
        shortDescription: "Testing draft reversion prevention",
        description: "Testing draft reversion prevention",
        posterUrl: "",
        startDate: "2026-11-20T10:00:00Z",
        endDate: "2026-11-20T13:00:00Z",
        venue: "Hall D",
        venueMode: "in-person",
        capacity: 50,
        registeredCount: 12,
        checkedInCount: 0,
        lifecycle: "published",
        registrationState: "open",
        hasTeams: false,
        hasRounds: false,
        featured: false,
      };
      saveEvent(registeredEvent);

      // Attempt reverting to draft
      const res = await setEventLifecycleAction({
        id: "evt-draft-revert-test",
        lifecycle: "draft",
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe("CANNOT_REVERT_TO_DRAFT");
      }

      // Archiving or completing should be allowed
      const archiveRes = await setEventLifecycleAction({
        id: "evt-draft-revert-test",
        lifecycle: "archived",
      });
      expect(archiveRes.success).toBe(true);
    });
  });

  describe("5. Preview Mode Transparency & Isolation", () => {
    it("clearly demarcates preview actions with [Preview Mode] messaging and isolates data", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValue({
        isAuthenticated: true,
        isAdmin: true,
        isPreview: true,
        user: {
          id: "preview-admin",
          name: "Harshanth",
          email: "harshanth@sketch.org",
          role: "master_admin",
        },
      });

      const res = await createEventAction({
        ...validEventInput,
        title: "Preview Mode Isolated Event",
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.message).toContain("[Preview Mode]");
        expect(res.data.id).toMatch(/^evt-/);

        // Retrievable from local store
        const stored = getStoredEvents().find((e) => e.id === res.data.id);
        expect(stored).toBeDefined();
        expect(stored?.title).toBe("Preview Mode Isolated Event");
      }
    });
  });
});
