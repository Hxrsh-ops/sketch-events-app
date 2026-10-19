"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { verifyAdminSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { SketchRepository } from "@/lib/supabase/repository";
import { ActionResult } from "@/app/actions/event-actions";
import { CertificateRecord } from "@/types";

const BatchIssueSchema = z.object({
  eventId: z.string().optional(),
});

export type BatchIssueInput = z.infer<typeof BatchIssueSchema>;

/**
 * Server Action: Batch issue verified digital certificates
 *
 * Enforces authenticated admin session and RBAC permission ('certificates:issue').
 * Automatically enqueues notification email jobs in the communications outbox.
 */
export async function batchIssueCertificatesAction(
  rawData: unknown
): Promise<ActionResult<{ issuedCount: number; certificates: CertificateRecord[] }>> {
  try {
    // 1. Authenticate session
    const session = await verifyAdminSession();
    if (!session.isAuthenticated || !session.user) {
      return {
        success: false,
        error: "UNAUTHORIZED",
        message: "You must be signed in as an administrator to issue certificates.",
      };
    }

    // 2. Authorize RBAC permission
    if (!hasPermission(session.user.role, "certificates:issue")) {
      return {
        success: false,
        error: "FORBIDDEN",
        message: "You do not have permission to issue certificates.",
      };
    }

    // 3. Validate input
    const parseResult = BatchIssueSchema.safeParse(rawData || {});
    if (!parseResult.success) {
      return {
        success: false,
        error: "VALIDATION_FAILED",
        message: parseResult.error.issues[0]?.message || "Invalid certificate parameters.",
      };
    }

    const { eventId } = parseResult.data;

    // 4. Execute atomic batch issuance via repository
    const result = await SketchRepository.batchIssueCertificates({
      eventId,
      actorName: session.user.name,
      actorEmail: session.user.email,
    });

    if (result.issuedCount === 0) {
      return {
        success: true,
        data: result,
        message: "No eligible checked-in attendees without certificates found for issuance.",
      };
    }

    // 5. Revalidate affected administration paths
    revalidatePath("/certificates");
    revalidatePath("/communications");
    revalidatePath("/audit");
    revalidatePath("/");
    if (eventId && eventId !== "all") {
      revalidatePath(`/events/${eventId}`);
    }

    return {
      success: true,
      data: result,
      message: `Successfully issued ${result.issuedCount} digital certificates.`,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Internal server error";
    console.error("[batchIssueCertificatesAction] Failed:", { message: errorMessage });

    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: errorMessage || "An unexpected error occurred while issuing certificates.",
    };
  }
}
