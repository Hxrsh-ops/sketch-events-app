"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { verifyAdminSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { SketchRepository } from "@/lib/supabase/repository";
import { saveEvent, getStoredEvents, getStoredRounds, saveRound } from "@/lib/registration-store";
import { EventItem } from "@/types";

import {
  CreateEventSchema,
  UpdateEventSchema,
  SetLifecycleSchema,
  type ActionResult,
} from "@/lib/validations/event-schemas";

export type { ActionResult };

// -----------------------------------------------------------------------------
// SECURE SERVER ACTIONS
// -----------------------------------------------------------------------------


/**
 * Create a new event with full server-side authorization and Zod validation
 */
export async function createEventAction(
  rawData: unknown
): Promise<ActionResult<EventItem>> {
  try {
    // 1. Authenticate & Authorize
    const session = await verifyAdminSession();
    if (!session.isAuthenticated || !session.user) {
      return {
        success: false,
        error: "UNAUTHORIZED",
        message: "You must be signed in as an administrator to create events.",
      };
    }

    if (!hasPermission(session.user.role, "events:create")) {
      return {
        success: false,
        error: "FORBIDDEN",
        message: `Role "${session.user.role}" does not have permission to create events. Master Admin or Event Manager required.`,
      };
    }

    // 2. Validate input
    const parseResult = CreateEventSchema.safeParse(rawData);
    if (!parseResult.success) {
      return {
        success: false,
        error: "VALIDATION_FAILED",
        message: "Event data validation failed. Please check the provided fields.",
        details: parseResult.error.flatten().fieldErrors,
      };
    }

    const validData = parseResult.data;

    // 3. In Preview Mode without Supabase connection
    if (session.isPreview && SketchRepository.isPreview()) {
      const generatedId = `evt-${Date.now().toString(36)}`;
      const generatedSlug = validData.slug || validData.title.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-");
      const previewItem: EventItem = {
        id: generatedId,
        slug: generatedSlug,
        title: validData.title,
        category: validData.category as any,
        shortDescription: validData.shortDescription || "",
        description: validData.description || "",
        posterUrl: validData.posterUrl || "",
        heroImage: validData.heroImage || undefined,
        heroImageFocalPoint: validData.heroImageFocalPoint || undefined,
        directoryImage: validData.directoryImage || undefined,
        directoryImageFocalPoint: validData.directoryImageFocalPoint || undefined,
        startDate: validData.startDate,
        endDate: validData.endDate,
        venue: validData.venue,
        venueMode: validData.venueMode,
        capacity: validData.capacity,
        registeredCount: 0,
        checkedInCount: 0,
        lifecycle: validData.lifecycle,
        registrationState: validData.registrationState,
        hasTeams: validData.hasTeams,
        minTeamSize: validData.minTeamSize || undefined,
        maxTeamSize: validData.maxTeamSize || undefined,
        hasRounds: validData.hasRounds,
        featured: validData.featured,
        contactEmail: validData.contactEmail || undefined,
        contactPhone: validData.contactPhone || undefined,
        communityLink: validData.communityLink || undefined,
        registrationForm: validData.registrationForm as any,
      };

      saveEvent(previewItem);
      revalidatePath("/events");
      return {
        success: true,
        data: previewItem,
        message: "[Preview Mode] Event created and saved to local environment store.",
      };
    }

    // 4. Production Database Persistence
    const created = await SketchRepository.createEvent(
      {
        ...validData,
        posterUrl: validData.posterUrl || null,
        heroImage: validData.heroImage || null,
        directoryImage: validData.directoryImage || null,
      },
      session.user.id
    );

    // 5. Audit Logging
    await SketchRepository.logAudit({
      actorName: session.user.name,
      actorEmail: session.user.email,
      action: "EVENT_CREATED",
      target: created.id,
      details: { title: created.title, slug: created.slug, capacity: created.capacity },
    });

    revalidatePath("/events");
    revalidatePath(`/e/${created.slug}`);

    return {
      success: true,
      data: created,
      message: `Event "${created.title}" successfully created.`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: err.message || "An unexpected error occurred while creating the event.",
    };
  }
}

/**
 * Update an existing event with locked capacity & slug invariants
 */
export async function updateEventAction(
  rawData: unknown
): Promise<ActionResult<EventItem>> {
  try {
    const session = await verifyAdminSession();
    if (!session.isAuthenticated || !session.user) {
      return {
        success: false,
        error: "UNAUTHORIZED",
        message: "You must be signed in as an administrator to update events.",
      };
    }

    if (!hasPermission(session.user.role, "events:edit")) {
      return {
        success: false,
        error: "FORBIDDEN",
        message: `Role "${session.user.role}" does not have permission to edit events.`,
      };
    }

    const parseResult = UpdateEventSchema.safeParse(rawData);
    if (!parseResult.success) {
      return {
        success: false,
        error: "VALIDATION_FAILED",
        message: "Event update data is invalid.",
        details: parseResult.error.flatten().fieldErrors,
      };
    }

    const { id, ...updateFields } = parseResult.data;

    // Preview Mode handling
    if (session.isPreview && SketchRepository.isPreview()) {
      const allEvents = getStoredEvents();
      const existing = allEvents.find((e) => e.id === id);
      if (!existing) {
        return { success: false, error: "NOT_FOUND", message: `Event "${id}" not found in preview store.` };
      }

      if (updateFields.capacity !== undefined && updateFields.capacity < existing.registeredCount) {
        return {
          success: false,
          error: "CAPACITY_BELOW_REGISTERED",
          message: `Capacity cannot be reduced below current registrations (${existing.registeredCount}).`,
        };
      }

      if (updateFields.slug && updateFields.slug !== existing.slug && (existing.lifecycle === "published" || existing.lifecycle === "live")) {
        return {
          success: false,
          error: "SLUG_LOCKED",
          message: "Slug cannot be modified once an event is published or live.",
        };
      }

      const updatedPreview: EventItem = {
        ...existing,
        ...updateFields,
        category: (updateFields.category || existing.category) as any,
        posterUrl: updateFields.posterUrl !== undefined ? (updateFields.posterUrl || "") : existing.posterUrl,
        heroImage: updateFields.heroImage !== undefined ? (updateFields.heroImage || undefined) : existing.heroImage,
        heroImageFocalPoint: updateFields.heroImageFocalPoint !== undefined ? (updateFields.heroImageFocalPoint || undefined) : existing.heroImageFocalPoint,
        directoryImage: updateFields.directoryImage !== undefined ? (updateFields.directoryImage || undefined) : existing.directoryImage,
        directoryImageFocalPoint: updateFields.directoryImageFocalPoint !== undefined ? (updateFields.directoryImageFocalPoint || undefined) : existing.directoryImageFocalPoint,
        contactEmail: updateFields.contactEmail !== undefined ? (updateFields.contactEmail || undefined) : existing.contactEmail,
        contactPhone: updateFields.contactPhone !== undefined ? (updateFields.contactPhone || undefined) : existing.contactPhone,
        communityLink: updateFields.communityLink !== undefined ? (updateFields.communityLink || undefined) : existing.communityLink,
        minTeamSize: updateFields.minTeamSize !== undefined ? (updateFields.minTeamSize || undefined) : existing.minTeamSize,
        maxTeamSize: updateFields.maxTeamSize !== undefined ? (updateFields.maxTeamSize || undefined) : existing.maxTeamSize,
        registrationForm: updateFields.registrationForm !== undefined ? (updateFields.registrationForm as any) : existing.registrationForm,
      };

      saveEvent(updatedPreview);
      revalidatePath("/events");
      revalidatePath(`/events/${id}`);
      return {
        success: true,
        data: updatedPreview,
        message: "[Preview Mode] Event updated in local store.",
      };
    }

    // Production Database Update
    const updated = await SketchRepository.updateEvent(id, {
      ...updateFields,
      posterUrl: updateFields.posterUrl || null,
      heroImage: updateFields.heroImage || null,
      directoryImage: updateFields.directoryImage || null,
    });

    await SketchRepository.logAudit({
      actorName: session.user.name,
      actorEmail: session.user.email,
      action: "EVENT_UPDATED",
      target: id,
      details: { updatedFields: Object.keys(updateFields) },
    });

    revalidatePath("/events");
    revalidatePath(`/events/${id}`);
    revalidatePath(`/e/${updated.slug}`);

    return {
      success: true,
      data: updated,
      message: `Event "${updated.title}" successfully updated.`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: "UPDATE_FAILED",
      message: err.message || "Failed to update event.",
    };
  }
}

/**
 * Set an event's lifecycle status (Draft -> Published -> Live -> Completed -> Archived)
 */
export async function setEventLifecycleAction(
  rawData: unknown
): Promise<ActionResult<EventItem>> {
  try {
    const session = await verifyAdminSession();
    if (!session.isAuthenticated || !session.user) {
      return {
        success: false,
        error: "UNAUTHORIZED",
        message: "You must be signed in as an administrator to change event lifecycle.",
      };
    }

    // Master Admin or Event Manager required for publishing/archiving
    if (!hasPermission(session.user.role, "events:publish")) {
      return {
        success: false,
        error: "FORBIDDEN",
        message: `Role "${session.user.role}" does not have permission to publish or archive events.`,
      };
    }

    const parseResult = SetLifecycleSchema.safeParse(rawData);
    if (!parseResult.success) {
      return {
        success: false,
        error: "VALIDATION_FAILED",
        message: "Invalid lifecycle parameters.",
      };
    }

    const { id, lifecycle } = parseResult.data;

    // Preview Mode handling
    if (session.isPreview && SketchRepository.isPreview()) {
      const allEvents = getStoredEvents();
      const existing = allEvents.find((e) => e.id === id);
      if (!existing) {
        return { success: false, error: "NOT_FOUND", message: `Event "${id}" not found.` };
      }

      const currentLifecycle = existing.lifecycle;
      if (currentLifecycle === lifecycle) {
        return { success: true, data: existing, message: `Event lifecycle is already "${lifecycle}".` };
      }

      if (lifecycle === "draft" && existing.registeredCount > 0) {
        return {
          success: false,
          error: "CANNOT_REVERT_TO_DRAFT",
          message: "Cannot revert an event to Draft once registrations have been recorded.",
        };
      }

      if ((currentLifecycle === "completed" || currentLifecycle === "archived") && (lifecycle === "draft" || lifecycle === "live")) {
        return {
          success: false,
          error: "TERMINAL_STATE",
          message: `Cannot transition event from terminal state "${currentLifecycle}" to "${lifecycle}".`,
        };
      }

      let nextRegState = existing.registrationState;
      if (lifecycle === "completed" || lifecycle === "archived") {
        nextRegState = "closed";
      }

      const updatedPreview: EventItem = {
        ...existing,
        lifecycle,
        registrationState: nextRegState,
      };

      saveEvent(updatedPreview);

      if (lifecycle === "completed") {
        const eventRounds = getStoredRounds(id);
        for (const r of eventRounds) {
          if (r.status === "in_progress") {
            saveRound({ ...r, status: "completed" });
          }
        }
      }

      revalidatePath("/events");
      revalidatePath(`/events/${id}`);
      revalidatePath("/rounds");
      return {
        success: true,
        data: updatedPreview,
        message: `[Preview Mode] Event lifecycle updated to "${lifecycle}".`,
      };
    }

    // Production Database Lifecycle Update
    const updated = await SketchRepository.setEventLifecycle(id, lifecycle);

    await SketchRepository.logAudit({
      actorName: session.user.name,
      actorEmail: session.user.email,
      action: "EVENT_LIFECYCLE_CHANGED",
      target: id,
      details: { newLifecycle: lifecycle },
    });

    revalidatePath("/events");
    revalidatePath(`/events/${id}`);
    revalidatePath("/rounds");
    revalidatePath(`/e/${updated.slug}`);

    return {
      success: true,
      data: updated,
      message: `Event "${updated.title}" lifecycle set to "${lifecycle}".`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: "LIFECYCLE_FAILED",
      message: err.message || "Failed to update event lifecycle.",
    };
  }
}
