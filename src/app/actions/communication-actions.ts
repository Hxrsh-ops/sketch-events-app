"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { verifyAdminSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { SketchRepository } from "@/lib/supabase/repository";
import { ActionResult } from "@/app/actions/event-actions";

const EnqueueDispatchSchema = z.object({
  eventId: z.string().min(1, "Event identifier is required"),
  subject: z.string().trim().min(1, "Subject line is required"),
  audience: z.enum(["all", "checked_in", "pending"]),
  bodyContent: z.string().optional(),
  scheduledAt: z.string().optional(),
});

export type EnqueueDispatchInput = z.infer<typeof EnqueueDispatchSchema>;

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
    // 1. Authenticate session
    const session = await verifyAdminSession();
    if (!session.isAuthenticated || !session.user) {
      return {
        success: false,
        error: "UNAUTHORIZED",
        message: "You must be signed in as an administrator to dispatch communications.",
      };
    }

    // 2. Authorize RBAC permission
    if (!hasPermission(session.user.role, "communications:send")) {
      return {
        success: false,
        error: "FORBIDDEN",
        message: "You do not have permission to dispatch communications.",
      };
    }

    // 3. Validate input
    const parseResult = EnqueueDispatchSchema.safeParse(rawData);
    if (!parseResult.success) {
      return {
        success: false,
        error: "VALIDATION_FAILED",
        message: parseResult.error.issues[0]?.message || "Invalid dispatch parameters.",
      };
    }

    const { eventId, subject, audience, bodyContent, scheduledAt } = parseResult.data;

    // 4. Resolve audience participants
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

    // 5. Enqueue outbox batch
    const result = await SketchRepository.enqueueCommunication({
      eventId,
      subject,
      templateType: "announcement",
      recipients,
      payload: {
        bodyContent: bodyContent || "",
        audience,
        sender: session.user.name,
      },
      scheduledAt,
      actorName: session.user.name,
      actorEmail: session.user.email,
    });

    // 6. Revalidate affected administration paths
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
