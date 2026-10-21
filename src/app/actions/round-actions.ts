"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { verifyAdminSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { SketchRepository } from "@/lib/supabase/repository";
import { ActionResult } from "@/app/actions/event-actions";
import { Round } from "@/types";

import {
  CreateRoundSchema,
  UpdateRoundSchema,
  DeleteRoundSchema,
  SetRoundStatusSchema,
  ReorderRoundsSchema,
  type CreateRoundInput,
  type UpdateRoundInput,
  type DeleteRoundInput,
  type SetRoundStatusInput,
  type ReorderRoundsInput,
} from "@/lib/validations/round-schemas";

export type {
  CreateRoundInput,
  UpdateRoundInput,
  DeleteRoundInput,
  SetRoundStatusInput,
  ReorderRoundsInput,
};


// =============================================================================
// SERVER ACTIONS
// =============================================================================

/**
 * Create a new competition round/stage for an event
 */
export async function createRoundAction(rawData: unknown): Promise<ActionResult<Round>> {
  try {
    const session = await verifyAdminSession();
    if (!session.isAuthenticated || !session.user) {
      return {
        success: false,
        error: "UNAUTHORIZED",
        message: "You must be signed in as an administrator to add competition stages.",
      };
    }

    if (!hasPermission(session.user.role, "events:edit")) {
      return {
        success: false,
        error: "FORBIDDEN",
        message: "You do not have permission to manage event stages.",
      };
    }

    const parseResult = CreateRoundSchema.safeParse(rawData);
    if (!parseResult.success) {
      return {
        success: false,
        error: "VALIDATION_FAILED",
        message: parseResult.error.issues[0]?.message || "Invalid stage parameters.",
      };
    }

    const { eventId, name, order, startTime, venue, status, eligibleCount, advancedCount } = parseResult.data;

    const round = await SketchRepository.createRound({
      eventId,
      name,
      order,
      startTime: startTime || new Date().toISOString(),
      venue,
      status,
      eligibleCount,
      advancedCount,
    });

    await SketchRepository.logAudit({
      actorName: session.user.name,
      actorEmail: session.user.email,
      action: "ROUND_CREATED",
      target: round.id,
      details: {
        eventId,
        roundName: round.name,
        roundOrder: round.order,
      },
    });

    revalidatePath("/rounds");
    revalidatePath("/events");
    revalidatePath(`/events/${eventId}`);

    return {
      success: true,
      data: round,
      message: `Stage "${round.name}" added successfully.`,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to create round.";
    console.error("[createRoundAction] Error:", errorMessage);
    return {
      success: false,
      error: "CREATE_ROUND_FAILED",
      message: errorMessage,
    };
  }
}

/**
 * Update an existing competition round
 */
export async function updateRoundAction(rawData: unknown): Promise<ActionResult<Round>> {
  try {
    const session = await verifyAdminSession();
    if (!session.isAuthenticated || !session.user) {
      return {
        success: false,
        error: "UNAUTHORIZED",
        message: "You must be signed in as an administrator to edit competition stages.",
      };
    }

    if (!hasPermission(session.user.role, "events:edit")) {
      return {
        success: false,
        error: "FORBIDDEN",
        message: "You do not have permission to edit event stages.",
      };
    }

    const parseResult = UpdateRoundSchema.safeParse(rawData);
    if (!parseResult.success) {
      return {
        success: false,
        error: "VALIDATION_FAILED",
        message: parseResult.error.issues[0]?.message || "Invalid stage update parameters.",
      };
    }

    const { id, eventId, ...updateFields } = parseResult.data;

    // Verify round ownership
    const existing = await SketchRepository.getRoundById(id);
    if (!existing) {
      return {
        success: false,
        error: "ROUND_NOT_FOUND",
        message: "The specified competition stage was not found.",
      };
    }

    if (existing.eventId !== eventId) {
      return {
        success: false,
        error: "CROSS_EVENT_MISMATCH",
        message: "This stage does not belong to the specified event.",
      };
    }

    const updated = await SketchRepository.updateRound(id, updateFields);

    await SketchRepository.logAudit({
      actorName: session.user.name,
      actorEmail: session.user.email,
      action: "ROUND_UPDATED",
      target: id,
      details: {
        eventId,
        updatedFields: Object.keys(updateFields),
      },
    });

    revalidatePath("/rounds");
    revalidatePath("/events");
    revalidatePath(`/events/${eventId}`);

    return {
      success: true,
      data: updated,
      message: `Stage "${updated.name}" updated successfully.`,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to update round.";
    console.error("[updateRoundAction] Error:", errorMessage);
    return {
      success: false,
      error: "UPDATE_ROUND_FAILED",
      message: errorMessage,
    };
  }
}

/**
 * Delete a competition round
 */
export async function deleteRoundAction(rawData: unknown): Promise<ActionResult<{ id: string; eventId: string }>> {
  try {
    const session = await verifyAdminSession();
    if (!session.isAuthenticated || !session.user) {
      return {
        success: false,
        error: "UNAUTHORIZED",
        message: "You must be signed in as an administrator to remove competition stages.",
      };
    }

    if (!hasPermission(session.user.role, "events:edit")) {
      return {
        success: false,
        error: "FORBIDDEN",
        message: "You do not have permission to delete event stages.",
      };
    }

    const parseResult = DeleteRoundSchema.safeParse(rawData);
    if (!parseResult.success) {
      return {
        success: false,
        error: "VALIDATION_FAILED",
        message: parseResult.error.issues[0]?.message || "Invalid stage deletion parameters.",
      };
    }

    const { id, eventId } = parseResult.data;

    // Verify round exists and belongs to the given event
    const existing = await SketchRepository.getRoundById(id);
    if (!existing) {
      return {
        success: false,
        error: "ROUND_NOT_FOUND",
        message: "The specified competition stage was not found.",
      };
    }

    if (existing.eventId !== eventId) {
      return {
        success: false,
        error: "CROSS_EVENT_MISMATCH",
        message: "This stage does not belong to the specified event.",
      };
    }

    await SketchRepository.deleteRound(id);

    await SketchRepository.logAudit({
      actorName: session.user.name,
      actorEmail: session.user.email,
      action: "ROUND_DELETED",
      target: id,
      details: {
        eventId,
        roundName: existing.name,
      },
    });

    revalidatePath("/rounds");
    revalidatePath("/events");
    revalidatePath(`/events/${eventId}`);

    return {
      success: true,
      data: { id, eventId },
      message: `Stage "${existing.name}" removed successfully.`,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to delete round.";
    console.error("[deleteRoundAction] Error:", errorMessage);
    return {
      success: false,
      error: "DELETE_ROUND_FAILED",
      message: errorMessage,
    };
  }
}

/**
 * Update the status of a competition round (e.g. advance stage progression)
 */
export async function setRoundStatusAction(rawData: unknown): Promise<ActionResult<Round>> {
  try {
    const session = await verifyAdminSession();
    if (!session.isAuthenticated || !session.user) {
      return {
        success: false,
        error: "UNAUTHORIZED",
        message: "You must be signed in as an administrator to update stage status.",
      };
    }

    if (!hasPermission(session.user.role, "events:edit")) {
      return {
        success: false,
        error: "FORBIDDEN",
        message: "You do not have permission to advance or modify stage progression.",
      };
    }

    const parseResult = SetRoundStatusSchema.safeParse(rawData);
    if (!parseResult.success) {
      return {
        success: false,
        error: "VALIDATION_FAILED",
        message: parseResult.error.issues[0]?.message || "Invalid status parameters.",
      };
    }

    const { id, eventId, status, advancedCount } = parseResult.data;

    const existing = await SketchRepository.getRoundById(id);
    if (!existing) {
      return {
        success: false,
        error: "ROUND_NOT_FOUND",
        message: "The specified competition stage was not found.",
      };
    }

    if (existing.eventId !== eventId) {
      return {
        success: false,
        error: "CROSS_EVENT_MISMATCH",
        message: "This stage does not belong to the specified event.",
      };
    }

    const updated = await SketchRepository.updateRound(id, {
      status,
      ...(advancedCount !== undefined && { advancedCount }),
    });

    await SketchRepository.logAudit({
      actorName: session.user.name,
      actorEmail: session.user.email,
      action: "ROUND_STATUS_CHANGED",
      target: id,
      details: {
        eventId,
        previousStatus: existing.status,
        nextStatus: status,
        advancedCount: updated.advancedCount,
      },
    });

    revalidatePath("/rounds");
    revalidatePath("/events");
    revalidatePath(`/events/${eventId}`);

    return {
      success: true,
      data: updated,
      message: `Stage "${updated.name}" status updated to ${status.replace("_", " ")}.`,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to update round status.";
    console.error("[setRoundStatusAction] Error:", errorMessage);
    return {
      success: false,
      error: "SET_STATUS_FAILED",
      message: errorMessage,
    };
  }
}

/**
 * Reorder competition rounds for an event
 */
export async function reorderRoundsAction(rawData: unknown): Promise<ActionResult<Round[]>> {
  try {
    const session = await verifyAdminSession();
    if (!session.isAuthenticated || !session.user) {
      return {
        success: false,
        error: "UNAUTHORIZED",
        message: "You must be signed in as an administrator to reorder stages.",
      };
    }

    if (!hasPermission(session.user.role, "events:edit")) {
      return {
        success: false,
        error: "FORBIDDEN",
        message: "You do not have permission to reorder stages.",
      };
    }

    const parseResult = ReorderRoundsSchema.safeParse(rawData);
    if (!parseResult.success) {
      return {
        success: false,
        error: "VALIDATION_FAILED",
        message: parseResult.error.issues[0]?.message || "Invalid reorder parameters.",
      };
    }

    const { eventId, roundIds } = parseResult.data;

    const reordered = await SketchRepository.reorderRounds(eventId, roundIds);

    await SketchRepository.logAudit({
      actorName: session.user.name,
      actorEmail: session.user.email,
      action: "ROUNDS_REORDERED",
      target: eventId,
      details: {
        eventId,
        roundOrder: roundIds,
      },
    });

    revalidatePath("/rounds");
    revalidatePath(`/events/${eventId}`);

    return {
      success: true,
      data: reordered,
      message: "Stages reordered successfully.",
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to reorder rounds.";
    console.error("[reorderRoundsAction] Error:", errorMessage);
    return {
      success: false,
      error: "REORDER_FAILED",
      message: errorMessage,
    };
  }
}
