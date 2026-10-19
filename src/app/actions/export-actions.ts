"use server";

import { z } from "zod";
import { verifyAdminSession } from "@/lib/auth/session";
import { SketchRepository } from "@/lib/supabase/repository";
import { ActionResult } from "@/app/actions/event-actions";

const ExportDataSchema = z.object({
  dataset: z.enum(["attendance", "participants", "teams", "certificates", "audit"]),
  eventId: z.string().optional(),
});

export type ExportDataInput = z.infer<typeof ExportDataSchema>;

/**
 * Server Action: Fetch authoritative export records for admin reports
 *
 * Enforces authenticated admin session before providing data export streams.
 */
export async function exportRosterDataAction(
  rawData: unknown
): Promise<ActionResult<{ dataset: string; records: Record<string, unknown>[] }>> {
  try {
    const session = await verifyAdminSession();
    if (!session.isAuthenticated || !session.user) {
      return {
        success: false,
        error: "UNAUTHORIZED",
        message: "You must be signed in as an administrator to export event records.",
      };
    }

    const parseResult = ExportDataSchema.safeParse(rawData);
    if (!parseResult.success) {
      return {
        success: false,
        error: "VALIDATION_FAILED",
        message: parseResult.error.issues[0]?.message || "Invalid export parameters.",
      };
    }

    const { dataset, eventId } = parseResult.data;
    const scopedEventId = eventId && eventId !== "all" ? eventId : undefined;

    let records: Record<string, unknown>[] = [];

    switch (dataset) {
      case "attendance":
      case "participants": {
        const participants = await SketchRepository.listParticipants({ eventId: scopedEventId });
        records = participants.map((p) => ({
          registrationId: p.registrationId,
          name: p.name,
          email: p.email,
          phone: p.phone || "",
          eventId: p.eventId,
          eventTitle: p.eventTitle,
          department: p.department || "",
          year: p.year || "",
          teamName: p.teamName || "",
          status: p.status,
          attendanceStatus: p.attendanceStatus,
          checkedInAt: p.checkedInAt || "",
          qrCredentialId: p.qrCredentialId,
        }));
        break;
      }
      case "teams": {
        const teams = await SketchRepository.listTeams({ eventId: scopedEventId });
        records = teams.map((t) => ({
          id: t.id,
          name: t.name,
          eventId: t.eventId,
          eventTitle: t.eventTitle,
          captainName: t.captainName,
          captainEmail: t.captainEmail,
          memberCount: t.memberCount,
          maxMembers: t.maxMembers,
          status: t.status,
          registeredAt: t.registeredAt,
        }));
        break;
      }
      case "certificates": {
        const certs = await SketchRepository.listCertificates(scopedEventId);
        records = certs.map((c) => ({
          certificateNumber: c.certificateNumber,
          recipientName: c.recipientName,
          recipientEmail: c.recipientEmail,
          eventTitle: c.eventTitle,
          issuedAt: c.issuedAt,
          status: c.status,
        }));
        break;
      }
      case "audit": {
        const logs = await SketchRepository.listAuditLogs({ limit: 500 });
        records = logs.map((l) => ({
          id: l.id,
          actorName: l.actorName,
          actorEmail: l.actorEmail,
          action: l.action,
          target: l.target,
          timestamp: l.timestamp,
          details: l.details,
        }));
        break;
      }
    }

    return {
      success: true,
      data: {
        dataset,
        records,
      },
      message: `Export prepared with ${records.length} records.`,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Internal server error";
    console.error("[exportRosterDataAction] Failed:", { message: errorMessage });

    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: errorMessage || "An unexpected error occurred while preparing export.",
    };
  }
}
