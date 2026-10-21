"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { SketchRepository } from "@/lib/supabase/repository";
import {
  getStoredEvents,
  getStoredSubmissions,
  saveSubmission,
} from "@/lib/registration-store";
import { RegistrationSubmission } from "@/types";
import { RegistrationMode } from "@/types/database";
import { generateTicketBearerToken } from "@/lib/ticket/rotating-qr";
import { createAdminClient, createClient } from "@/lib/supabase/server";

/**
 * Standard Result Type for Server Actions
 */
export type ActionResult<T = unknown> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; message: string; details?: Record<string, string[]>; data?: any };

import {
  RegisterForEventInputSchema,
  type RegisterForEventInput,
  type RegistrationPassData,
} from "@/lib/validations/registration-schemas";

export type { RegistrationPassData, RegisterForEventInput };


const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SAFE_BUSINESS_ERRORS: Record<string, string> = {
  EVENT_NOT_FOUND: "Event does not exist.",
  EVENT_NOT_ACTIVE: "This event is not accepting registrations.",
  REGISTRATION_CLOSED: "Registration for this event is closed or full.",
  EVENT_ENDED: "Registration has concluded for this event.",
  TEAMS_NOT_ALLOWED: "This event does not permit team registrations.",
  TEAM_TOO_SMALL: "Team size is below the minimum required.",
  TEAM_TOO_LARGE: "Team size exceeds the maximum allowed.",
  CAPACITY_EXCEEDED: "Not enough capacity remaining for this registration.",
  ALREADY_REGISTERED: "You are already registered for this event.",
  DUPLICATE_TEAM_EMAIL: "Duplicate email address detected within team registration.",
  MEMBER_ALREADY_REGISTERED: "One or more team members are already registered for this event.",
  TEAM_NAME_REQUIRED: "Team name is required.",
  EVENT_MISMATCH: "Event identifier does not match the requested event slug.",
  VALIDATION_FAILED: "Invalid registration information.",
  INVALID_EVENT_ID: "Invalid event ID format.",
};

/**
 * Server Action: Register a participant or team for an event
 *
 * Implements atomic persistence against database procedure `register_for_event()`
 * in production mode, with seamless preview fallback for local development.
 */
export async function registerForEventAction(
  rawData: unknown
): Promise<ActionResult<RegistrationPassData>> {
  try {
    // 1. Validate payload schema
    const parseResult = RegisterForEventInputSchema.safeParse(rawData);
    if (!parseResult.success) {
      const fieldErrors: Record<string, string[]> = {};
      parseResult.error.issues.forEach((issue) => {
        const path = issue.path.join(".") || "form";
        if (!fieldErrors[path]) fieldErrors[path] = [];
        fieldErrors[path].push(issue.message);
      });
      return {
        success: false,
        error: "VALIDATION_FAILED",
        message: parseResult.error.issues[0]?.message || "Invalid registration information.",
        details: fieldErrors,
      };
    }

    const data = parseResult.data;
    const normalizedEmail = data.email.trim().toLowerCase();
    const mappedTeamMembers = data.teamMembers.map((m) => ({
      name: m.name,
      email: m.email.trim().toLowerCase(),
      phone: m.phone || undefined,
      department: m.department || undefined,
      role: m.role || undefined,
    }));

    // 2. Validate team rules if team mode selected
    if (data.mode === "team") {
      if (!data.teamName || !data.teamName.trim()) {
        return {
          success: false,
          error: "TEAM_NAME_REQUIRED",
          message: "Team name is required.",
        };
      }

      // Check captain email is not duplicated in team members
      for (const member of data.teamMembers) {
        if (member.email.trim().toLowerCase() === normalizedEmail) {
          return {
            success: false,
            error: "DUPLICATE_TEAM_EMAIL",
            message: "Captain email cannot also be listed as a team member.",
          };
        }
      }

      // Check unique emails among team members
      const memberEmails = data.teamMembers.map((m) => m.email.trim().toLowerCase());
      if (new Set(memberEmails).size !== memberEmails.length) {
        return {
          success: false,
          error: "DUPLICATE_TEAM_EMAIL",
          message: "Team members cannot share the same email address.",
        };
      }
    }

    // -------------------------------------------------------------------------
    // PREVIEW MODE BRANCH (Local storage & memory resilience)
    // -------------------------------------------------------------------------
    if (SketchRepository.isPreview()) {
      const allEvents = getStoredEvents();

      // Enforce event ID / slug consistency if both provided
      if (data.slug && data.eventId) {
        const byId = allEvents.find((e) => e.id === data.eventId);
        const bySlug = allEvents.find((e) => e.slug === data.slug);
        if (byId && bySlug && byId.id !== bySlug.id) {
          return {
            success: false,
            error: "EVENT_MISMATCH",
            message: "Event identifier does not match the requested event slug.",
          };
        }
      }

      const event = allEvents.find(
        (e) => e.id === data.eventId || (data.slug && e.slug === data.slug)
      );

      if (!event) {
        return {
          success: false,
          error: "EVENT_NOT_FOUND",
          message: "Event does not exist.",
        };
      }

      // Lifecycle check
      if (event.lifecycle !== "published" && event.lifecycle !== "live") {
        return {
          success: false,
          error: "EVENT_NOT_ACTIVE",
          message: "This event is not accepting registrations.",
        };
      }

      // Registration state check
      if (event.registrationState !== "open") {
        return {
          success: false,
          error: "REGISTRATION_CLOSED",
          message: "Registration for this event is closed or full.",
        };
      }

      // Deadline check
      if (new Date() >= new Date(event.endDate)) {
        return {
          success: false,
          error: "EVENT_ENDED",
          message: "Registration has concluded for this event.",
        };
      }

      // Team constraints
      if (data.mode === "team") {
        if (!event.hasTeams) {
          return {
            success: false,
            error: "TEAMS_NOT_ALLOWED",
            message: "This event does not permit team registrations.",
          };
        }

        const totalTeamCount = 1 + data.teamMembers.length;
        if (event.minTeamSize && totalTeamCount < event.minTeamSize) {
          return {
            success: false,
            error: "TEAM_TOO_SMALL",
            message: `Team size is below the minimum required (${event.minTeamSize}).`,
          };
        }
        if (event.maxTeamSize && totalTeamCount > event.maxTeamSize) {
          return {
            success: false,
            error: "TEAM_TOO_LARGE",
            message: `Team size exceeds the maximum allowed (${event.maxTeamSize}).`,
          };
        }
      }

      // Capacity check
      const countToAdd = data.mode === "team" ? 1 + data.teamMembers.length : 1;
      if ((event.registeredCount + countToAdd) > event.capacity) {
        return {
          success: false,
          error: "CAPACITY_EXCEEDED",
          message: "Not enough capacity remaining for this registration.",
        };
      }

      // Duplicate email checks against preview store
      const storedSubmissions = getStoredSubmissions(event.id);
      if (storedSubmissions.some((s) => s.email.trim().toLowerCase() === normalizedEmail)) {
        return {
          success: false,
          error: "ALREADY_REGISTERED",
          message: "You are already registered for this event.",
        };
      }

      if (data.mode === "team") {
        for (const member of data.teamMembers) {
          const mEmail = member.email.trim().toLowerCase();
          if (storedSubmissions.some((s) => s.email.trim().toLowerCase() === mEmail)) {
            return {
              success: false,
              error: "MEMBER_ALREADY_REGISTERED",
              message: `Team member ${member.name} (${member.email}) is already registered for this event.`,
            };
          }
        }
      }

      const generatedRegId = `REG-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const generatedCredHash = `qr_cred_${Math.random().toString(36).substring(2, 10)}`;
      const submittedAt = new Date().toISOString();

      const submissionRecord: RegistrationSubmission = {
        id: `sub-${Date.now().toString(36)}`,
        registrationId: generatedRegId,
        eventId: event.id,
        eventTitle: event.title,
        submittedAt,
        mode: data.mode,
        status: "registered",
        attendeeName: data.attendeeName,
        email: normalizedEmail,
        phone: data.phone || undefined,
        department: data.department || undefined,
        year: data.year || undefined,
        teamName: data.mode === "team" ? data.teamName || undefined : undefined,
        teamMembers: mappedTeamMembers.length > 0 ? mappedTeamMembers : undefined,
        answers: data.customAnswers,
        schemaVersion: 1,
        qrCredentialId: generatedCredHash,
        attendanceStatus: "not_checked_in",
      };

      saveSubmission(submissionRecord);

      return {
        success: true,
        data: {
          registrationId: generatedRegId,
          qrCredentialId: generatedCredHash,
          attendeeName: data.attendeeName,
          email: normalizedEmail,
          teamName: data.mode === "team" ? data.teamName || undefined : undefined,
          eventTitle: event.title,
          registeredAt: submittedAt,
        },
        message: "Registration confirmed successfully (preview mode).",
      };
    }

    // -------------------------------------------------------------------------
    // PRODUCTION DATABASE BRANCH (PostgreSQL RPC with row lock & ACID invariants)
    // -------------------------------------------------------------------------

    // Strict UUID validation on eventId in production
    if (!UUID_REGEX.test(data.eventId)) {
      return {
        success: false,
        error: "INVALID_EVENT_ID",
        message: "Invalid event ID format.",
      };
    }

    const authoritativeEventId = data.eventId;
    let event = null;

    try {
      event = await SketchRepository.getEventById(authoritativeEventId);
    } catch {
      return {
        success: false,
        error: "DATABASE_ERROR",
        message: "Database service temporarily unavailable. Please try again.",
      };
    }

    if (!event) {
      return {
        success: false,
        error: "EVENT_NOT_FOUND",
        message: "Event does not exist.",
      };
    }

    // Enforce event ID / slug consistency
    if (data.slug && event.slug !== data.slug) {
      return {
        success: false,
        error: "EVENT_MISMATCH",
        message: "Event identifier does not match the requested event slug.",
      };
    }

    // Pre-flight checks on resolved event
    if (event.lifecycle !== "published" && event.lifecycle !== "live") {
      return {
        success: false,
        error: "EVENT_NOT_ACTIVE",
        message: "This event is not accepting registrations.",
      };
    }

    if (event.registrationState !== "open") {
      return {
        success: false,
        error: "REGISTRATION_CLOSED",
        message: "Registration for this event is closed or full.",
      };
    }

    if (new Date() >= new Date(event.endDate)) {
      return {
        success: false,
        error: "EVENT_ENDED",
        message: "Registration has concluded for this event.",
      };
    }

    if (data.mode === "team") {
      if (!event.hasTeams) {
        return {
          success: false,
          error: "TEAMS_NOT_ALLOWED",
          message: "This event does not permit team registrations.",
        };
      }

      const totalTeamCount = 1 + data.teamMembers.length;
      if (event.minTeamSize && totalTeamCount < event.minTeamSize) {
        return {
          success: false,
          error: "TEAM_TOO_SMALL",
          message: `Team size is below the minimum required (${event.minTeamSize}).`,
        };
      }
      if (event.maxTeamSize && totalTeamCount > event.maxTeamSize) {
        return {
          success: false,
          error: "TEAM_TOO_LARGE",
          message: `Team size exceeds the maximum allowed (${event.maxTeamSize}).`,
        };
      }
    }

    const regCountToAdd = data.mode === "team" ? 1 + data.teamMembers.length : 1;
    if ((event.registeredCount + regCountToAdd) > event.capacity) {
      return {
        success: false,
        error: "CAPACITY_EXCEEDED",
        message: "Not enough capacity remaining for this registration.",
      };
    }

    // Call atomic PostgreSQL RPC via repository
    const regResult = await SketchRepository.registerParticipant({
      eventId: authoritativeEventId,
      mode: data.mode as RegistrationMode,
      attendeeName: data.attendeeName,
      email: normalizedEmail,
      phone: data.phone || undefined,
      department: data.department || undefined,
      year: data.year || undefined,
      teamName: data.mode === "team" ? data.teamName || undefined : undefined,
      teamMembers: mappedTeamMembers.length > 0 ? mappedTeamMembers : undefined,
      customAnswers: data.customAnswers,
    });

    if (!regResult.success) {
      if (regResult.error === "ALREADY_REGISTERED") {
        const existing = await SketchRepository.getRegistrationByEventAndEmail(
          authoritativeEventId,
          normalizedEmail
        );

        if (existing) {
          const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
          let liveTicketUrl = existing.liveTicketUrl;
          let ticketNumber = existing.ticketNumber;

          // If ticket or live url was missing, reconcile it now
          if (!existing.ticketId || !liveTicketUrl) {
            const { rawToken, tokenHash } = generateTicketBearerToken();
            ticketNumber = ticketNumber || `TKT-${existing.registrationId.replace(/^REG-/, "")}`;

            if (!existing.ticketId) {
              await SketchRepository.issueOrReconcileTicket({
                registrationId: existing.id,
                bearerTokenHash: tokenHash,
                ticketNumber,
              });
            } else {
              await SketchRepository.updateTicketBearerTokenHash(existing.ticketId, tokenHash);
            }

            liveTicketUrl = `${appUrl}/tickets/${rawToken}`;
            await SketchRepository.updateOutboxTicketPassPayload({
              eventId: authoritativeEventId,
              recipientEmail: normalizedEmail,
              liveTicketUrl,
              ticketNumber,
            });
          }

          return {
            success: false,
            error: "ALREADY_REGISTERED",
            message: "You are already registered for this event.",
            data: {
              registrationId: existing.registrationId,
              qrCredentialId: existing.qrCredentialId,
              attendeeName: existing.attendeeName,
              email: normalizedEmail,
              teamName: existing.teamName,
              eventTitle: event.title,
              registeredAt: existing.createdAt,
              ticketNumber,
              liveTicketUrl,
              isExisting: true,
            },
          };
        }
      }

      const isSafeError = regResult.error && regResult.error in SAFE_BUSINESS_ERRORS;
      if (!isSafeError) {
        console.error("[registerForEventAction] Unexpected registration database error:", {
          code: regResult.error,
        });
      }

      return {
        success: false,
        error: regResult.error || "REGISTRATION_FAILED",
        message: isSafeError
          ? regResult.message || SAFE_BUSINESS_ERRORS[regResult.error!]
          : "Database service temporarily unavailable. Please try again.",
      };
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
    let issuedTicketNumber = `TKT-${regResult.registrationId!.replace(/^REG-/, "")}`;
    let liveTicketUrl: string | undefined;

    // Automatically issue the official ticket and wire rotating QR access link into communications outbox
    let regRowId = regResult.registrationRowId;
    if (!regRowId && regResult.registrationId) {
      try {
        const supabase: any = createAdminClient() || (await createClient());
        if (supabase && typeof supabase.from === "function") {
          const resQuery = supabase.from("registrations");
          if (resQuery && typeof resQuery.select === "function") {
            const { data: regRow } = await resQuery
              .select("id")
              .eq("registration_id", regResult.registrationId)
              .maybeSingle();
            if (regRow?.id) {
              regRowId = regRow.id;
            }
          }
        }
      } catch {
        // ignore
      }
    }

    if (regRowId) {
      try {
        const { rawToken, tokenHash } = generateTicketBearerToken();
        const ticketRes = await SketchRepository.issueOrReconcileTicket({
          registrationId: regRowId,
          bearerTokenHash: tokenHash,
          ticketNumber: issuedTicketNumber,
        });

        if (ticketRes.ticketNumber) {
          issuedTicketNumber = ticketRes.ticketNumber;
        }

        liveTicketUrl = `${appUrl}/tickets/${rawToken}`;

        await SketchRepository.updateOutboxTicketPassPayload({
          eventId: authoritativeEventId,
          recipientEmail: normalizedEmail,
          liveTicketUrl,
          ticketNumber: issuedTicketNumber,
        });

        // Reconcile tickets for individual team members if team registration
        if (data.mode === "team" && mappedTeamMembers.length > 0) {
          try {
            const supabase: any = createAdminClient() || (await createClient());
            if (supabase && typeof supabase.from === "function") {
              const memberEmails = mappedTeamMembers.map((m) => m.email.toLowerCase().trim());
              const resQuery = supabase.from("registrations");
              if (resQuery && typeof resQuery.select === "function") {
                const { data: memberRegs } = await resQuery
                  .select("id, registration_id, email")
                  .eq("event_id", authoritativeEventId)
                  .in("email", memberEmails);

                if (memberRegs && memberRegs.length > 0) {
                  for (const member of memberRegs) {
                    const memberTokens = generateTicketBearerToken();
                    const memberTicketNum = `TKT-${member.registration_id.replace(/^REG-/, "")}`;
                    await SketchRepository.issueOrReconcileTicket({
                      registrationId: member.id,
                      bearerTokenHash: memberTokens.tokenHash,
                      ticketNumber: memberTicketNum,
                    });
                    const memberLiveUrl = `${appUrl}/tickets/${memberTokens.rawToken}`;
                    await SketchRepository.updateOutboxTicketPassPayload({
                      eventId: authoritativeEventId,
                      recipientEmail: member.email,
                      liveTicketUrl: memberLiveUrl,
                      ticketNumber: memberTicketNum,
                    });
                  }
                }
              }
            }
          } catch (memberErr) {
            console.error("[registerForEventAction] Failed to reconcile team member tickets:", memberErr);
          }
        }
      } catch (ticketErr) {
        console.warn("[registerForEventAction] Ticket issuance or outbox payload update skipped:", ticketErr);
      }
    }

    revalidatePath(`/e/${event.slug}`);
    revalidatePath(`/events/${authoritativeEventId}`);
    revalidatePath("/events");
    revalidatePath("/participants");

    return {
      success: true,
      data: {
        registrationId: regResult.registrationId!,
        qrCredentialId: regResult.qrCredentialId!,
        attendeeName: data.attendeeName,
        email: normalizedEmail,
        teamName: data.mode === "team" ? data.teamName || undefined : undefined,
        eventTitle: event.title,
        registeredAt: new Date().toISOString(),
        ticketNumber: issuedTicketNumber,
        liveTicketUrl,
        isExisting: false,
      },
      message: "Registration confirmed successfully.",
    };
  } catch (err: any) {
    console.error("[registerForEventAction] Unhandled registration exception:", {
      message: err instanceof Error ? err.message : "Unknown error",
    });
    return {
      success: false,
      error: "SERVER_ERROR",
      message: "An unexpected error occurred while processing registration. Please try again.",
    };
  }
}
