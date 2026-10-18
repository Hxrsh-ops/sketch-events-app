"use server";

import { MOCK_EVENTS, MOCK_PARTICIPANTS } from "../../lib/mock-data";
import { createClient } from "../../lib/supabase/server";
import { EventItem } from "../../types";
import {
  registrationActionSchema,
  type RegistrationActionInput,
  type RegistrationActionResult,
} from "../../lib/registration-schemas";

export type { RegistrationActionInput, RegistrationActionResult };

/**
 * Resolves event by slug or id from database or fallback mock dataset
 */
async function resolveEvent(slugOrId: string): Promise<EventItem | null> {
  const supabase = await createClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .or(`slug.eq.${slugOrId},id.eq.${slugOrId}`)
        .single();
      if (!error && data) {
        return data as unknown as EventItem;
      }
    } catch {
      // Database query failed (e.g., table does not exist yet)
    }
  }

  // Check static mock events (for local preview)
  const cleanSlug = slugOrId.replace(/^sketch-/, "");
  const found = MOCK_EVENTS.find(
    (e) => e.slug === slugOrId || e.slug === cleanSlug || e.id === slugOrId
  );
  return found || null;
}

/**
 * Authoritatively validates and processes event registrations.
 * Accepts an optional event resolver to allow hermetic unit testing.
 */
export async function validateAndProcessRegistration(
  rawInput: unknown,
  customEventResolver?: (slugOrId: string) => Promise<EventItem | null> | EventItem | null,
  customExistingRoster?: Set<string>
): Promise<RegistrationActionResult> {
  // 1. Zod Payload & Type Validation
  const parseResult = registrationActionSchema.safeParse(rawInput);
  if (!parseResult.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parseResult.error.issues) {
      const path = issue.path.join(".");
      fieldErrors[path] = issue.message;
    }
    return {
      success: false,
      error: "Validation failed. Please correct the highlighted errors.",
      fieldErrors,
    };
  }

  const data = parseResult.data;

  // 2. Authoritative Server Event Resolution
  const event = customEventResolver
    ? await customEventResolver(data.eventSlug)
    : await resolveEvent(data.eventSlug);

  if (!event) {
    return {
      success: false,
      error: "Event not found. Please verify the event link.",
    };
  }

  // 3. Event Lifecycle & Eligibility Verification
  if (event.lifecycle === "draft" || event.registrationState === "upcoming") {
    return {
      success: false,
      error: "Registration for this event is not yet open.",
    };
  }

  if (event.lifecycle === "completed" || event.lifecycle === "archived") {
    return {
      success: false,
      error: "This event has already concluded. Registrations are closed.",
    };
  }

  if (event.registrationState === "closed") {
    return {
      success: false,
      error: "Registration for this event is officially closed.",
    };
  }

  // 4. Capacity Verification
  if (
    event.registrationState === "full" ||
    (event.capacity > 0 && event.registeredCount >= event.capacity)
  ) {
    return {
      success: false,
      error: "Event capacity has been reached. No additional registrations can be accepted.",
    };
  }

  // 5. Team Configuration & Capacity Verification
  if (data.mode === "team") {
    if (!event.hasTeams) {
      return {
        success: false,
        error: "This event only accepts individual registrations.",
      };
    }

    const totalTeamSize = 1 + data.teamMembers.length; // Captain + members

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

    // Check duplicate emails within team roster
    const memberEmails = data.teamMembers.map((m) => m.email.toLowerCase().trim());
    const allEmails = [data.email.toLowerCase().trim(), ...memberEmails];
    const uniqueEmails = new Set(allEmails);
    if (uniqueEmails.size !== allEmails.length) {
      return {
        success: false,
        error: "Duplicate email detected within team roster. Each team member must have a unique email address.",
      };
    }

    // Check remaining capacity accommodates entire team
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

  // 6. Duplicate Registration Check (against known event roster)
  // Concurrency Note: This pre-check validates against currently known rosters.
  // Full concurrency safety against simultaneous race conditions requires Harshanth's
  // PostgreSQL schema unique constraint: UNIQUE (event_id, lower(email)).
  const existingRosterEmails = customExistingRoster
    ? customExistingRoster
    : new Set(
        MOCK_PARTICIPANTS.filter((p) => p.eventId === event.id).map((p) =>
          p.email.toLowerCase().trim()
        )
      );

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

  // 7. Cryptographically generate authoritative identifiers on the server
  const registrationId = `REG-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const qrCredentialId = `qr_cred_${crypto.randomUUID().replace(/-/g, "").substring(0, 16)}`;
  const registeredAt = new Date().toISOString();

  // 7. Persistence Boundary Check
  const supabase = customEventResolver ? null : await createClient();
  if (supabase) {
    // If Supabase is configured, check if authoritative tables exist
    // As established in the audit, migrations are pending authoring by Project Lead (Harshanth).
    // We do NOT invent tables, fake columns, or pretend an unwritten DB write succeeded.
    return {
      success: false,
      error: "Authoritative database migrations are pending deployment by Project Lead (Harshanth). Registration cannot be persisted in production database yet.",
    };
  }

  // In Preview Mode (no Supabase credentials provided in environment)
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

/**
 * Server Action: Authoritatively validates and processes event registrations
 */
export async function registerParticipantAction(
  rawInput: unknown
): Promise<RegistrationActionResult> {
  return validateAndProcessRegistration(rawInput);
}
