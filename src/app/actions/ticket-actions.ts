"use server";

import { z } from "zod";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { verifyAdminSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { SketchRepository } from "@/lib/supabase/repository";
import { createAdminClient } from "@/lib/supabase/server";
import {
  CreateTicketTemplateSchema,
  UpdateTicketDraftSchema,
  PublishTemplateVersionSchema,
  AssignEventTemplateSchema,
  VerifyRotatingQrSchema,
  TicketDesignData,
} from "@/lib/validations/ticket-schemas";
import {
  verifyRotatingQrTokenSignature,
  issueRotatingQrToken,
  generateQrDataUrl,
} from "@/lib/ticket/rotating-qr";
import { TicketTemplate, TicketTemplateVersion, LiveTicketData } from "@/types";

export type ActionResult<T = unknown> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; message: string; details?: Record<string, string[]> };

/**
 * List all available ticket templates
 */
export async function listTicketTemplatesAction(): Promise<ActionResult<TicketTemplate[]>> {
  try {
    const session = await verifyAdminSession();
    if (!session.isAuthenticated || !session.user) {
      return {
        success: false,
        error: "UNAUTHORIZED",
        message: "You must be signed in as an administrator to view ticket designs.",
      };
    }

    const templates = await SketchRepository.listTicketTemplates();
    return { success: true, data: templates };
  } catch (err: any) {
    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: err.message || "Failed to retrieve ticket templates.",
    };
  }
}

/**
 * Get ticket template with its versions
 */
export async function getTicketTemplateAction(templateId: string): Promise<
  ActionResult<{ template: TicketTemplate | null; versions: TicketTemplateVersion[] }>
> {
  try {
    const session = await verifyAdminSession();
    if (!session.isAuthenticated || !session.user) {
      return {
        success: false,
        error: "UNAUTHORIZED",
        message: "You must be signed in to view ticket templates.",
      };
    }

    const res = await SketchRepository.getTicketTemplateById(templateId);
    return { success: true, data: res };
  } catch (err: any) {
    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: err.message || "Failed to load template details.",
    };
  }
}

/**
 * Create a new ticket template with an initial draft
 */
export async function createTicketTemplateAction(
  rawData: unknown
): Promise<ActionResult<{ templateId: string; versionId: string }>> {
  try {
    const session = await verifyAdminSession();
    if (!session.isAuthenticated || !session.user) {
      return {
        success: false,
        error: "UNAUTHORIZED",
        message: "You must be signed in as an administrator to create ticket designs.",
      };
    }

    if (!hasPermission(session.user.role, "events:create") && !hasPermission(session.user.role, "events:edit")) {
      return {
        success: false,
        error: "FORBIDDEN",
        message: "Your role does not have permission to create ticket templates.",
      };
    }

    const parseResult = CreateTicketTemplateSchema.safeParse(rawData);
    if (!parseResult.success) {
      return {
        success: false,
        error: "VALIDATION_FAILED",
        message: parseResult.error.issues[0]?.message || "Invalid template data.",
        details: parseResult.error.flatten().fieldErrors as any,
      };
    }

    const result = await SketchRepository.createTicketTemplate({
      ...parseResult.data,
      actorId: session.user.id,
    });

    revalidatePath("/studio");
    return {
      success: true,
      data: result,
      message: `Template "${parseResult.data.name}" created successfully.`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: err.message || "Failed to create ticket template.",
    };
  }
}

/**
 * Save draft version of a template
 */
export async function saveTemplateDraftAction(
  rawData: unknown
): Promise<ActionResult<{ templateId: string }>> {
  try {
    const session = await verifyAdminSession();
    if (!session.isAuthenticated || !session.user) {
      return {
        success: false,
        error: "UNAUTHORIZED",
        message: "You must be signed in to edit ticket designs.",
      };
    }

    if (!hasPermission(session.user.role, "events:edit")) {
      return {
        success: false,
        error: "FORBIDDEN",
        message: "Your role does not have permission to edit ticket templates.",
      };
    }

    const parseResult = UpdateTicketDraftSchema.safeParse(rawData);
    if (!parseResult.success) {
      return {
        success: false,
        error: "VALIDATION_FAILED",
        message: parseResult.error.issues[0]?.message || "Invalid design data.",
      };
    }

    const ok = await SketchRepository.saveTemplateDraft({
      templateId: parseResult.data.templateId,
      designData: parseResult.data.designData,
    });

    if (!ok) {
      return {
        success: false,
        error: "SAVE_FAILED",
        message: "Could not save draft design changes.",
      };
    }

    revalidatePath("/studio");
    return {
      success: true,
      data: { templateId: parseResult.data.templateId },
      message: "Draft saved successfully.",
    };
  } catch (err: any) {
    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: err.message || "Failed to save draft.",
    };
  }
}

/**
 * Publish an immutable template version
 */
export async function publishTemplateVersionAction(
  rawData: unknown
): Promise<ActionResult<{ versionId: string; versionNumber: number }>> {
  try {
    const session = await verifyAdminSession();
    if (!session.isAuthenticated || !session.user) {
      return {
        success: false,
        error: "UNAUTHORIZED",
        message: "You must be signed in to publish ticket designs.",
      };
    }

    if (!hasPermission(session.user.role, "events:edit")) {
      return {
        success: false,
        error: "FORBIDDEN",
        message: "Your role does not have permission to publish ticket versions.",
      };
    }

    const parseResult = PublishTemplateVersionSchema.safeParse(rawData);
    if (!parseResult.success) {
      return {
        success: false,
        error: "VALIDATION_FAILED",
        message: parseResult.error.issues[0]?.message || "Invalid publication data.",
      };
    }

    const result = await SketchRepository.publishTemplateVersion({
      templateId: parseResult.data.templateId,
      designData: parseResult.data.designData,
      actorId: session.user.id,
    });

    revalidatePath("/studio");
    return {
      success: true,
      data: result,
      message: `Version ${result.versionNumber} published. Existing issued passes retain their original version.`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: err.message || "Failed to publish template version.",
    };
  }
}

/**
 * Assign a published template version to an event
 */
export async function assignEventTemplateAction(
  rawData: unknown
): Promise<ActionResult<{ eventId: string; templateVersionId: string }>> {
  try {
    const session = await verifyAdminSession();
    if (!session.isAuthenticated || !session.user) {
      return {
        success: false,
        error: "UNAUTHORIZED",
        message: "You must be signed in to assign templates.",
      };
    }

    if (!hasPermission(session.user.role, "events:edit")) {
      return {
        success: false,
        error: "FORBIDDEN",
        message: "Your role does not have permission to assign ticket templates.",
      };
    }

    const parseResult = AssignEventTemplateSchema.safeParse(rawData);
    if (!parseResult.success) {
      return {
        success: false,
        error: "VALIDATION_FAILED",
        message: parseResult.error.issues[0]?.message || "Invalid assignment data.",
      };
    }

    const ok = await SketchRepository.assignEventTicketTemplate({
      eventId: parseResult.data.eventId,
      templateVersionId: parseResult.data.templateVersionId,
      actorName: session.user.name,
      actorEmail: session.user.email,
    });

    if (!ok) {
      return {
        success: false,
        error: "ASSIGN_FAILED",
        message: "Failed to link template to event.",
      };
    }

    revalidatePath(`/events/${parseResult.data.eventId}`);
    revalidatePath("/events");
    return {
      success: true,
      data: parseResult.data,
      message: "Ticket template assigned to event successfully.",
    };
  } catch (err: any) {
    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: err.message || "Failed to assign template.",
    };
  }
}

/**
 * Public lookup: fetch ticket metadata for the participant's live-ticket view
 */
export async function getLiveTicketAction(
  rawBearerToken: string
): Promise<ActionResult<LiveTicketData>> {
  try {
    if (!rawBearerToken || typeof rawBearerToken !== "string") {
      return {
        success: false,
        error: "INVALID_TOKEN",
        message: "Invalid ticket access link.",
      };
    }

    const ticket = await SketchRepository.getTicketByBearerToken(rawBearerToken);
    if (!ticket) {
      return {
        success: false,
        error: "TICKET_NOT_FOUND",
        message: "No active ticket found for this access link.",
      };
    }

    return { success: true, data: ticket };
  } catch (err: any) {
    return {
      success: false,
      error: "SERVER_ERROR",
      message: "Could not load ticket details.",
    };
  }
}

/**
 * Public action: request a fresh short-lived rotating QR challenge for the live-ticket view
 */
export async function requestRotatingQrTokenAction(
  rawBearerToken: string
): Promise<
  ActionResult<{
    qrDataUrl: string;
    token: string;
    expiresAt: number;
    ttlSeconds: number;
  }>
> {
  try {
    if (!rawBearerToken || typeof rawBearerToken !== "string") {
      return {
        success: false,
        error: "INVALID_TOKEN",
        message: "Invalid ticket bearer credential.",
      };
    }

    const ticket = await SketchRepository.getTicketByBearerToken(rawBearerToken);
    if (!ticket) {
      return {
        success: false,
        error: "TICKET_NOT_FOUND",
        message: "Ticket does not exist or has been removed.",
      };
    }

    if (ticket.ticketStatus === "revoked") {
      return {
        success: false,
        error: "TICKET_REVOKED",
        message: "This ticket has been revoked by administration.",
      };
    }

    if (ticket.ticketStatus === "cancelled") {
      return {
        success: false,
        error: "TICKET_CANCELLED",
        message: "This registration has been cancelled.",
      };
    }

    // Issue short-lived rotating token (valid for 60 seconds)
    const { token, expiresAt, ttlSeconds } = issueRotatingQrToken({
      ticketId: ticket.ticketId,
      eventId: ticket.eventId,
      registrationId: ticket.ticketNumber,
      ttlSeconds: 60,
    });

    // Generate high-contrast QR Data URL for camera scanning
    const qrDataUrl = await generateQrDataUrl(token, 240);

    return {
      success: true,
      data: {
        qrDataUrl,
        token,
        expiresAt,
        ttlSeconds,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: "QR_GENERATION_FAILED",
      message: "Failed to generate rotating QR token.",
    };
  }
}

/**
 * Attendance Agent Action: Verify rotating QR token at admission desk
 */
export async function verifyRotatingQrAction(
  rawData: unknown
): Promise<
  ActionResult<{
    attendanceStatus: string;
    attendeeName: string;
    ticketNumber: string;
    checkedInAt?: string;
  }>
> {
  try {
    // 1. Authenticate caller session
    const session = await verifyAdminSession();
    if (!session.isAuthenticated || !session.user) {
      return {
        success: false,
        error: "UNAUTHORIZED",
        message: "You must be signed in as an administrator or attendance agent.",
      };
    }

    if (!hasPermission(session.user.role, "attendance:scan") && !hasPermission(session.user.role, "attendance:override")) {
      return {
        success: false,
        error: "FORBIDDEN",
        message: "Your role does not have permission to scan and check-in tickets.",
      };
    }

    // 2. Validate input format
    const parseResult = VerifyRotatingQrSchema.safeParse(rawData);
    if (!parseResult.success) {
      return {
        success: false,
        error: "VALIDATION_FAILED",
        message: parseResult.error.issues[0]?.message || "Invalid QR token format.",
      };
    }

    const { token, eventId, method } = parseResult.data;

    // 3. Cryptographic signature and expiration check
    const sigResult = verifyRotatingQrTokenSignature(token);
    if (!sigResult.valid || !sigResult.payload) {
      if (sigResult.error === "EXPIRED") {
        return {
          success: false,
          error: "TOKEN_EXPIRED",
          message: "This QR token has expired. Please refresh the live ticket.",
        };
      }
      return {
        success: false,
        error: "INVALID_SIGNATURE",
        message: "Cryptographic signature invalid or tampered.",
      };
    }

    const payload = sigResult.payload;

    // 4. Verify event boundary matches scanner's active event
    if (payload.eid !== eventId) {
      return {
        success: false,
        error: "CROSS_EVENT_MISMATCH",
        message: "This ticket belongs to a different event.",
      };
    }

    // 5. Execute atomic database verification and check-in RPC
    const dbResult = await SketchRepository.verifyRotatingQrToken({
      ticketId: payload.tid,
      eventId,
      actorId: session.user.id,
      method,
    });

    if (!dbResult.success) {
      return {
        success: false,
        error: dbResult.error || "CHECKIN_FAILED",
        message: dbResult.message,
      };
    }

    revalidatePath("/attendance");
    revalidatePath("/participants");
    revalidatePath(`/events/${eventId}`);

    return {
      success: true,
      data: {
        attendanceStatus: dbResult.attendanceStatus || "checked_in",
        attendeeName: dbResult.attendeeName || "Attendee",
        ticketNumber: dbResult.ticketNumber || payload.reg,
        checkedInAt: dbResult.checkedInAt,
      },
      message: dbResult.message || "Participant verified and admitted successfully.",
    };
  } catch (err: any) {
    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: err.message || "An unexpected error occurred while verifying QR token.",
    };
  }
}

/**
 * Revoke an active ticket
 */
export async function revokeTicketAction(
  rawData: unknown
): Promise<ActionResult<{ ticketId: string }>> {
  try {
    const session = await verifyAdminSession();
    if (!session.isAuthenticated || !session.user) {
      return {
        success: false,
        error: "UNAUTHORIZED",
        message: "You must be signed in to revoke tickets.",
      };
    }

    if (!hasPermission(session.user.role, "events:edit")) {
      return {
        success: false,
        error: "FORBIDDEN",
        message: "Your role does not have permission to revoke tickets.",
      };
    }

    const schema = z.object({
      ticketId: z.string().uuid("Invalid ticket ID"),
      reason: z.string().trim().min(3, "Reason must be at least 3 characters").max(300),
    });

    const parsed = schema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: "VALIDATION_FAILED",
        message: parsed.error.issues[0]?.message || "Invalid revocation parameters.",
      };
    }

    const res = await SketchRepository.revokeTicket({
      ticketId: parsed.data.ticketId,
      actorId: session.user.id,
      reason: parsed.data.reason,
    });

    if (!res.success) {
      return {
        success: false,
        error: res.error || "REVOKE_FAILED",
        message: res.message,
      };
    }

    revalidatePath("/participants");
    revalidatePath("/attendance");
    return {
      success: true,
      data: { ticketId: parsed.data.ticketId },
      message: "Ticket revoked successfully. Live QR tokens will be rejected.",
    };
  } catch (err: any) {
    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: err.message || "Failed to revoke ticket.",
    };
  }
}

/**
 * Upload a custom ticket background image (JPEG, PNG, WebP; max 5MB)
 */
export async function uploadTicketBackgroundAction(
  formData: FormData
): Promise<ActionResult<{ url: string; fileName: string; size: number }>> {
  try {
    // 1. Authorization
    const session = await verifyAdminSession();
    if (!session.isAuthenticated || !session.user) {
      return {
        success: false,
        error: "UNAUTHORIZED",
        message: "You must be signed in as an administrator to upload ticket assets.",
      };
    }

    if (!hasPermission(session.user.role, "events:edit") && !hasPermission(session.user.role, "events:create")) {
      return {
        success: false,
        error: "FORBIDDEN",
        message: "Your role does not have permission to upload ticket designs.",
      };
    }

    // 2. Extract and validate file
    const file = formData.get("file") as File | null;
    if (!file || typeof file === "string") {
      return {
        success: false,
        error: "NO_FILE",
        message: "No image file provided in upload request.",
      };
    }

    // Max 5 MB
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return {
        success: false,
        error: "FILE_TOO_LARGE",
        message: "Image exceeds 5MB limit. Please choose a smaller file.",
      };
    }

    // Validate MIME type
    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        success: false,
        error: "INVALID_FILE_TYPE",
        message: "Invalid image format. Only JPEG, PNG, and WebP are supported.",
      };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Magic bytes verification
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    const isWebp =
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50;

    if (!isJpeg && !isPng && !isWebp) {
      return {
        success: false,
        error: "INVALID_MAGIC_BYTES",
        message: "Corrupted or disguised image content. Upload was rejected.",
      };
    }

    let ext = "png";
    if (isJpeg) ext = "jpg";
    if (isWebp) ext = "webp";

    const safeFileName = `ticket-bg-${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${ext}`;

    // 3. Storage Strategy: Durable Supabase Storage Bucket ('ticket-assets')
    const adminSupabase = createAdminClient();
    const isExplicitLocalDriver =
      process.env.STORAGE_DRIVER === "local" &&
      (process.env.APP_MODE === "preview" || process.env.ALLOW_LOCAL_STORAGE === "true");

    let publicUrl = "";

    if (adminSupabase && !isExplicitLocalDriver) {
      const { data: uploadData, error: uploadErr } = await adminSupabase.storage
        .from("ticket-assets")
        .upload(`backgrounds/${safeFileName}`, buffer, {
          contentType: file.type,
          upsert: false, // Disallow overwrites; strictly immutable assets
        });

      if (uploadErr || !uploadData) {
        console.error("[uploadTicketBackgroundAction] Supabase Storage upload failed:", uploadErr);
        return {
          success: false,
          error: "STORAGE_UPLOAD_FAILED",
          message: `Storage upload failed: ${uploadErr?.message || "Unknown storage error."}`,
        };
      }

      const { data: urlData } = adminSupabase.storage
        .from("ticket-assets")
        .getPublicUrl(`backgrounds/${safeFileName}`);

      if (!urlData?.publicUrl) {
        return {
          success: false,
          error: "STORAGE_URL_FAILED",
          message: "Failed to generate public URL for uploaded ticket asset.",
        };
      }

      publicUrl = urlData.publicUrl;
    } else if (isExplicitLocalDriver) {
      // Explicit dev/preview filesystem fallback only when intentionally configured
      const fs = await import("fs");
      const path = await import("path");
      const uploadDir = path.join(process.cwd(), "public", "uploads", "ticket-backgrounds");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const filePath = path.join(uploadDir, safeFileName);
      fs.writeFileSync(filePath, buffer);
      publicUrl = `/uploads/ticket-backgrounds/${safeFileName}`;
    } else {
      // Fail-closed in production if Supabase client is unconfigured
      return {
        success: false,
        error: "STORAGE_UNAVAILABLE",
        message: "Supabase Storage client is not configured for asset uploads.",
      };
    }

    return {
      success: true,
      data: {
        url: publicUrl,
        fileName: safeFileName,
        size: file.size,
      },
      message: "Ticket background uploaded successfully.",
    };
  } catch (err: any) {
    return {
      success: false,
      error: "UPLOAD_FAILED",
      message: err.message || "Failed to process image upload.",
    };
  }
}
