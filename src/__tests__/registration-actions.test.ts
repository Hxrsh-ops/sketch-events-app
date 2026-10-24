import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateAndProcessRegistration,
  registerParticipantAction,
} from "../app/actions/registration-actions";
import {
  individualRegistrationSchema,
  teamRegistrationSchema,
  teamMemberSchema,
  registrationActionSchema,
} from "../lib/registration-schemas";
import { createClient } from "../lib/supabase/server";
import type { EventItem } from "../types";

vi.mock("../lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

function createMockEvent(overrides: Partial<EventItem> = {}): EventItem {
  return {
    id: "evt-test-default",
    slug: "design-systems-summit",
    title: "Design Systems Summit",
    category: "Design",
    shortDescription: "A comprehensive summit on design systems.",
    description: "Deep dive into scalable UI tokens and component architectures.",
    posterUrl: "/images/poster.jpg",
    startDate: "2026-11-01T10:00:00Z",
    endDate: "2026-11-01T18:00:00Z",
    venue: "Main Auditorium",
    venueMode: "in-person",
    capacity: 100,
    registeredCount: 20,
    checkedInCount: 0,
    lifecycle: "published",
    registrationState: "open",
    hasTeams: false,
    hasRounds: false,
    ...overrides,
  };
}

describe("SKETCHHUB Registration System Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to preview mode (no Supabase configured)
    vi.mocked(createClient).mockResolvedValue(null as any);
  });

  // ==========================================
  // 1. INPUT VALIDATION TESTS
  // ==========================================
  describe("Input validation", () => {
    it("1. Valid individual registration passes schema and validation", async () => {
      const event = createMockEvent({ hasTeams: false });
      const input = {
        eventSlug: "design-systems-summit",
        mode: "individual",
        attendeeName: "Ananya Sharma",
        email: "ananya.sharma@srmist.edu.in",
        phone: "+91 98765 43210",
        department: "Design",
        year: "3rd Year",
        answers: { portfolio: "https://ananya.design" },
      };

      const result = await validateAndProcessRegistration(input, () => event);
      expect(result.success).toBe(true);
      expect(result.attendeeName).toBe("Ananya Sharma");
      expect(result.email).toBe("ananya.sharma@srmist.edu.in");
    });

    it("2. Valid team registration passes schema and validation", async () => {
      const event = createMockEvent({
        hasTeams: true,
        minTeamSize: 2,
        maxTeamSize: 4,
      });
      const input = {
        eventSlug: "design-systems-summit",
        mode: "team",
        attendeeName: "Aarav Patel",
        email: "aarav.p@srmist.edu.in",
        phone: "+91 98765 43211",
        teamName: "Syntax Mavericks",
        teamMembers: [
          {
            name: "Rohan Varma",
            email: "rohan.v@srmist.edu.in",
            phone: "+91 98765 43212",
            department: "CSE",
          },
        ],
        answers: { track: "Web Development" },
      };

      const result = await validateAndProcessRegistration(input, () => event);
      expect(result.success).toBe(true);
      expect(result.teamName).toBe("Syntax Mavericks");
      expect(result.attendeeName).toBe("Aarav Patel");
    });

    it("3. Rejects registration with invalid email format", async () => {
      const event = createMockEvent();
      const input = {
        eventSlug: "design-systems-summit",
        mode: "individual",
        attendeeName: "Invalid Email User",
        email: "not-an-email-address",
      };

      const result = await validateAndProcessRegistration(input, () => event);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/validation failed/i);
      expect(result.fieldErrors).toBeDefined();
      expect(result.fieldErrors?.["email"]).toMatch(/valid email/i);
    });

    it("4. Rejects missing or malformed required fields", async () => {
      const event = createMockEvent();

      // Missing attendeeName and eventSlug
      const emptyInput = {
        mode: "individual",
      };

      const result = await validateAndProcessRegistration(emptyInput, () => event);
      expect(result.success).toBe(false);
      expect(result.fieldErrors?.["eventSlug"]).toBeDefined();
      expect(result.fieldErrors?.["attendeeName"]).toBeDefined();
      expect(result.fieldErrors?.["email"]).toBeDefined();

      // Short attendeeName (< 2 chars)
      const shortNameInput = {
        eventSlug: "design-systems-summit",
        mode: "individual",
        attendeeName: "A",
        email: "user@srmist.edu.in",
      };
      const shortNameResult = await validateAndProcessRegistration(shortNameInput, () => event);
      expect(shortNameResult.success).toBe(false);
      expect(shortNameResult.fieldErrors?.["attendeeName"]).toMatch(/at least 2 characters/i);

      // Team mode missing teamName
      const missingTeamNameInput = {
        eventSlug: "design-systems-summit",
        mode: "team",
        attendeeName: "Team Leader",
        email: "leader@srmist.edu.in",
        teamMembers: [],
      };
      const teamResult = await validateAndProcessRegistration(missingTeamNameInput, () => event);
      expect(teamResult.success).toBe(false);
      expect(teamResult.fieldErrors?.["teamName"]).toBeDefined();
    });

    it("5. Rejects team registration with invalid team-member email", async () => {
      const event = createMockEvent({ hasTeams: true });
      const input = {
        eventSlug: "design-systems-summit",
        mode: "team",
        attendeeName: "Captain Valid",
        email: "captain@srmist.edu.in",
        teamName: "Buggy Team",
        teamMembers: [
          {
            name: "Member Invalid",
            email: "invalid-member-email",
          },
        ],
      };

      const result = await validateAndProcessRegistration(input, () => event);
      expect(result.success).toBe(false);
      expect(result.fieldErrors?.["teamMembers.0.email"]).toMatch(/invalid email/i);
    });
  });

  // ==========================================
  // 2. EVENT ELIGIBILITY TESTS
  // ==========================================
  describe("Event eligibility", () => {
    it("6. Rejects registration for unknown event", async () => {
      const input = {
        eventSlug: "non-existent-event",
        mode: "individual",
        attendeeName: "Ghost User",
        email: "ghost@srmist.edu.in",
      };

      const result = await validateAndProcessRegistration(input, () => null);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/event not found/i);
    });

    it("7. Rejects registration for draft or upcoming event", async () => {
      const input = {
        eventSlug: "future-design-draft",
        mode: "individual",
        attendeeName: "Early Bird",
        email: "early@srmist.edu.in",
      };

      // Case 7a: lifecycle is draft
      const draftEvent = createMockEvent({ lifecycle: "draft" });
      const draftResult = await validateAndProcessRegistration(input, () => draftEvent);
      expect(draftResult.success).toBe(false);
      expect(draftResult.error).toMatch(/not yet open/i);

      // Case 7b: registrationState is upcoming
      const upcomingEvent = createMockEvent({
        lifecycle: "published",
        registrationState: "upcoming",
      });
      const upcomingResult = await validateAndProcessRegistration(input, () => upcomingEvent);
      expect(upcomingResult.success).toBe(false);
      expect(upcomingResult.error).toMatch(/not yet open/i);
    });

    it("8. Rejects registration for closed event", async () => {
      const event = createMockEvent({
        lifecycle: "published",
        registrationState: "closed",
      });
      const input = {
        eventSlug: "design-systems-summit",
        mode: "individual",
        attendeeName: "Late User",
        email: "late@srmist.edu.in",
      };

      const result = await validateAndProcessRegistration(input, () => event);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/officially closed/i);
    });

    it("9. Rejects registration for completed or archived event", async () => {
      const input = {
        eventSlug: "design-systems-summit",
        mode: "individual",
        attendeeName: "Past User",
        email: "past@srmist.edu.in",
      };

      // Case 9a: completed lifecycle
      const completedEvent = createMockEvent({ lifecycle: "completed" });
      const completedResult = await validateAndProcessRegistration(input, () => completedEvent);
      expect(completedResult.success).toBe(false);
      expect(completedResult.error).toMatch(/already concluded/i);

      // Case 9b: archived lifecycle
      const archivedEvent = createMockEvent({ lifecycle: "archived" });
      const archivedResult = await validateAndProcessRegistration(input, () => archivedEvent);
      expect(archivedResult.success).toBe(false);
      expect(archivedResult.error).toMatch(/already concluded/i);
    });

    it("10. Rejects registration when event is full", async () => {
      const input = {
        eventSlug: "design-systems-summit",
        mode: "individual",
        attendeeName: "Unlucky User",
        email: "unlucky@srmist.edu.in",
      };

      // Case 10a: registrationState is "full"
      const fullStateEvent = createMockEvent({
        registrationState: "full",
        capacity: 100,
        registeredCount: 80,
      });
      const fullStateResult = await validateAndProcessRegistration(input, () => fullStateEvent);
      expect(fullStateResult.success).toBe(false);
      expect(fullStateResult.error).toMatch(/capacity has been reached/i);

      // Case 10b: registeredCount >= capacity
      const capacityReachedEvent = createMockEvent({
        registrationState: "open",
        capacity: 50,
        registeredCount: 50,
      });
      const capResult = await validateAndProcessRegistration(input, () => capacityReachedEvent);
      expect(capResult.success).toBe(false);
      expect(capResult.error).toMatch(/capacity has been reached/i);
    });

    it("11. Rejects team registration when event only accepts individual registrations", async () => {
      const event = createMockEvent({ hasTeams: false });
      const input = {
        eventSlug: "design-systems-summit",
        mode: "team",
        attendeeName: "Captain",
        email: "captain@srmist.edu.in",
        teamName: "Solo Only Team",
        teamMembers: [{ name: "M1", email: "m1@srmist.edu.in" }],
      };

      const result = await validateAndProcessRegistration(input, () => event);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/only accepts individual registrations/i);
    });

    it("12. Rejects individual registration when event requires team registration", async () => {
      const event = createMockEvent({
        hasTeams: true,
        minTeamSize: 2,
        maxTeamSize: 4,
      });
      const input = {
        eventSlug: "design-systems-summit",
        mode: "individual",
        attendeeName: "Lone Wolf",
        email: "lonewolf@srmist.edu.in",
      };

      const result = await validateAndProcessRegistration(input, () => event);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/requires team registration/i);
    });
  });

  // ==========================================
  // 3. TEAM VALIDATION TESTS
  // ==========================================
  describe("Team validation", () => {
    it("13. Rejects team below minimum size", async () => {
      const event = createMockEvent({
        hasTeams: true,
        minTeamSize: 3, // Requires at least captain + 2 members
        maxTeamSize: 5,
      });
      const input = {
        eventSlug: "design-systems-summit",
        mode: "team",
        attendeeName: "Captain Small",
        email: "small@srmist.edu.in",
        teamName: "Too Small Team",
        teamMembers: [
          { name: "M1", email: "m1@srmist.edu.in" }, // total size: 1 + 1 = 2 < 3
        ],
      };

      const result = await validateAndProcessRegistration(input, () => event);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/team size is too small/i);
      expect(result.error).toContain("3");
    });

    it("14. Rejects team above maximum size", async () => {
      const event = createMockEvent({
        hasTeams: true,
        minTeamSize: 1,
        maxTeamSize: 3, // At most captain + 2 members
      });
      const input = {
        eventSlug: "design-systems-summit",
        mode: "team",
        attendeeName: "Captain Large",
        email: "large@srmist.edu.in",
        teamName: "Too Big Team",
        teamMembers: [
          { name: "M1", email: "m1@srmist.edu.in" },
          { name: "M2", email: "m2@srmist.edu.in" },
          { name: "M3", email: "m3@srmist.edu.in" }, // total size: 1 + 3 = 4 > 3
        ],
      };

      const result = await validateAndProcessRegistration(input, () => event);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/exceeds maximum allowed/i);
      expect(result.error).toContain("3");
    });

    it("15. Rejects duplicate emails between captain and members, including case and whitespace normalization", async () => {
      const event = createMockEvent({
        hasTeams: true,
        minTeamSize: 1,
        maxTeamSize: 4,
      });

      // Captain vs member duplicate with different casing and whitespace
      const inputCaptainDuplicate = {
        eventSlug: "design-systems-summit",
        mode: "team",
        attendeeName: "Captain Duplicate",
        email: "Captain.Duplicate@SRMIST.EDU.IN  ",
        teamName: "Duplicate Team",
        teamMembers: [
          {
            name: "Member Clone",
            email: "  captain.duplicate@srmist.edu.in",
          },
        ],
      };

      const result1 = await validateAndProcessRegistration(inputCaptainDuplicate, () => event);
      expect(result1.success).toBe(false);
      expect(result1.error).toMatch(/duplicate email detected within team roster/i);

      // Two members with identical email
      const inputMemberDuplicate = {
        eventSlug: "design-systems-summit",
        mode: "team",
        attendeeName: "Captain Unique",
        email: "unique.captain@srmist.edu.in",
        teamName: "Duplicate Members Team",
        teamMembers: [
          { name: "M1", email: "member1@srmist.edu.in" },
          { name: "M2", email: "MEMBER1@SRMIST.EDU.IN" },
        ],
      };

      const result2 = await validateAndProcessRegistration(inputMemberDuplicate, () => event);
      expect(result2.success).toBe(false);
      expect(result2.error).toMatch(/duplicate email detected within team roster/i);
    });

    it("16. Rejects team registration if any member is already registered for the event", async () => {
      const event = createMockEvent({
        hasTeams: true,
        minTeamSize: 1,
        maxTeamSize: 4,
      });
      const roster = new Set(["already.registered.member@srmist.edu.in"]);

      const input = {
        eventSlug: "design-systems-summit",
        mode: "team",
        attendeeName: "Captain Clean",
        email: "clean.captain@srmist.edu.in",
        teamName: "Conflict Crew",
        teamMembers: [
          {
            name: "Conflicted Member",
            email: "ALREADY.REGISTERED.MEMBER@srmist.edu.in",
          },
        ],
      };

      const result = await validateAndProcessRegistration(input, () => event, roster);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/is already registered for this event/i);
      expect(result.error).toContain("ALREADY.REGISTERED.MEMBER@srmist.edu.in");
    });

    it("17. Rejects team registration if team captain is already registered for the event", async () => {
      const event = createMockEvent({
        hasTeams: true,
        minTeamSize: 1,
        maxTeamSize: 4,
      });
      const roster = new Set(["registered.captain@srmist.edu.in"]);

      const input = {
        eventSlug: "design-systems-summit",
        mode: "team",
        attendeeName: "Registered Captain",
        email: "REGISTERED.CAPTAIN@srmist.edu.in",
        teamName: "Repeat Captain Crew",
        teamMembers: [{ name: "Fresh Member", email: "fresh.member@srmist.edu.in" }],
      };

      const result = await validateAndProcessRegistration(input, () => event, roster);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/is already registered for this event/i);
      expect(result.error).toContain("REGISTERED.CAPTAIN@srmist.edu.in");
    });

    it("18. Rejects team registration when insufficient remaining capacity for the entire team", async () => {
      const event = createMockEvent({
        hasTeams: true,
        capacity: 100,
        registeredCount: 98, // Only 2 spots left
        minTeamSize: 1,
        maxTeamSize: 5,
      });

      // Team of 3: captain + 2 members > 2 remaining slots
      const input = {
        eventSlug: "design-systems-summit",
        mode: "team",
        attendeeName: "Captain Big",
        email: "captain.big@srmist.edu.in",
        teamName: "Overcapacity Trio",
        teamMembers: [
          { name: "M1", email: "m1@srmist.edu.in" },
          { name: "M2", email: "m2@srmist.edu.in" },
        ],
      };

      const result = await validateAndProcessRegistration(input, () => event);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not enough remaining spots for this team/i);
      expect(result.error).toContain("2 slot(s) remain");
    });
  });

  // ==========================================
  // 4. SUCCESSFUL PREVIEW FLOW TESTS
  // ==========================================
  describe("Successful preview flow", () => {
    it("19. Valid individual registration returns expected attendee data and preview flag", async () => {
      const event = createMockEvent({ hasTeams: false });
      const input = {
        eventSlug: "design-systems-summit",
        mode: "individual",
        attendeeName: "Kavya Sundaram",
        email: "kavya@srmist.edu.in",
      };

      const result = await validateAndProcessRegistration(input, () => event);
      expect(result.success).toBe(true);
      expect(result.attendeeName).toBe("Kavya Sundaram");
      expect(result.email).toBe("kavya@srmist.edu.in");
      expect(result.teamName).toBeUndefined();
      expect(result.isMockPreview).toBe(true);
    });

    it("20. Valid team registration returns expected team data and preview flag", async () => {
      const event = createMockEvent({
        hasTeams: true,
        minTeamSize: 1,
        maxTeamSize: 3,
      });
      const input = {
        eventSlug: "design-systems-summit",
        mode: "team",
        attendeeName: "Aditya Verma",
        email: "aditya@srmist.edu.in",
        teamName: "Code Alchemists",
        teamMembers: [{ name: "Shruti Nair", email: "shruti@srmist.edu.in" }],
      };

      const result = await validateAndProcessRegistration(input, () => event);
      expect(result.success).toBe(true);
      expect(result.attendeeName).toBe("Aditya Verma");
      expect(result.email).toBe("aditya@srmist.edu.in");
      expect(result.teamName).toBe("Code Alchemists");
      expect(result.isMockPreview).toBe(true);
    });

    it("21. Returned registration, QR, and timestamp identifiers have expected formats", async () => {
      const event = createMockEvent();
      const input = {
        eventSlug: "design-systems-summit",
        mode: "individual",
        attendeeName: "Format Verifier",
        email: "format@srmist.edu.in",
      };

      const result = await validateAndProcessRegistration(input, () => event);
      expect(result.success).toBe(true);

      // Registration ID format: REG-YYYY-XXXX (4 digits)
      expect(result.registrationId).toBeDefined();
      expect(result.registrationId).toMatch(/^REG-\d{4}-\d{4}$/);

      // QR Credential ID format: qr_cred_ followed by 16 hex chars
      expect(result.qrCredentialId).toBeDefined();
      expect(result.qrCredentialId).toMatch(/^qr_cred_[a-f0-9]{16}$/);

      // Registered At format: Valid ISO-8601 string
      expect(result.registeredAt).toBeDefined();
      expect(result.registeredAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(Number.isNaN(Date.parse(result.registeredAt!))).toBe(false);
    });
  });

  // ==========================================
  // 5. PERSISTENCE BOUNDARY & SERVER ACTION
  // ==========================================
  describe("Persistence boundary & Server Action", () => {
    it("22. Registration fails clearly when Supabase is configured (pending migrations)", async () => {
      // Mock createClient returning a configured Supabase client instance
      const mockSupabaseClient = {
        from: vi.fn(),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabaseClient as any);

      const event = createMockEvent();
      const input = {
        eventSlug: "design-systems-summit",
        mode: "individual",
        attendeeName: "DB Registrant",
        email: "db.user@srmist.edu.in",
      };

      const result = await validateAndProcessRegistration(input, () => event);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(
        /authoritative database migrations are pending deployment by project lead \(harshanth\)/i
      );
      expect(result.registrationId).toBeUndefined();
    });

    it("23. registerParticipantAction delegates to validateAndProcessRegistration", async () => {
      const input = {
        eventSlug: "typography-motion-expo",
        mode: "individual",
        attendeeName: "Action Invoker",
        email: "action@srmist.edu.in",
      };

      const result = await registerParticipantAction(input);
      expect(result.success).toBe(true);
      expect(result.attendeeName).toBe("Action Invoker");
      expect(result.isMockPreview).toBe(true);
      expect(result.registrationId).toMatch(/^REG-\d{4}-\d{4}$/);
    });
  });

  // ==========================================
  // 6. DIRECT ZOD SCHEMA TESTS
  // ==========================================
  describe("Registration Zod Schemas", () => {
    it("24. individualRegistrationSchema parses valid data and rejects invalid emails", () => {
      const valid = {
        eventSlug: "typography-motion-expo",
        mode: "individual",
        attendeeName: "Ananya Sharma",
        email: "ananya@srmist.edu.in",
        phone: "+91 98765 43210",
        department: "Design",
        year: "3rd Year",
      };
      const parsed = individualRegistrationSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.answers).toEqual({});
      }

      const invalidEmail = { ...valid, email: "not-an-email" };
      expect(individualRegistrationSchema.safeParse(invalidEmail).success).toBe(false);
    });

    it("25. teamRegistrationSchema parses valid team data and sets default empty members", () => {
      const validWithoutMembers = {
        eventSlug: "diet-code-2026",
        mode: "team",
        attendeeName: "Team Leader",
        email: "leader@srmist.edu.in",
        teamName: "Syntax Mavericks",
      };
      const parsed = teamRegistrationSchema.safeParse(validWithoutMembers);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.teamMembers).toEqual([]);
      }

      const shortTeamName = { ...validWithoutMembers, teamName: "A" };
      expect(teamRegistrationSchema.safeParse(shortTeamName).success).toBe(false);
    });

    it("26. teamMemberSchema validates member phone format and rejects invalid email", () => {
      const validMember = {
        name: "Rohan Varma",
        email: "rohan@srmist.edu.in",
        phone: "+91 98765 43212",
      };
      expect(teamMemberSchema.safeParse(validMember).success).toBe(true);

      const invalidPhone = { ...validMember, phone: "invalid!phone" };
      expect(teamMemberSchema.safeParse(invalidPhone).success).toBe(false);

      const emptyPhone = { ...validMember, phone: "" };
      expect(teamMemberSchema.safeParse(emptyPhone).success).toBe(true);
    });

    it("27. registrationActionSchema discriminates between individual and team modes", () => {
      const indInput = {
        eventSlug: "typography-motion-expo",
        mode: "individual",
        attendeeName: "Individual User",
        email: "individual@srmist.edu.in",
      };
      expect(registrationActionSchema.safeParse(indInput).success).toBe(true);

      const teamInput = {
        eventSlug: "diet-code-2026",
        mode: "team",
        attendeeName: "Team Leader",
        email: "leader@srmist.edu.in",
        teamName: "Alpha Squad",
        teamMembers: [],
      };
      expect(registrationActionSchema.safeParse(teamInput).success).toBe(true);

      const invalidMode = {
        ...indInput,
        mode: "group",
      };
      expect(registrationActionSchema.safeParse(invalidMode).success).toBe(false);
    });
  });

  // ==========================================
  // 7. REGISTRATION RELIABILITY REGRESSION TESTS
  // ==========================================
  describe("Registration Reliability & Robustness Regressions", () => {
    it("28. Case-insensitive and prefixed event slug resolution via default resolveEvent", async () => {
      // Test uppercase slug resolution directly via registerParticipantAction
      const inputUppercase = {
        eventSlug: "Typography-Motion-Expo",
        mode: "individual",
        attendeeName: "Case Insensitive Registrant",
        email: "case.test@srmist.edu.in",
      };
      const resultUpper = await registerParticipantAction(inputUppercase);
      expect(resultUpper.success).toBe(true);
      expect(resultUpper.attendeeName).toBe("Case Insensitive Registrant");

      // Test prefixed slug resolution (e.g., SKETCH-typography-motion-expo)
      const inputPrefixed = {
        eventSlug: "SKETCH-typography-motion-expo",
        mode: "individual",
        attendeeName: "Prefix Registrant",
        email: "prefix.test@srmist.edu.in",
      };
      const resultPrefixed = await registerParticipantAction(inputPrefixed);
      expect(resultPrefixed.success).toBe(true);
      expect(resultPrefixed.attendeeName).toBe("Prefix Registrant");
    });

    it("29. Clamps remaining slots to 0 when event capacity is already exceeded", async () => {
      // Overcapacity edge case where registeredCount > capacity
      const overcapacityEvent = createMockEvent({
        hasTeams: true,
        capacity: 50,
        registeredCount: 52, // Overcapacity by 2
        minTeamSize: 1,
        maxTeamSize: 4,
      });

      const teamInput = {
        eventSlug: "design-systems-summit",
        mode: "team",
        attendeeName: "Captain Late",
        email: "captain.late@srmist.edu.in",
        teamName: "Late Crew",
        teamMembers: [{ name: "M1", email: "m1.late@srmist.edu.in" }],
      };

      const result = await validateAndProcessRegistration(teamInput, () => overcapacityEvent);
      expect(result.success).toBe(false);
      // Ensure remaining slots never formats as a negative number like "-2 slot(s) remain"
      expect(result.error).not.toMatch(/-\d+ slot\(s\) remain/);
    });

    it("30. Normalizes output email to lowercase and trimmed format on successful registration", async () => {
      const event = createMockEvent();
      const inputMixedEmail = {
        eventSlug: "design-systems-summit",
        mode: "individual",
        attendeeName: "Email Normalization User",
        email: "  Upper.Case.Attendee@SRMIST.EDU.IN  ",
      };

      const result = await validateAndProcessRegistration(inputMixedEmail, () => event);
      expect(result.success).toBe(true);
      expect(result.email).toBe("upper.case.attendee@srmist.edu.in");
    });

    it("31. Default roster check matches existing mock participants case-insensitively", async () => {
      // In MOCK_PARTICIPANTS, "evt-04" (typography-motion-expo) has participant Tanvi Kapoor with email "tanvi.k@college.edu"
      const inputDuplicateMock = {
        eventSlug: "typography-motion-expo",
        mode: "individual",
        attendeeName: "Tanvi Kapoor",
        email: "TANVI.K@COLLEGE.EDU", // Upper case should match existing mock participant
      };

      const result = await registerParticipantAction(inputDuplicateMock);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/is already registered for this event/i);
    });
  });
});
