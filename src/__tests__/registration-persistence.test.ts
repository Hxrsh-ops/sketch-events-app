import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerForEventAction } from "@/app/actions/registration-actions";
import { RegisterForEventInputSchema } from "@/lib/validations/registration-schemas";

import { SketchRepository } from "@/lib/supabase/repository";
import { resetAppEnvCache } from "@/lib/env";
import {
  getStoredEvents,
  saveEvent,
  getStoredSubmissions,
} from "@/lib/registration-store";
import * as supabaseServerModule from "@/lib/supabase/server";
import { EventItem } from "@/types";
import { revalidatePath } from "next/cache";

// Mock next/cache so revalidatePath does not fail in test environment
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Slice 3.4: Production Registration Persistence & Security Invariants", () => {
  const originalEnv = { ...process.env };

  const validUuid = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

  const createMockPublishedEvent = (overrides: Partial<EventItem> = {}): EventItem => ({
    id: validUuid,
    slug: "design-sprint-2026",
    title: "Design Sprint 2026",
    category: "Design",
    shortDescription: "A sprint for creative thinkers.",
    description: "Detailed description of design sprint.",
    startDate: new Date(Date.now() + 86400000).toISOString(), // tomorrow
    endDate: new Date(Date.now() + 172800000).toISOString(), // day after tomorrow
    venue: "Main Design Studio",
    venueMode: "in-person",
    posterUrl: "",
    capacity: 50,
    registeredCount: 10,
    checkedInCount: 0,
    lifecycle: "published",
    registrationState: "open",
    hasTeams: true,
    minTeamSize: 2,
    maxTeamSize: 4,
    hasRounds: false,
    featured: false,
    ...overrides,
  });

  beforeEach(() => {
    resetAppEnvCache();
    process.env = { ...originalEnv };
    process.env.APP_MODE = "preview";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    vi.restoreAllMocks();
  });

  describe("Scenario 1: Successful individual registration via Server Action / repository", () => {
    it("persists individual registration and returns valid ticket pass in preview mode", async () => {
      const event = createMockPublishedEvent({ id: "evt-preview-single", slug: "preview-single-slug" });
      saveEvent(event);

      const result = await registerForEventAction({
        eventId: event.id,
        slug: event.slug,
        mode: "individual",
        attendeeName: "Ada Lovelace",
        email: "ada.lovelace@example.com",
        phone: "+1 555-0101",
        department: "Computer Science",
        year: "3rd Year",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.registrationId).toMatch(/^REG-2026-\d{4}$/);
        expect(result.data.qrCredentialId).toBeDefined();
        expect(result.data.attendeeName).toBe("Ada Lovelace");
        expect(result.data.email).toBe("ada.lovelace@example.com");
        expect(result.data.eventTitle).toBe(event.title);
      }
    });

    it("persists individual registration via database RPC in production mode", async () => {
      process.env.APP_MODE = "production";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
      resetAppEnvCache();

      const mockEvent = createMockPublishedEvent();

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === "events") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: {
                  id: mockEvent.id,
                  slug: mockEvent.slug,
                  title: mockEvent.title,
                  category: mockEvent.category,
                  start_date: mockEvent.startDate,
                  end_date: mockEvent.endDate,
                  venue: mockEvent.venue,
                  venue_mode: mockEvent.venueMode,
                  capacity: mockEvent.capacity,
                  registered_count: mockEvent.registeredCount,
                  checked_in_count: mockEvent.checkedInCount,
                  lifecycle: mockEvent.lifecycle,
                  registration_state: mockEvent.registrationState,
                  has_teams: mockEvent.hasTeams,
                  min_team_size: mockEvent.minTeamSize,
                  max_team_size: mockEvent.maxTeamSize,
                  has_rounds: mockEvent.hasRounds,
                },
                error: null,
              }),
            };
          }
          return {};
        }),
        rpc: vi.fn().mockResolvedValue({
          data: {
            success: true,
            registration_id: "REG-2026-9999",
            qr_credential_id: "SKETCH-TKT-AUTH999",
            message: "Registration successful.",
          },
          error: null,
        }),
      };

      vi.spyOn(supabaseServerModule, "createClient").mockResolvedValue(mockSupabase as any);

      const result = await registerForEventAction({
        eventId: mockEvent.id,
        slug: mockEvent.slug,
        mode: "individual",
        attendeeName: "Alan Turing",
        email: "alan.turing@enigma.ac.uk",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.registrationId).toBe("REG-2026-9999");
        expect(result.data.qrCredentialId).toBe("SKETCH-TKT-AUTH999");
        expect(result.data.attendeeName).toBe("Alan Turing");
      }
      expect(mockSupabase.rpc).toHaveBeenCalledWith("register_for_event", expect.objectContaining({
        p_event_id: mockEvent.id,
        p_mode: "individual",
        p_attendee_name: "Alan Turing",
        p_email: "alan.turing@enigma.ac.uk",
      }));
    });
  });

  describe("Scenario 2: Successful team registration with valid members", () => {
    it("persists team registration with members in preview mode", async () => {
      const event = createMockPublishedEvent({ id: "evt-team-valid", slug: "team-valid-slug" });
      saveEvent(event);

      const result = await registerForEventAction({
        eventId: event.id,
        slug: event.slug,
        mode: "team",
        attendeeName: "Captain Marvel",
        email: "captain@avengers.io",
        teamName: "Super Innovators",
        teamMembers: [
          { name: "Member One", email: "member1@avengers.io", department: "Design" },
          { name: "Member Two", email: "member2@avengers.io", department: "Engineering" },
        ],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.teamName).toBe("Super Innovators");
        expect(result.data.registrationId).toMatch(/^REG-2026-\d{4}$/);
      }
    });

    it("persists team registration through RPC in production mode", async () => {
      process.env.APP_MODE = "production";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
      resetAppEnvCache();

      const mockEvent = createMockPublishedEvent();

      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: mockEvent.id,
              slug: mockEvent.slug,
              title: mockEvent.title,
              category: mockEvent.category,
              start_date: mockEvent.startDate,
              end_date: mockEvent.endDate,
              venue: mockEvent.venue,
              capacity: 100,
              registered_count: 10,
              lifecycle: "published",
              registration_state: "open",
              has_teams: true,
              min_team_size: 2,
              max_team_size: 4,
            },
            error: null,
          }),
        })),
        rpc: vi.fn().mockResolvedValue({
          data: {
            success: true,
            registration_id: "REG-2026-TEAM-88",
            qr_credential_id: "SKETCH-TKT-TEAM88",
            message: "Team registration successful.",
          },
          error: null,
        }),
      };

      vi.spyOn(supabaseServerModule, "createClient").mockResolvedValue(mockSupabase as any);

      const result = await registerForEventAction({
        eventId: mockEvent.id,
        slug: mockEvent.slug,
        mode: "team",
        attendeeName: "Team Leader",
        email: "leader@teamalpha.com",
        teamName: "Alpha Squad",
        teamMembers: [
          { name: "Alpha 2", email: "alpha2@teamalpha.com" },
        ],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.teamName).toBe("Alpha Squad");
      }
      expect(mockSupabase.rpc).toHaveBeenCalledWith("register_for_event", expect.objectContaining({
        p_team_name: "Alpha Squad",
        p_mode: "team",
      }));
    });
  });

  describe("Scenario 3: Rejection when event is draft, archived, or does not exist", () => {
    it("rejects registration when event does not exist", async () => {
      const result = await registerForEventAction({
        eventId: "non-existent-event-id-999",
        slug: "non-existent-slug",
        mode: "individual",
        attendeeName: "Ghost Attendee",
        email: "ghost@example.com",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("EVENT_NOT_FOUND");
      }
    });

    it("rejects registration when event is in draft status", async () => {
      const draftEvent = createMockPublishedEvent({
        id: "evt-draft-test",
        slug: "draft-test-slug",
        lifecycle: "draft",
      });
      saveEvent(draftEvent);

      const result = await registerForEventAction({
        eventId: draftEvent.id,
        slug: draftEvent.slug,
        mode: "individual",
        attendeeName: "Jane Doe",
        email: "jane.doe@example.com",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("EVENT_NOT_ACTIVE");
        expect(result.message).toContain("not accepting registrations");
      }
    });

    it("rejects registration when event is archived", async () => {
      const archivedEvent = createMockPublishedEvent({
        id: "evt-archived-test",
        slug: "archived-test-slug",
        lifecycle: "archived",
      });
      saveEvent(archivedEvent);

      const result = await registerForEventAction({
        eventId: archivedEvent.id,
        slug: archivedEvent.slug,
        mode: "individual",
        attendeeName: "Jane Doe",
        email: "jane.doe@example.com",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("EVENT_NOT_ACTIVE");
      }
    });
  });

  describe("Scenario 4: Rejection when registration state is closed or full", () => {
    it("rejects registration when registrationState is 'closed'", async () => {
      const closedEvent = createMockPublishedEvent({
        id: "evt-closed-test",
        slug: "closed-test-slug",
        registrationState: "closed",
      });
      saveEvent(closedEvent);

      const result = await registerForEventAction({
        eventId: closedEvent.id,
        slug: closedEvent.slug,
        mode: "individual",
        attendeeName: "Jane Doe",
        email: "jane.doe@example.com",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("REGISTRATION_CLOSED");
      }
    });

    it("rejects registration when registrationState is 'full'", async () => {
      const fullEvent = createMockPublishedEvent({
        id: "evt-full-test",
        slug: "full-test-slug",
        registrationState: "full",
      });
      saveEvent(fullEvent);

      const result = await registerForEventAction({
        eventId: fullEvent.id,
        slug: fullEvent.slug,
        mode: "individual",
        attendeeName: "Jane Doe",
        email: "jane.doe@example.com",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("REGISTRATION_CLOSED");
      }
    });

    it("rejects registration when capacity is exceeded", async () => {
      const maxedEvent = createMockPublishedEvent({
        id: "evt-maxed-test",
        slug: "maxed-test-slug",
        capacity: 10,
        registeredCount: 10,
      });
      saveEvent(maxedEvent);

      const result = await registerForEventAction({
        eventId: maxedEvent.id,
        slug: maxedEvent.slug,
        mode: "individual",
        attendeeName: "Jane Doe",
        email: "jane.doe@example.com",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("CAPACITY_EXCEEDED");
      }
    });
  });

  describe("Scenario 5: Rejection when event end date has passed", () => {
    it("rejects registration when event has ended", async () => {
      const pastEvent = createMockPublishedEvent({
        id: "evt-past-test",
        slug: "past-test-slug",
        startDate: new Date(Date.now() - 172800000).toISOString(),
        endDate: new Date(Date.now() - 86400000).toISOString(), // ended yesterday
      });
      saveEvent(pastEvent);

      const result = await registerForEventAction({
        eventId: pastEvent.id,
        slug: pastEvent.slug,
        mode: "individual",
        attendeeName: "Late Attendee",
        email: "late@example.com",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("EVENT_ENDED");
        expect(result.message).toContain("concluded");
      }
    });
  });

  describe("Scenario 6: Rejection of duplicate email for individual registration", () => {
    it("rejects duplicate registration email for the same event", async () => {
      const event = createMockPublishedEvent({ id: "evt-dup-test", slug: "dup-test-slug" });
      saveEvent(event);

      // First registration succeeds
      const firstResult = await registerForEventAction({
        eventId: event.id,
        slug: event.slug,
        mode: "individual",
        attendeeName: "First Attendee",
        email: "duplicate.check@example.com",
      });
      expect(firstResult.success).toBe(true);

      // Second registration with same email (case insensitive) is rejected
      const secondResult = await registerForEventAction({
        eventId: event.id,
        slug: event.slug,
        mode: "individual",
        attendeeName: "Second Attendee",
        email: "DUPLICATE.CHECK@EXAMPLE.COM",
      });

      expect(secondResult.success).toBe(false);
      if (!secondResult.success) {
        expect(secondResult.error).toBe("ALREADY_REGISTERED");
      }
    });
  });

  describe("Scenario 7: Rejection of duplicate email among team members", () => {
    it("rejects team registration when captain email is also in team members list", async () => {
      const event = createMockPublishedEvent({ id: "evt-dup-team-test", slug: "dup-team-test-slug" });
      saveEvent(event);

      const result = await registerForEventAction({
        eventId: event.id,
        slug: event.slug,
        mode: "team",
        attendeeName: "Captain Duplicate",
        email: "captain@teamduplicate.com",
        teamName: "Self-Cloners",
        teamMembers: [
          { name: "Clone One", email: "captain@teamduplicate.com" },
        ],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("DUPLICATE_TEAM_EMAIL");
        expect(result.message).toContain("Captain email cannot also be listed as a team member");
      }
    });

    it("rejects team registration when team members share the same email address", async () => {
      const event = createMockPublishedEvent({ id: "evt-dup-members-test", slug: "dup-members-test-slug" });
      saveEvent(event);

      const result = await registerForEventAction({
        eventId: event.id,
        slug: event.slug,
        mode: "team",
        attendeeName: "Captain Legit",
        email: "captain.legit@teamduplicate.com",
        teamName: "Double Trouble",
        teamMembers: [
          { name: "Member Alpha", email: "same.member@example.com" },
          { name: "Member Beta", email: "same.member@example.com" },
        ],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("DUPLICATE_TEAM_EMAIL");
        expect(result.message).toContain("Team members cannot share the same email");
      }
    });
  });

  describe("Scenario 8: Rejection when team size violates min_team_size or max_team_size", () => {
    it("rejects when team registration is attempted for an event without team support", async () => {
      const soloEvent = createMockPublishedEvent({
        id: "evt-solo-test",
        slug: "solo-test-slug",
        hasTeams: false,
      });
      saveEvent(soloEvent);

      const result = await registerForEventAction({
        eventId: soloEvent.id,
        slug: soloEvent.slug,
        mode: "team",
        attendeeName: "Captain Solo",
        email: "captain@solo.com",
        teamName: "Unwelcome Team",
        teamMembers: [{ name: "Member 1", email: "m1@solo.com" }],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("TEAMS_NOT_ALLOWED");
      }
    });

    it("rejects team size below minTeamSize", async () => {
      const event = createMockPublishedEvent({
        id: "evt-min-team-test",
        slug: "min-team-test-slug",
        minTeamSize: 3,
        maxTeamSize: 5,
      });
      saveEvent(event);

      // Only 2 total (captain + 1 member) when min is 3
      const result = await registerForEventAction({
        eventId: event.id,
        slug: event.slug,
        mode: "team",
        attendeeName: "Captain Small",
        email: "captain@small.com",
        teamName: "Understaffed",
        teamMembers: [{ name: "One Member", email: "one@small.com" }],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("TEAM_TOO_SMALL");
      }
    });

    it("rejects team size exceeding maxTeamSize", async () => {
      const event = createMockPublishedEvent({
        id: "evt-max-team-test",
        slug: "max-team-test-slug",
        minTeamSize: 2,
        maxTeamSize: 3,
      });
      saveEvent(event);

      // 4 total (captain + 3 members) when max is 3
      const result = await registerForEventAction({
        eventId: event.id,
        slug: event.slug,
        mode: "team",
        attendeeName: "Captain Giant",
        email: "captain@giant.com",
        teamName: "Overcrowded",
        teamMembers: [
          { name: "Member 1", email: "m1@giant.com" },
          { name: "Member 2", email: "m2@giant.com" },
          { name: "Member 3", email: "m3@giant.com" },
        ],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("TEAM_TOO_LARGE");
      }
    });
  });

  describe("Scenario 9: Database failure / missing credentials error handling (no false positive confirmation)", () => {
    it("strictly returns error and prevents false confirmation when production database client is unavailable", async () => {
      process.env.APP_MODE = "production";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
      resetAppEnvCache();

      // createClient returns null (e.g. database down or unconfigured)
      vi.spyOn(supabaseServerModule, "createClient").mockResolvedValue(null);

      const result = await registerForEventAction({
        eventId: validUuid,
        slug: "design-sprint-2026",
        mode: "individual",
        attendeeName: "Grace Hopper",
        email: "grace@navy.mil",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
        // Crucially, it must never return success: true
      }
    });

    it("strictly converts unexpected SQL exceptions or constraint failures to generic user messages without leaking constraint names", async () => {
      process.env.APP_MODE = "production";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
      resetAppEnvCache();

      const mockEvent = createMockPublishedEvent();

      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: mockEvent.id,
              slug: mockEvent.slug,
              title: mockEvent.title,
              category: mockEvent.category,
              start_date: mockEvent.startDate,
              end_date: mockEvent.endDate,
              venue: mockEvent.venue,
              capacity: 100,
              registered_count: 10,
              lifecycle: "published",
              registration_state: "open",
            },
            error: null,
          }),
        })),
        rpc: vi.fn().mockResolvedValue({
          data: null,
          error: {
            code: "23505",
            message: 'duplicate key value violates unique constraint "uq_active_event_attendee_email"',
          },
        }),
      };

      vi.spyOn(supabaseServerModule, "createClient").mockResolvedValue(mockSupabase as any);

      const result = await registerForEventAction({
        eventId: mockEvent.id,
        slug: mockEvent.slug,
        mode: "individual",
        attendeeName: "Grace Hopper",
        email: "grace@navy.mil",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.message).toBe("Database service temporarily unavailable. Please try again.");
        expect(result.message).not.toContain("uq_active_event_attendee_email");
        expect(result.message).not.toContain("duplicate key");
        expect(result.message).not.toContain("constraint");
      }
    });

    it("rejects non-UUID event IDs in production mode with INVALID_EVENT_ID", async () => {
      process.env.APP_MODE = "production";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
      resetAppEnvCache();

      const result = await registerForEventAction({
        eventId: "evt-invalid-uuid-mock",
        slug: "any-slug",
        mode: "individual",
        attendeeName: "Linus Torvalds",
        email: "linus@kernel.org",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("INVALID_EVENT_ID");
        expect(result.message).toBe("Invalid event ID format.");
      }
    });
  });

  describe("Fix 3: Event ID / Slug Consistency Enforced", () => {
    it("rejects registration when event ID and slug point to different events in production (EVENT_MISMATCH)", async () => {
      process.env.APP_MODE = "production";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
      resetAppEnvCache();

      const mockEvent = createMockPublishedEvent({
        id: validUuid,
        slug: "actual-event-slug",
      });

      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: mockEvent.id,
              slug: mockEvent.slug,
              title: mockEvent.title,
              category: mockEvent.category,
              start_date: mockEvent.startDate,
              end_date: mockEvent.endDate,
              venue: mockEvent.venue,
              capacity: 100,
              registered_count: 10,
              lifecycle: "published",
              registration_state: "open",
            },
            error: null,
          }),
        })),
      };

      vi.spyOn(supabaseServerModule, "createClient").mockResolvedValue(mockSupabase as any);

      // Submit matching UUID but mismatched slug
      const result = await registerForEventAction({
        eventId: validUuid,
        slug: "different-forged-slug",
        mode: "individual",
        attendeeName: "Security Researcher",
        email: "sec@example.com",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("EVENT_MISMATCH");
        expect(result.message).toContain("does not match the requested event slug");
      }
    });

    it("rejects registration when event ID and slug point to different events in preview mode", async () => {
      const eventA = createMockPublishedEvent({ id: "evt-preview-a", slug: "slug-a" });
      const eventB = createMockPublishedEvent({ id: "evt-preview-b", slug: "slug-b" });
      saveEvent(eventA);
      saveEvent(eventB);

      const result = await registerForEventAction({
        eventId: "evt-preview-a",
        slug: "slug-b", // Mismatch!
        mode: "individual",
        attendeeName: "Mismatch Tester",
        email: "mismatch@example.com",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("EVENT_MISMATCH");
      }
    });

    it("rejects non-existent event ID in production mode (EVENT_NOT_FOUND)", async () => {
      process.env.APP_MODE = "production";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
      resetAppEnvCache();

      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: "PGRST116", message: "Not found" },
          }),
        })),
      };

      vi.spyOn(supabaseServerModule, "createClient").mockResolvedValue(mockSupabase as any);

      const result = await registerForEventAction({
        eventId: "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22",
        mode: "individual",
        attendeeName: "Missing Tester",
        email: "missing@example.com",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("EVENT_NOT_FOUND");
      }
    });
  });

  describe("Fix 4: Revalidation Behavior", () => {
    it("revalidates /participants and related routes upon successful registration", async () => {
      process.env.APP_MODE = "production";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
      resetAppEnvCache();

      const mockEvent = createMockPublishedEvent();

      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: mockEvent.id,
              slug: mockEvent.slug,
              title: mockEvent.title,
              category: mockEvent.category,
              start_date: mockEvent.startDate,
              end_date: mockEvent.endDate,
              venue: mockEvent.venue,
              capacity: 100,
              registered_count: 10,
              lifecycle: "published",
              registration_state: "open",
            },
            error: null,
          }),
        })),
        rpc: vi.fn().mockResolvedValue({
          data: {
            success: true,
            registration_id: "REG-2026-REVAL",
            qr_credential_id: "SKETCH-TKT-REVAL",
          },
          error: null,
        }),
      };

      vi.spyOn(supabaseServerModule, "createClient").mockResolvedValue(mockSupabase as any);

      const result = await registerForEventAction({
        eventId: mockEvent.id,
        slug: mockEvent.slug,
        mode: "individual",
        attendeeName: "Reval Attendee",
        email: "reval@example.com",
      });

      expect(result.success).toBe(true);
      expect(revalidatePath).toHaveBeenCalledWith("/participants");
      expect(revalidatePath).toHaveBeenCalledWith(`/e/${mockEvent.slug}`);
      expect(revalidatePath).toHaveBeenCalledWith(`/events/${mockEvent.id}`);
      expect(revalidatePath).toHaveBeenCalledWith("/events");
    });
  });

  describe("Fix 2: Registration Uniqueness and Migration Invariant", () => {
    it("verifies the additive migration 00002 exists with sequence and bounded retry logic", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const migrationPath = path.resolve(process.cwd(), "supabase/migrations/00002_strengthen_registration_numbers.sql");

      expect(fs.existsSync(migrationPath)).toBe(true);
      const sqlContent = fs.readFileSync(migrationPath, "utf-8");

      // Verify sequence creation
      expect(sqlContent).toContain("CREATE SEQUENCE IF NOT EXISTS public.registration_number_seq");
      // Verify bounded retry function
      expect(sqlContent).toContain("public.generate_unique_registration_id()");
      expect(sqlContent).toContain("v_attempt := v_attempt + 1");
      expect(sqlContent).toContain("RAISE EXCEPTION 'REGISTRATION_ID_COLLISION");
      // Verify invocation in register_for_event
      expect(sqlContent).toContain("v_new_reg_id := public.generate_unique_registration_id()");
      expect(sqlContent).toContain("v_member_reg_id := public.generate_unique_registration_id()");
    });
  });

  describe("Scenario 10: Preview mode fallback preservation", () => {
    it("operates completely in-memory when APP_MODE is preview without credentials", async () => {
      expect(SketchRepository.isPreview()).toBe(true);

      const previewEvent = createMockPublishedEvent({
        id: "evt-preview-complete",
        slug: "preview-complete-slug",
        title: "Preview Mode Event",
      });
      saveEvent(previewEvent);

      const result = await registerForEventAction({
        eventId: previewEvent.id,
        slug: previewEvent.slug,
        mode: "individual",
        attendeeName: "Preview Tester",
        email: "preview.tester@sketch.events",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.registrationId).toMatch(/^REG-2026-\d{4}$/);
        expect(result.data.eventTitle).toBe("Preview Mode Event");
      }

      // Verify submission is stored in preview submissions
      const submissions = getStoredSubmissions(previewEvent.id);
      expect(submissions.some((s) => s.email === "preview.tester@sketch.events")).toBe(true);
    });
  });
});
