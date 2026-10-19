"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { verifyAdminSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { SketchRepository } from "@/lib/supabase/repository";
import { ActionResult } from "@/app/actions/event-actions";

const ToggleAttendanceSchema = z.object({
  registrationIdOrUid: z.string().trim().min(1, "Registration identifier is required"),
  eventId: z.string().trim().min(1, "Event identifier is required"),
  targetStatus: z.enum(["checked_in", "not_checked_in"]).optional(),
});

export type ToggleAttendanceInput = z.infer<typeof ToggleAttendanceSchema>;

/**
 * Server Action: Toggle participant check-in attendance
 *
 * Enforces authenticated admin session and RBAC permission ('attendance:scan' or 'attendance:override').
 * Directly mutates the authoritative database ledger and event checked_in_count.
 */
export async function toggleAttendanceAction(
  rawData: unknown
): Promise<ActionResult<{ registrationId: string; attendanceStatus: "checked_in" | "not_checked_in"; checkedInAt?: string }>> {
  try {
    // 1. Authenticate caller session
    const session = await verifyAdminSession();
    if (!session.isAuthenticated || !session.user) {
      return {
        success: false,
        error: "UNAUTHORIZED",
        message: "You must be signed in as an administrator to perform check-in operations.",
      };
    }

    // 2. Authorize caller role ('attendance:scan' or 'attendance:override')
    const role = session.user.role;
    const canCheckIn = hasPermission(role, "attendance:scan") || hasPermission(role, "attendance:override");
    if (!canCheckIn) {
      return {
        success: false,
        error: "FORBIDDEN",
        message: "You do not have permission to manage participant attendance.",
      };
    }

    // 3. Validate payload schema
    const parseResult = ToggleAttendanceSchema.safeParse(rawData);
    if (!parseResult.success) {
      return {
        success: false,
        error: "VALIDATION_FAILED",
        message: parseResult.error.issues[0]?.message || "Invalid check-in parameters.",
      };
    }

    const { registrationIdOrUid, eventId, targetStatus } = parseResult.data;

    // 4. Execute atomic repository toggle with event scoping
    const result = await SketchRepository.toggleParticipantAttendance({
      registrationIdOrUid,
      eventId,
      targetStatus,
      actorId: session.user.id,
      method: "manual",
    });

    if (!result.success) {
      return {
        success: false,
        error: "CHECK_IN_FAILED",
        message: result.message,
      };
    }

    // 5. Revalidate affected administration views
    revalidatePath("/participants");
    revalidatePath("/teams");
    revalidatePath("/attendance");
    if (eventId) {
      revalidatePath(`/events/${eventId}`);
    }

    return {
      success: true,
      data: {
        registrationId: result.registrationId,
        attendanceStatus: result.attendanceStatus,
        checkedInAt: result.checkedInAt,
      },
      message: result.message,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Internal server error";
    console.error("[toggleAttendanceAction] Failed:", { message: errorMessage });

    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: "An error occurred while updating participant attendance.",
    };
  }
}
