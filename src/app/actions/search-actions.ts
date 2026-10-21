"use server";

import { z } from "zod";
import { verifyAdminSession } from "@/lib/auth/session";
import { SketchRepository } from "@/lib/supabase/repository";
import { ActionResult } from "@/app/actions/event-actions";

const GlobalSearchSchema = z.object({
  query: z
    .string()
    .trim()
    .min(2, "Search query must be at least 2 characters")
    .max(100, "Search query cannot exceed 100 characters"),
});

export interface SearchEventResult {
  id: string;
  title: string;
  slug: string;
  category: string;
  lifecycle: string;
  venue: string;
  startDate: string;
}

export interface SearchParticipantResult {
  id: string;
  registrationId: string;
  name: string;
  email: string;
  eventId: string;
  eventTitle: string;
  attendanceStatus: string;
  teamName?: string;
}

export interface SearchPassResult {
  id: string;
  registrationId: string;
  qrCredentialId: string;
  attendeeName: string;
  eventId: string;
  eventTitle: string;
  attendanceStatus: string;
}

export interface GlobalSearchOutput {
  events: SearchEventResult[];
  participants: SearchParticipantResult[];
  passes: SearchPassResult[];
  totalMatches: number;
}

/**
 * Server Action: Authoritative cross-entity search for organizers
 * Enforces admin authentication and returns bounded results for events, participants, and passes.
 */
export async function globalSearchAction(
  rawData: unknown
): Promise<ActionResult<GlobalSearchOutput>> {
  try {
    const session = await verifyAdminSession();
    if (!session.isAuthenticated || !session.user) {
      return {
        success: false,
        error: "UNAUTHORIZED",
        message: "You must be signed in as an administrator to use global search.",
      };
    }

    const parseResult = GlobalSearchSchema.safeParse(rawData);
    if (!parseResult.success) {
      return {
        success: false,
        error: "VALIDATION_FAILED",
        message: parseResult.error.issues[0]?.message || "Invalid search query.",
      };
    }

    const { query } = parseResult.data;
    const cleanQuery = query.toLowerCase();

    // Query events and participants concurrently via SketchRepository
    const [matchingEvents, matchingParticipants] = await Promise.all([
      SketchRepository.listEvents({ search: query }),
      SketchRepository.listParticipants({ search: query }),
    ]);

    // Format events (bounded to top 5)
    const events: SearchEventResult[] = matchingEvents.slice(0, 5).map((e) => ({
      id: e.id,
      title: e.title,
      slug: e.slug,
      category: e.category,
      lifecycle: e.lifecycle,
      venue: e.venue,
      startDate: e.startDate,
    }));

    // Format participants (bounded to top 5)
    const participants: SearchParticipantResult[] = matchingParticipants.slice(0, 5).map((p) => ({
      id: p.id,
      registrationId: p.registrationId,
      name: p.name,
      email: p.email,
      eventId: p.eventId,
      eventTitle: p.eventTitle,
      attendanceStatus: p.attendanceStatus,
      teamName: p.teamName,
    }));

    // Passes: participants where search term matches registrationId, qrCredentialId, or name (bounded to top 5)
    const passes: SearchPassResult[] = matchingParticipants
      .filter(
        (p) =>
          p.qrCredentialId?.toLowerCase().includes(cleanQuery) ||
          p.registrationId.toLowerCase().includes(cleanQuery)
      )
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        registrationId: p.registrationId,
        qrCredentialId: p.qrCredentialId,
        attendeeName: p.name,
        eventId: p.eventId,
        eventTitle: p.eventTitle,
        attendanceStatus: p.attendanceStatus,
      }));

    const totalMatches = events.length + participants.length + passes.length;

    return {
      success: true,
      data: {
        events,
        participants,
        passes,
        totalMatches,
      },
      message: `Found ${totalMatches} matching results.`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Search query failed";
    console.error("[globalSearchAction] Unexpected failure:", { message });
    return {
      success: false,
      error: "SEARCH_FAILED",
      message: "An unexpected error occurred while executing search.",
    };
  }
}
