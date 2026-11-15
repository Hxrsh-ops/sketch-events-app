"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { verifyAdminSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { SketchRepository } from "@/lib/supabase/repository";
import { ActionResult } from "@/app/actions/event-actions";
import { AdminUser } from "@/types";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { generateTicketBearerToken } from "@/lib/ticket/rotating-qr";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { EmailOutboxWorker } from "@/lib/email/worker";

const BatchRedispatchPassesSchema = z.object({
  eventId: z.string().min(1, "Event identifier is required"),
  recipientEmail: z.string().email().optional(),
});

export type BatchRedispatchPassesInput = z.infer<typeof BatchRedispatchPassesSchema>;

const EnqueueDispatchSchema = z.object({
  eventId: z.string().min(1, "Event identifier is required"),
  subject: z.string().trim().min(1, "Subject line is required"),
  audience: z.enum(["all", "checked_in", "pending"]),
  bodyContent: z.string().optional(),
  scheduledAt: z.string().optional(),
});

const BulkJobIdsSchema = z.object({
  jobIds: z
    .array(z.string().trim().min(1, "Job identifier cannot be empty"))
    .min(1, "Select at least one dispatch record.")
    .max(100, "Bulk operations are limited to 100 records at a time."),
});

const ArchiveJobsSchema = BulkJobIdsSchema.extend({
  archive: z.boolean(),
});

export type EnqueueDispatchInput = z.infer<typeof EnqueueDispatchSchema>;

export interface OutboxMutationResult {
  processedIds: string[];
  skipped: Array<{ id: string; reason: string }>;
}

/**
 * Enforces authenticated admin session and 'communications:send' RBAC permission.
 */
async function requireCommunicationsAccess(
  actionDescription: string
): Promise<{ ok: true; user: AdminUser } | { ok: false; response: ActionResult<never> }> {
  const session = await verifyAdminSession();
  if (!session.isAuthenticated || !session.user) {
    return {
      ok: false,
      response: {
        success: false,
        error: "UNAUTHORIZED",
        message: `You must be signed in as an administrator to ${actionDescription}.`,
      },
    };
  }

  if (!hasPermission(session.user.role, "communications:send")) {
    return {
      ok: false,
      response: {
        success: false,
        error: "FORBIDDEN",
        message: `You do not have permission to ${actionDescription}.`,
      },
    };
  }

  return { ok: true, user: session.user };
}

/**
 * Server Action: Enqueue communication dispatch to outbox
 *
 * Enforces authenticated admin session and RBAC permission ('communications:send').
 * Resolves audience cohort from authoritative participant repository and logs to audit trail.
 */
export async function enqueueDispatchAction(
  rawData: unknown
): Promise<ActionResult<{ enqueuedCount: number }>> {
  try {
    const auth = await requireCommunicationsAccess("dispatch communications");
    if (!auth.ok) return auth.response;

    const parseResult = EnqueueDispatchSchema.safeParse(rawData);
    if (!parseResult.success) {
      return {
        success: false,
        error: "VALIDATION_FAILED",
        message: parseResult.error.issues[0]?.message || "Invalid dispatch parameters.",
      };
    }

    const { eventId, subject, audience, bodyContent, scheduledAt } = parseResult.data;

    const participants = await SketchRepository.listParticipants({
      eventId,
      attendanceStatus:
        audience === "checked_in" ? "checked_in" : audience === "pending" ? "not_checked_in" : undefined,
    });

    if (participants.length === 0) {
      return {
        success: false,
        error: "NO_RECIPIENTS",
        message: "No registered participants matched the selected audience filter for this event.",
      };
    }

    const recipients = participants.map((p) => ({
      email: p.email,
      name: p.name,
    }));

    const result = await SketchRepository.enqueueCommunication({
      eventId,
      subject,
      templateType: "announcement",
      recipients,
      payload: {
        bodyContent: bodyContent || "",
        audience,
        sender: auth.user.name,
      },
      scheduledAt,
      actorName: auth.user.name,
      actorEmail: auth.user.email,
    });

    revalidatePath("/communications");
    revalidatePath("/audit");
    revalidatePath("/");

    return {
      success: true,
      data: { enqueuedCount: result.enqueuedCount },
      message: `Successfully queued dispatch for ${result.enqueuedCount} recipients.`,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Internal server error";
    console.error("[enqueueDispatchAction] Failed:", { message: errorMessage });

    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: errorMessage || "An unexpected error occurred while queuing communication.",
    };
  }
}

/**
 * Server Action: Retry an eligible failed email outbox job
 *
 * Enforces authenticated admin session and RBAC permission.
 * Resets attempts = 0 and clears last_error; only updates jobs in 'failed' status.
 */
export async function retryFailedDispatchAction(
  jobId: string
): Promise<ActionResult<{ retried: boolean }>> {
  try {
    const auth = await requireCommunicationsAccess("retry communications");
    if (!auth.ok) return auth.response;

    if (!jobId || typeof jobId !== "string" || !jobId.trim()) {
      return {
        success: false,
        error: "VALIDATION_FAILED",
        message: "A valid communication job ID is required.",
      };
    }

    const result = await SketchRepository.retryFailedCommunication(jobId.trim(), {
      actorId: auth.user.id,
      actorName: auth.user.name,
      actorEmail: auth.user.email,
    });
    if (!result.success) {
      return {
        success: false,
        error: "RETRY_FAILED",
        message: result.message || "Failed to retry delivery for this communication job.",
      };
    }

    revalidatePath("/communications");
    revalidatePath("/audit");

    return {
      success: true,
      data: { retried: true },
      message: "Communication queued for immediate retry.",
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Internal server error";
    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: errorMessage || "Failed to retry communication.",
    };
  }
}

/**
 * Server Action: Cancel one or more queued communication outbox jobs
 *
 * Only jobs still in 'queued' status are transitioned to 'cancelled'.
 * Claimed ('processing'), 'sent', or 'failed' jobs are safely skipped.
 */
export async function cancelOutboxJobsAction(
  rawData: unknown
): Promise<ActionResult<OutboxMutationResult>> {
  try {
    const auth = await requireCommunicationsAccess("cancel queued communications");
    if (!auth.ok) return auth.response;

    const parseResult = BulkJobIdsSchema.safeParse(rawData);
    if (!parseResult.success) {
      return {
        success: false,
        error: "VALIDATION_FAILED",
        message: parseResult.error.issues[0]?.message || "Invalid job IDs provided.",
      };
    }

    const res = await SketchRepository.cancelOutboxJobs({
      jobIds: parseResult.data.jobIds,
      actorId: auth.user.id,
      actorName: auth.user.name,
      actorEmail: auth.user.email,
    });

    if (!res.success) {
      return {
        success: false,
        error: "CANCEL_FAILED",
        message: res.message || "No eligible queued dispatches could be cancelled.",
        ...(res.skipped.length > 0
          ? { details: { skipped: res.skipped.map((s) => `${s.id}: ${s.reason}`) } }
          : {}),
      };
    }

    revalidatePath("/communications");
    revalidatePath("/audit");

    return {
      success: true,
      data: { processedIds: res.processedIds, skipped: res.skipped },
      message: res.message,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Internal server error";
    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: errorMessage || "Failed to cancel communication jobs.",
    };
  }
}

/**
 * Server Action: Permanently delete eligible queued or failed outbox jobs
 *
 * Strictly forbids deleting 'sent', 'processing', or 'cancelled' records.
 */
export async function deleteOutboxJobsAction(
  rawData: unknown
): Promise<ActionResult<OutboxMutationResult>> {
  try {
    const auth = await requireCommunicationsAccess("delete outbox records");
    if (!auth.ok) return auth.response;

    const parseResult = BulkJobIdsSchema.safeParse(rawData);
    if (!parseResult.success) {
      return {
        success: false,
        error: "VALIDATION_FAILED",
        message: parseResult.error.issues[0]?.message || "Invalid job IDs provided.",
      };
    }

    const res = await SketchRepository.deleteOutboxJobs({
      jobIds: parseResult.data.jobIds,
      actorId: auth.user.id,
      actorName: auth.user.name,
      actorEmail: auth.user.email,
    });

    if (!res.success) {
      return {
        success: false,
        error: "DELETE_FAILED",
        message: res.message || "No eligible outbox records could be deleted.",
        ...(res.skipped.length > 0
          ? { details: { skipped: res.skipped.map((s) => `${s.id}: ${s.reason}`) } }
          : {}),
      };
    }

    revalidatePath("/communications");
    revalidatePath("/audit");

    return {
      success: true,
      data: { processedIds: res.processedIds, skipped: res.skipped },
      message: res.message,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Internal server error";
    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: errorMessage || "Failed to delete outbox records.",
    };
  }
}

/**
 * Server Action: Archive or unarchive sent/failed outbox jobs
 *
 * Preserves delivery timestamps, status, attempts, and error telemetry.
 */
export async function archiveOutboxJobsAction(
  rawData: unknown
): Promise<ActionResult<OutboxMutationResult>> {
  try {
    const auth = await requireCommunicationsAccess("archive outbox records");
    if (!auth.ok) return auth.response;

    const parseResult = ArchiveJobsSchema.safeParse(rawData);
    if (!parseResult.success) {
      return {
        success: false,
        error: "VALIDATION_FAILED",
        message: parseResult.error.issues[0]?.message || "Invalid archive request.",
      };
    }

    const res = await SketchRepository.archiveOutboxJobs({
      jobIds: parseResult.data.jobIds,
      archive: parseResult.data.archive,
      actorId: auth.user.id,
      actorName: auth.user.name,
      actorEmail: auth.user.email,
    });

    if (!res.success) {
      return {
        success: false,
        error: "ARCHIVE_FAILED",
        message: res.message || "No eligible dispatches were updated.",
        ...(res.skipped.length > 0
          ? { details: { skipped: res.skipped.map((s) => `${s.id}: ${s.reason}`) } }
          : {}),
      };
    }

    revalidatePath("/communications");
    revalidatePath("/audit");

    return {
      success: true,
      data: { processedIds: res.processedIds, skipped: res.skipped },
      message: res.message,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Internal server error";
    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: errorMessage || "Failed to archive outbox records.",
    };
  }
}

/**
 * Server Action: Batch or Individual Pass Re-dispatch
 *
 * Enforces admin session and 'communications:send' permission.
 * Resolves event attendees, issues/reconciles official ticket pass payloads,
 * enqueues them in communications_outbox, and immediately processes delivery.
 */
export async function batchRedispatchPassesAction(
  rawData: unknown
): Promise<ActionResult<{ dispatchedCount: number; message: string }>> {
  try {
    const auth = await requireCommunicationsAccess("re-dispatch event passes");
    if (!auth.ok) return auth.response;

    const parseResult = BatchRedispatchPassesSchema.safeParse(rawData);
    if (!parseResult.success) {
      return {
        success: false,
        error: "VALIDATION_FAILED",
        message: parseResult.error.issues[0]?.message || "Invalid pass re-dispatch request.",
      };
    }

    const { eventId, recipientEmail } = parseResult.data;

    const event = await SketchRepository.getEventById(eventId);
    if (!event) {
      return {
        success: false,
        error: "EVENT_NOT_FOUND",
        message: "The specified event could not be found.",
      };
    }

    const allParticipants = await SketchRepository.listParticipants({ eventId });
    const targetParticipants = recipientEmail
      ? allParticipants.filter((p) => p.email.toLowerCase().trim() === recipientEmail.toLowerCase().trim())
      : allParticipants.filter((p) => p.status !== "cancelled");

    if (targetParticipants.length === 0) {
      return {
        success: false,
        error: "NO_RECIPIENTS",
        message: recipientEmail
          ? `No confirmed registration found for email "${recipientEmail}".`
          : "No confirmed attendees found for this event.",
      };
    }

    // Determine canonical app URL
    let appUrl = "https://sketchhub-liard.vercel.app";
    try {
      const headerList = await headers();
      const host = headerList.get("x-forwarded-host") || headerList.get("host");
      const proto = headerList.get("x-forwarded-proto") || "https";
      if (host && !host.includes("localhost")) {
        appUrl = `${proto}://${host}`;
      }
    } catch {
      // fallback
    }

    const supabase: any = createAdminClient() || (await createClient());

    for (const p of targetParticipants) {
      const { rawToken, tokenHash } = generateTicketBearerToken();
      const ticketNumber = p.ticketNumber || `TKT-${p.registrationId.replace(/^REG-/, "")}`;

      await SketchRepository.issueOrReconcileTicket({
        registrationId: p.id,
        bearerTokenHash: tokenHash,
        ticketNumber,
      });

      const liveTicketUrl = `${appUrl}/tickets/${rawToken}`;
      let qrCodeDataUrl: string | undefined;
      try {
        qrCodeDataUrl = await QRCode.toDataURL(liveTicketUrl, {
          margin: 1,
          width: 200,
          color: { dark: "#17191C", light: "#FFFFFF" },
        });
      } catch {
        // non-critical
      }

      const passPayload = {
        event_title: event.title,
        venue: event.venue || "Campus Venue",
        start_date: event.startDate,
        registration_id: p.registrationId,
        qr_credential_id: p.qrCredentialId,
        ticket_number: ticketNumber,
        live_ticket_url: liveTicketUrl,
        qr_code_data_url: qrCodeDataUrl,
        team_name: p.teamName,
      };

      if (supabase && typeof supabase.from === "function") {
        await supabase.from("communications_outbox").insert({
          event_id: eventId,
          recipient_email: p.email,
          recipient_name: p.name,
          subject: `Official Admission Pass: ${event.title}`,
          template_type: "ticket_pass",
          payload: passPayload,
          status: "queued",
          attempts: 0,
          scheduled_at: new Date().toISOString(),
        });
      }
    }

    // Immediately trigger outbox worker processing for instant delivery
    try {
      const worker = new EmailOutboxWorker();
      await worker.processBatch(Math.max(targetParticipants.length, 10));
    } catch (workerErr: any) {
      console.error("[batchRedispatchPassesAction] Outbox batch worker exception:", workerErr?.message);
    }

    revalidatePath(`/events/${eventId}`);
    revalidatePath("/communications");

    return {
      success: true,
      data: {
        dispatchedCount: targetParticipants.length,
        message: `Successfully dispatched official pass to ${targetParticipants.length} attendee(s).`,
      },
      message: `Successfully dispatched official pass to ${targetParticipants.length} attendee(s).`,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Internal server error";
    console.error("[batchRedispatchPassesAction] Failure:", errorMessage);
    return {
      success: false,
      error: "REDISPATCH_FAILED",
      message: errorMessage || "Failed to re-dispatch event passes.",
    };
  }
}
