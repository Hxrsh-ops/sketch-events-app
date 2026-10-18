import { describe, it, expect, vi, beforeEach } from "vitest";
import PublicEventPage from "@/app/(public)/e/[slug]/page";
import PublicEventClient from "@/app/(public)/e/[slug]/public-event-client";
import { SketchRepository } from "@/lib/supabase/repository";
import { resetAppEnvCache } from "@/lib/env";
import { saveEvent } from "@/lib/registration-store";
import * as supabaseServerModule from "@/lib/supabase/server";
import { EventItem } from "@/types";

/**
 * Helper to recursively extract text from React JSX elements
 * without triggering circular JSON errors on React internals
 */
function extractText(node: any): string {
  if (!node) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join(" ");
  if (typeof node === "object" && node.props) return extractText(node.props.children);
  return "";
}

describe("Public Event Page Server Data Integration & Protection", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetAppEnvCache();
    process.env = { ...originalEnv };
    process.env.APP_MODE = "preview";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    vi.restoreAllMocks();
  });

  describe("1. Published & Live Event Resolution", () => {
    it("resolves and renders a published event by its slug via server repository", async () => {
      const pageResult = await PublicEventPage({
        params: Promise.resolve({ slug: "diet-code-2026" }),
      });

      expect(pageResult).toBeDefined();
      expect(pageResult.type).toBe(PublicEventClient);
      expect(pageResult.props.event).toBeDefined();
      expect(pageResult.props.event.slug).toBe("diet-code-2026");
      expect(pageResult.props.event.lifecycle).toBe("published");
      expect(pageResult.props.isPreview).toBe(true);
    });

    it("resolves and renders a live event when lifecycle is live", async () => {
      const liveEvent: EventItem = {
        id: "evt-live-challenge",
        slug: "live-hackathon-2026",
        title: "Live Campus Hackathon",
        category: "Hackathon",
        shortDescription: "Live ongoing competition",
        description: "Full description",
        posterUrl: "",
        startDate: "2026-10-17T09:00:00Z",
        endDate: "2026-10-18T18:00:00Z",
        venue: "Innovation Hub",
        venueMode: "in-person",
        capacity: 100,
        registeredCount: 50,
        checkedInCount: 45,
        lifecycle: "live",
        registrationState: "open",
        hasTeams: true,
        hasRounds: false,
      };

      saveEvent(liveEvent);

      const pageResult = await PublicEventPage({
        params: Promise.resolve({ slug: "live-hackathon-2026" }),
      });

      expect(pageResult).toBeDefined();
      expect(pageResult.type).toBe(PublicEventClient);
      expect(pageResult.props.event.id).toBe("evt-live-challenge");
      expect(pageResult.props.event.lifecycle).toBe("live");
    });
  });

  describe("2. Non-Public Lifecycle & Missing Event Protection", () => {
    it("renders the unavailable state for non-existent slugs", async () => {
      const pageResult = await PublicEventPage({
        params: Promise.resolve({ slug: "completely-nonexistent-slug-999" }),
      });

      expect(pageResult).toBeDefined();
      expect(pageResult.type).not.toBe(PublicEventClient);
      const renderedText = extractText(pageResult);
      expect(renderedText).toContain("Event Not Available");
    });

    it("strictly protects draft events from public exposure without leaking event details", async () => {
      const draftEvent: EventItem = {
        id: "evt-confidential-draft",
        slug: "confidential-draft-launch",
        title: "Super Secret Unreleased Launch",
        category: "Conference",
        shortDescription: "Confidential company launch event",
        description: "Private details that should never be visible to the public.",
        posterUrl: "https://example.com/secret.jpg",
        startDate: "2026-12-25T10:00:00Z",
        endDate: "2026-12-25T14:00:00Z",
        venue: "Secret Boardroom",
        venueMode: "in-person",
        capacity: 20,
        registeredCount: 0,
        checkedInCount: 0,
        lifecycle: "draft",
        registrationState: "upcoming",
        hasTeams: false,
        hasRounds: false,
      };

      saveEvent(draftEvent);

      const pageResult = await PublicEventPage({
        params: Promise.resolve({ slug: "confidential-draft-launch" }),
      });

      expect(pageResult.type).not.toBe(PublicEventClient);
      const renderedText = extractText(pageResult);
      expect(renderedText).toContain("Event Not Available");
      expect(renderedText).not.toContain("Super Secret Unreleased Launch");
      expect(renderedText).not.toContain("Private details that should never be visible");
    });

    it("protects archived events from public registration", async () => {
      const archivedEvent: EventItem = {
        id: "evt-past-archived",
        slug: "past-archived-symposium",
        title: "Past Archived Symposium",
        category: "Conference",
        shortDescription: "Past event archived for historical records",
        description: "Archived content",
        posterUrl: "",
        startDate: "2025-01-01T10:00:00Z",
        endDate: "2025-01-01T14:00:00Z",
        venue: "Auditorium",
        venueMode: "in-person",
        capacity: 100,
        registeredCount: 80,
        checkedInCount: 75,
        lifecycle: "archived",
        registrationState: "closed",
        hasTeams: false,
        hasRounds: false,
      };

      saveEvent(archivedEvent);

      const pageResult = await PublicEventPage({
        params: Promise.resolve({ slug: "past-archived-symposium" }),
      });

      expect(pageResult.type).not.toBe(PublicEventClient);
      const renderedText = extractText(pageResult);
      expect(renderedText).toContain("Event Not Available");
      expect(renderedText).not.toContain("Past Archived Symposium");
    });
  });

  describe("3. Production Failure Transparency & Safety", () => {
    it("renders service temporarily unavailable when persistent database query fails without substituting fake mock data", async () => {
      process.env.APP_MODE = "production";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://sketch-actual-project.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_token";
      resetAppEnvCache();

      vi.spyOn(supabaseServerModule, "createClient").mockResolvedValueOnce({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                single: vi.fn().mockRejectedValue(
                  new Error("503 Service Unavailable: Database cluster connection timeout")
                ),
              }),
            }),
          }),
        }),
      } as any);

      const pageResult = await PublicEventPage({
        params: Promise.resolve({ slug: "diet-code-2026" }),
      });

      // Must not render PublicEventClient with mock data
      expect(pageResult.type).not.toBe(PublicEventClient);

      // Must render Service Temporarily Unavailable
      const renderedText = extractText(pageResult);
      expect(renderedText).toContain("Service Temporarily Unavailable");
      expect(renderedText).toContain("Retry");
      // Must not leak the raw database timeout internal message
      expect(renderedText).not.toContain("Database cluster connection timeout");
    });
  });

  describe("4. Serializable Event Data Transmission", () => {
    it("passes the complete public event data and form schema to PublicEventClient", async () => {
      const customEvent: EventItem = {
        id: "evt-custom-schema",
        slug: "custom-schema-workshop",
        title: "Advanced Schema Workshop",
        category: "Workshop",
        shortDescription: "Custom form schema testing",
        description: "Full description",
        posterUrl: "https://example.com/poster.jpg",
        heroImage: "https://example.com/hero.jpg",
        startDate: "2026-11-20T10:00:00Z",
        endDate: "2026-11-20T14:00:00Z",
        venue: "Studio B",
        venueMode: "in-person",
        capacity: 60,
        registeredCount: 10,
        checkedInCount: 0,
        lifecycle: "published",
        registrationState: "open",
        hasTeams: false,
        hasRounds: false,
        communityLink: "https://chat.whatsapp.com/test",
        contactEmail: "organizer@sketch.org",
        registrationForm: {
          version: 1,
          sections: [
            {
              id: "sec_portfolio",
              title: "Portfolio Verification",
              fields: [
                {
                  id: "portfolio_url",
                  type: "url",
                  label: "Behance / Dribbble Link",
                  required: true,
                },
              ],
            },
          ],
        },
      };

      saveEvent(customEvent);

      const pageResult = await PublicEventPage({
        params: Promise.resolve({ slug: "custom-schema-workshop" }),
      });

      expect(pageResult.type).toBe(PublicEventClient);
      const passedEvent = pageResult.props.event as EventItem;
      expect(passedEvent.id).toBe("evt-custom-schema");
      expect(passedEvent.title).toBe("Advanced Schema Workshop");
      expect(passedEvent.communityLink).toBe("https://chat.whatsapp.com/test");
      expect(passedEvent.registrationForm?.sections[0].fields[0].id).toBe("portfolio_url");
    });
  });
});
