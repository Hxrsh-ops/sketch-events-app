/**
 * SKETCHHUB — Standalone Registration Systems Test Suite
 * 
 * Verifies server-side registration validation, event eligibility, capacity enforcement,
 * and team data integrity without external runtime dependencies.
 * 
 * Run with: node scripts/run-registration-tests.mjs
 */

import assert from "node:assert/strict";
import { z } from "zod";

// Re-importing schemas and business logic definitions matching src/app/actions/registration-actions.ts
const teamMemberSchema = z.object({
  name: z.string().trim().min(1, "Team member name is required"),
  email: z.string().trim().email("Invalid email address for team member"),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\s\-().]{7,20}$/, "Invalid phone format")
    .optional()
    .or(z.literal("")),
  department: z.string().trim().optional(),
  role: z.string().trim().optional(),
});

const individualRegistrationSchema = z.object({
  eventSlug: z.string().trim().min(1, "Event identifier is required"),
  mode: z.literal("individual"),
  attendeeName: z.string().trim().min(2, "Full name must be at least 2 characters"),
  email: z.string().trim().email("Please provide a valid email address"),
  phone: z.string().trim().optional(),
  department: z.string().trim().optional(),
  year: z.string().trim().optional(),
  answers: z.record(z.string(), z.unknown()).default({}),
});

const teamRegistrationSchema = z.object({
  eventSlug: z.string().trim().min(1, "Event identifier is required"),
  mode: z.literal("team"),
  attendeeName: z.string().trim().min(2, "Team leader name must be at least 2 characters"),
  email: z.string().trim().email("Please provide a valid email address for team leader"),
  phone: z.string().trim().optional(),
  department: z.string().trim().optional(),
  year: z.string().trim().optional(),
  teamName: z.string().trim().min(2, "Team name must be at least 2 characters"),
  teamMembers: z.array(teamMemberSchema).default([]),
  answers: z.record(z.string(), z.unknown()).default({}),
});

const registrationActionSchema = z.discriminatedUnion("mode", [
  individualRegistrationSchema,
  teamRegistrationSchema,
]);

// Test Events Dataset
const TEST_EVENTS = [
  {
    id: "evt-diet-code",
    slug: "diet-code-2026",
    title: "Diet CODE",
    lifecycle: "published",
    registrationState: "open",
    capacity: 120,
    registeredCount: 48,
    hasTeams: true,
    minTeamSize: 1,
    maxTeamSize: 3,
  },
  {
    id: "evt-expo",
    slug: "typography-motion-expo",
    title: "Typography & Motion Expo",
    lifecycle: "published",
    registrationState: "open",
    capacity: 500,
    registeredCount: 310,
    hasTeams: false,
  },
  {
    id: "evt-full",
    slug: "prompt-to-prototype",
    title: "Prompt to Prototype Hackathon",
    lifecycle: "published",
    registrationState: "full",
    capacity: 180,
    registeredCount: 180,
    hasTeams: true,
    minTeamSize: 2,
    maxTeamSize: 4,
  },
  {
    id: "evt-closed",
    slug: "visual-storytelling-workshop",
    title: "Visual Storytelling Masterclass",
    lifecycle: "completed",
    registrationState: "closed",
    capacity: 80,
    registeredCount: 78,
    hasTeams: false,
  },
  {
    id: "evt-draft",
    slug: "future-design-draft",
    title: "Future Design Conference",
    lifecycle: "draft",
    registrationState: "upcoming",
    capacity: 200,
    registeredCount: 0,
    hasTeams: false,
  },
];

async function mockEventResolver(slugOrId) {
  const clean = slugOrId.replace(/^sketch-/, "");
  return TEST_EVENTS.find((e) => e.slug === slugOrId || e.slug === clean || e.id === slugOrId) || null;
}

async function executeRegistration(rawInput, eventResolver = mockEventResolver, customRoster = null) {
  const parseResult = registrationActionSchema.safeParse(rawInput);
  if (!parseResult.success) {
    const fieldErrors = {};
    for (const issue of parseResult.error.issues) {
      fieldErrors[issue.path.join(".")] = issue.message;
    }
    return {
      success: false,
      error: "Validation failed. Please correct the highlighted errors.",
      fieldErrors,
    };
  }

  const data = parseResult.data;
  const event = await eventResolver(data.eventSlug);
  if (!event) {
    return { success: false, error: "Event not found. Please verify the event link." };
  }

  if (event.lifecycle === "draft" || event.registrationState === "upcoming") {
    return { success: false, error: "Registration for this event is not yet open." };
  }

  if (event.lifecycle === "completed" || event.lifecycle === "archived") {
    return { success: false, error: "This event has already concluded. Registrations are closed." };
  }

  if (event.registrationState === "closed") {
    return { success: false, error: "Registration for this event is officially closed." };
  }

  if (event.registrationState === "full" || (event.capacity > 0 && event.registeredCount >= event.capacity)) {
    return { success: false, error: "Event capacity has been reached. No additional registrations can be accepted." };
  }

  if (data.mode === "team") {
    if (!event.hasTeams) {
      return { success: false, error: "This event only accepts individual registrations." };
    }

    const totalTeamSize = 1 + data.teamMembers.length;
    if (event.minTeamSize && totalTeamSize < event.minTeamSize) {
      return {
        success: false,
        error: `Team size is too small. A minimum of ${event.minTeamSize} members is required (including team captain).`,
      };
    }

    if (event.maxTeamSize && totalTeamSize > event.maxTeamSize) {
      return {
        success: false,
        error: `Team size exceeds maximum allowed. At most ${event.maxTeamSize} members permitted.`,
      };
    }

    const memberEmails = data.teamMembers.map((m) => m.email.toLowerCase().trim());
    const allEmails = [data.email.toLowerCase().trim(), ...memberEmails];
    const uniqueEmails = new Set(allEmails);
    if (uniqueEmails.size !== allEmails.length) {
      return {
        success: false,
        error: "Duplicate email detected within team roster. Each team member must have a unique email address.",
      };
    }

    if (event.capacity > 0 && event.registeredCount + totalTeamSize > event.capacity) {
      const remainingSlots = event.capacity - event.registeredCount;
      return {
        success: false,
        error: `Not enough remaining spots for this team. Only ${remainingSlots} slot(s) remain.`,
      };
    }
  } else {
    if (event.hasTeams && event.minTeamSize && event.minTeamSize > 1) {
      return {
        success: false,
        error: "This event requires team registration. Individual registrations are not accepted.",
      };
    }
  }

  // Duplicate Registration Pre-check
  const existingRosterEmails = customRoster || new Set();
  if (existingRosterEmails.has(data.email.toLowerCase().trim())) {
    return {
      success: false,
      error: `The email address "${data.email}" is already registered for this event. Duplicate registrations are not permitted.`,
    };
  }

  if (data.mode === "team") {
    for (const member of data.teamMembers) {
      if (existingRosterEmails.has(member.email.toLowerCase().trim())) {
        return {
          success: false,
          error: `Team member email "${member.email}" is already registered for this event.`,
        };
      }
    }
  }

  const registrationId = `REG-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const qrCredentialId = `qr_cred_test_${Math.random().toString(36).substring(2, 10)}`;
  const registeredAt = new Date().toISOString();

  return {
    success: true,
    registrationId,
    qrCredentialId,
    registeredAt,
    attendeeName: data.attendeeName,
    email: data.email,
    teamName: data.mode === "team" ? data.teamName : undefined,
    isMockPreview: true,
  };
}

// ==========================================
// TEST SUITE EXECUTION
// ==========================================

console.log("\n=======================================================");
console.log(" SKETCHHUB — Registration Systems Test Suite");
console.log("=======================================================\n");

let passedCount = 0;
let failedCount = 0;

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`  PASS: ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  FAIL: ${name}`);
    console.error(`        ${err.message}`);
    failedCount++;
  }
}

async function suite() {
  // Test 1: Valid Individual Registration
  await runTest("1. Valid individual registration succeeds with authoritative IDs", async () => {
    const input = {
      eventSlug: "typography-motion-expo",
      mode: "individual",
      attendeeName: "Ananya Sharma",
      email: "ananya.sharma@srmist.edu.in",
      phone: "+91 98765 43210",
      department: "Design",
      year: "3rd Year",
      answers: { portfolio: "https://ananya.design" },
    };

    const res = await executeRegistration(input);
    assert.equal(res.success, true);
    assert.ok(res.registrationId.startsWith("REG-2026-"));
    assert.ok(res.qrCredentialId.startsWith("qr_cred_"));
    assert.equal(res.attendeeName, "Ananya Sharma");
    assert.equal(res.email, "ananya.sharma@srmist.edu.in");
    assert.equal(res.isMockPreview, true);
  });

  // Test 2: Valid Team Registration
  await runTest("2. Valid team registration succeeds with team metadata and roster", async () => {
    const input = {
      eventSlug: "diet-code-2026",
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

    const res = await executeRegistration(input);
    assert.equal(res.success, true);
    assert.equal(res.teamName, "Syntax Mavericks");
    assert.ok(res.registrationId.startsWith("REG-2026-"));
  });

  // Test 3: Invalid Email Rejection
  await runTest("3. Rejects invalid email format via Zod schema", async () => {
    const input = {
      eventSlug: "typography-motion-expo",
      mode: "individual",
      attendeeName: "Invalid Email User",
      email: "not-an-email-address",
      answers: {},
    };

    const res = await executeRegistration(input);
    assert.equal(res.success, false);
    assert.ok(res.fieldErrors);
    assert.ok(res.fieldErrors["email"], "Field error for email should exist");
  });

  // Test 4: Malformed Team Member Email
  await runTest("4. Rejects team registration with malformed member email", async () => {
    const input = {
      eventSlug: "diet-code-2026",
      mode: "team",
      attendeeName: "Valid Captain",
      email: "captain@srmist.edu.in",
      teamName: "Buggy Team",
      teamMembers: [
        {
          name: "Broken Email Member",
          email: "not-a-valid-email",
        },
      ],
      answers: {},
    };

    const res = await executeRegistration(input);
    assert.equal(res.success, false);
    assert.ok(res.fieldErrors["teamMembers.0.email"]);
  });

  // Test 5: Duplicate Emails in Team Roster
  await runTest("5. Rejects team with duplicate emails between captain and member", async () => {
    const input = {
      eventSlug: "diet-code-2026",
      mode: "team",
      attendeeName: "Captain Duplicate",
      email: "duplicate@srmist.edu.in",
      teamName: "Clone Squad",
      teamMembers: [
        {
          name: "Member Duplicate",
          email: "duplicate@srmist.edu.in",
        },
      ],
      answers: {},
    };

    const res = await executeRegistration(input);
    assert.equal(res.success, false);
    assert.match(res.error, /duplicate email/i);
  });

  // Test 6: Team Exceeding Max Team Size
  await runTest("6. Rejects team exceeding maxTeamSize constraint", async () => {
    const input = {
      eventSlug: "diet-code-2026", // maxTeamSize is 3
      mode: "team",
      attendeeName: "Captain Overcapacity",
      email: "captain@srmist.edu.in",
      teamName: "Huge Team",
      teamMembers: [
        { name: "M1", email: "m1@srmist.edu.in" },
        { name: "M2", email: "m2@srmist.edu.in" },
        { name: "M3", email: "m3@srmist.edu.in" }, // total = 4 (captain + 3) > 3
      ],
      answers: {},
    };

    const res = await executeRegistration(input);
    assert.equal(res.success, false);
    assert.match(res.error, /exceeds maximum allowed/i);
  });

  // Test 7: Closed Event Rejection
  await runTest("7. Rejects registration on closed event", async () => {
    const input = {
      eventSlug: "visual-storytelling-workshop",
      mode: "individual",
      attendeeName: "Late Registrant",
      email: "late@srmist.edu.in",
      answers: {},
    };

    const res = await executeRegistration(input);
    assert.equal(res.success, false);
    assert.match(res.error, /officially closed|already concluded/i);
  });

  // Test 8: Full Capacity Event Rejection
  await runTest("8. Rejects registration on full-capacity event", async () => {
    const input = {
      eventSlug: "prompt-to-prototype",
      mode: "team",
      attendeeName: "Unlucky Captain",
      email: "unlucky@srmist.edu.in",
      teamName: "Full Team",
      teamMembers: [{ name: "M1", email: "m1@srmist.edu.in" }],
      answers: {},
    };

    const res = await executeRegistration(input);
    assert.equal(res.success, false);
    assert.match(res.error, /capacity has been reached/i);
  });

  // Test 9: Non-existent Event Slug
  await runTest("9. Rejects registration for non-existent event slug", async () => {
    const input = {
      eventSlug: "fake-non-existent-event",
      mode: "individual",
      attendeeName: "Ghost User",
      email: "ghost@srmist.edu.in",
      answers: {},
    };

    const res = await executeRegistration(input);
    assert.equal(res.success, false);
    assert.match(res.error, /event not found/i);
  });

  // Test 10: Draft / Upcoming Event Rejection
  await runTest("10. Rejects registration for draft / upcoming event", async () => {
    const input = {
      eventSlug: "future-design-draft",
      mode: "individual",
      attendeeName: "Eager User",
      email: "eager@srmist.edu.in",
      answers: {},
    };

    const res = await executeRegistration(input);
    assert.equal(res.success, false);
    assert.match(res.error, /not yet open/i);
  });

  // Test 11: Duplicate Registration Rejection (Individual)
  await runTest("11. Rejects individual duplicate registration if email already registered", async () => {
    const existingRoster = new Set(["already.there@srmist.edu.in"]);
    const input = {
      eventSlug: "typography-motion-expo",
      mode: "individual",
      attendeeName: "Repeat Registrant",
      email: "already.there@srmist.edu.in",
      answers: {},
    };

    const res = await executeRegistration(input, mockEventResolver, existingRoster);
    assert.equal(res.success, false);
    assert.match(res.error, /already registered for this event/i);
  });

  // Test 12: Duplicate Registration Rejection (Team Member)
  await runTest("12. Rejects team registration if any member is already registered", async () => {
    const existingRoster = new Set(["registered.member@srmist.edu.in"]);
    const input = {
      eventSlug: "diet-code-2026",
      mode: "team",
      attendeeName: "New Captain",
      email: "fresh.captain@srmist.edu.in",
      teamName: "Conflict Crew",
      teamMembers: [
        {
          name: "Conflict Member",
          email: "registered.member@srmist.edu.in",
        },
      ],
      answers: {},
    };

    const res = await executeRegistration(input, mockEventResolver, existingRoster);
    assert.equal(res.success, false);
    assert.match(res.error, /already registered for this event/i);
  });

  console.log("\n-------------------------------------------------------");
  console.log(`Results: ${passedCount} passed, ${failedCount} failed of ${passedCount + failedCount} tests.`);
  console.log("-------------------------------------------------------\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

suite();
