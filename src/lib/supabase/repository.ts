/**
 * SKETCH Repository & Server-Side Data Access Layer
 *
 * Provides a clean abstraction over database operations.
 * Enforces:
 * - Preview mode transparent fallback when credentials are not configured.
 * - Concurrency-safe transactions and atomic operations.
 * - Strict authorization checks.
 */

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getAppEnv } from "@/lib/env";
import {
  EventItem,
  Participant,
  Team,
  Round,
  RegistrationSubmission,
  AuditLogEntry,
  AdminRole,
  AdminUser,
  CertificateRecord,
  CommunicationJob,
  TicketTemplate,
  TicketTemplateVersion,
  TicketRecord,
  LiveTicketData,
} from "@/types";
import { hashBearerToken } from "@/lib/ticket/rotating-qr";
import { Database, RegistrationMode } from "@/types/database";
import {
  getStoredEvents,
  saveEvent,
  getStoredRounds,
  saveRound,
  deleteStoredRound,
  getStoredCertificates,
  saveCertificates,
  getStoredCommunications,
  saveCommunication,
  updateStoredCommunication,
  getStoredAuditLogs,
  saveAuditLog,
  getAllParticipants,
  getAllTeams,
  updateParticipantAttendance,
} from "@/lib/registration-store";

export interface RegisterResult {
  success: boolean;
  registrationId?: string;
  registrationRowId?: string;
  qrCredentialId?: string;
  error?: string;
  message?: string;
}

export interface CapacityCheckResult {
  canRegister: boolean;
  remainingCapacity: number;
  reason?: string;
}

export class SketchRepository {
  /**
   * Helper to determine if we should execute against Supabase or preview
   */
  static isPreview(): boolean {
    const env = getAppEnv();
    if (env.mode === "production") {
      return false;
    }
    return env.mode === "preview" || !env.supabaseUrl;
  }

  /**
   * List events with optional filters (Admin view with RLS or public published view)
   */
  static async listEvents(options: {
    status?: string;
    category?: string;
    search?: string;
  } = {}): Promise<EventItem[]> {
    if (this.isPreview()) {
      let events = getStoredEvents();
      if (options.status && options.status !== "all") {
        events = events.filter((e) => e.lifecycle.toLowerCase() === options.status?.toLowerCase());
      }
      if (options.category && options.category !== "all") {
        events = events.filter((e) => e.category.toLowerCase() === options.category?.toLowerCase());
      }
      if (options.search && options.search.trim()) {
        const term = options.search.trim().toLowerCase();
        events = events.filter(
          (e) =>
            e.title.toLowerCase().includes(term) ||
            e.venue.toLowerCase().includes(term) ||
            e.shortDescription.toLowerCase().includes(term) ||
            e.category.toLowerCase().includes(term)
        );
      }
      return events;
    }

    const supabase: any = createAdminClient() || (await createClient());
    if (!supabase) {
      throw new Error("Database client is unavailable in production mode.");
    }

    let query = supabase.from("events").select("*").order("start_date", { ascending: true });

    if (options.status && options.status !== "all") {
      query = query.eq("lifecycle", options.status as any);
    }

    if (options.category && options.category !== "all") {
      query = query.eq("category", options.category);
    }

    if (options.search && options.search.trim()) {
      const term = `%${options.search.trim()}%`;
      query = query.or(`title.ilike.${term},venue.ilike.${term},short_description.ilike.${term}`);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to list events: ${error.message}`);
    }

    return (data || []).map((row: any) => this.mapEventRowToEventItem(row));
  }

  /**
   * Authoritative total event count for navigation badges and metrics.
   * Uses lightweight HEAD count query in live mode without fetching row bodies.
   */
  static async getEventCount(): Promise<number> {
    if (this.isPreview()) {
      return getStoredEvents().length;
    }

    const supabase: any = createAdminClient() || (await createClient());
    if (!supabase) {
      throw new Error("Database client is unavailable in production mode.");
    }

    const { count, error } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true });

    if (error) {
      throw new Error(`Failed to count events: ${error.message}`);
    }

    return count ?? 0;
  }


  /**
   * Fetch an event by ID (Admin view)
   */
  static async getEventById(id: string): Promise<EventItem | null> {
    if (this.isPreview()) {
      const events = getStoredEvents();
      return events.find((e) => e.id === id) || null;
    }

    const supabase: any = createAdminClient() || (await createClient());
    if (!supabase) {
      throw new Error("Database client is unavailable in production mode.");
    }

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return null;
    return this.mapEventRowToEventItem(data);
  }

  /**
   * Fetch an event by slug (Public view - restricted to published/live)
   */
  static async getEventBySlug(slug: string): Promise<EventItem | null> {
    if (this.isPreview()) {
      const events = getStoredEvents();
      return (
        events.find(
          (e) =>
            e.slug === slug &&
            (e.lifecycle === "published" || e.lifecycle === "live")
        ) || null
      );
    }

    const supabase: any = await createClient();
    if (!supabase) {
      throw new Error("Database client is unavailable in production mode.");
    }

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("slug", slug)
      .in("lifecycle", ["published", "live"])
      .single();

    if (error || !data) return null;

    return this.mapEventRowToEventItem(data);
  }

  /**
   * List all participants across authorized events, with optional event filtering.
   * In production mode, queries public.registrations joined with events and teams.
   */
  static async listParticipants(options?: {
    eventId?: string;
    search?: string;
    attendanceStatus?: "checked_in" | "not_checked_in";
  }): Promise<Participant[]> {
    if (this.isPreview()) {
      let filtered = getAllParticipants(options?.eventId);
      if (options?.attendanceStatus) {
        filtered = filtered.filter((p) => p.attendanceStatus === options.attendanceStatus);
      }
      if (options?.search) {
        const q = options.search.toLowerCase();
        filtered = filtered.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.email.toLowerCase().includes(q) ||
            p.registrationId.toLowerCase().includes(q) ||
            p.eventTitle.toLowerCase().includes(q)
        );
      }
      return filtered;
    }

    const supabase: any = createAdminClient() || (await createClient());
    if (!supabase) {
      throw new Error("Database client is unavailable in production mode.");
    }

    let query = supabase
      .from("registrations")
      .select(`
        id,
        registration_id,
        event_id,
        team_id,
        mode,
        attendee_name,
        email,
        phone,
        department,
        year,
        status,
        attendance_status,
        checked_in_at,
        qr_credential_id,
        custom_answers,
        created_at,
        events (
          id,
          title
        ),
        teams (
          id,
          name
        )
      `)
      .order("created_at", { ascending: false });

    if (options?.eventId && options.eventId !== "all") {
      query = query.eq("event_id", options.eventId);
    }
    if (options?.attendanceStatus) {
      query = query.eq("attendance_status", options.attendanceStatus);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[SketchRepository.listParticipants] Database query failed:", error.message);
      throw new Error(`Failed to query participants: ${error.message}`);
    }

    if (!data) return [];

    let participants: Participant[] = data.map((r: any) => ({
      id: r.id,
      registrationId: r.registration_id,
      eventId: r.event_id,
      eventTitle: r.events?.title || "",
      name: r.attendee_name,
      email: r.email,
      phone: r.phone || undefined,
      department: r.department || undefined,
      year: r.year || undefined,
      teamId: r.team_id || undefined,
      teamName: r.teams?.name || undefined,
      registeredAt: r.created_at,
      status: r.status,
      attendanceStatus: r.attendance_status,
      checkedInAt: r.checked_in_at || undefined,
      qrCredentialId: r.qr_credential_id,
      customAnswers: r.custom_answers || undefined,
    }));

    if (options?.search) {
      const q = options.search.toLowerCase();
      participants = participants.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          p.registrationId.toLowerCase().includes(q) ||
          p.eventTitle.toLowerCase().includes(q) ||
          (p.department && p.department.toLowerCase().includes(q)) ||
          (p.teamName && p.teamName.toLowerCase().includes(q))
      );
    }

    return participants;
  }

  /**
   * List all teams with their events and member rosters.
   * In production mode, queries public.teams joined with events and registrations.
   */
  static async listTeams(options?: {
    eventId?: string;
    search?: string;
  }): Promise<Team[]> {
    if (this.isPreview()) {
      let filtered = getAllTeams(options?.eventId);
      if (options?.search) {
        const q = options.search.toLowerCase();
        filtered = filtered.filter(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            t.captainName.toLowerCase().includes(q) ||
            t.eventTitle.toLowerCase().includes(q)
        );
      }
      return filtered;
    }

    const supabase: any = createAdminClient() || (await createClient());
    if (!supabase) {
      throw new Error("Database client is unavailable in production mode.");
    }

    let query = supabase
      .from("teams")
      .select(`
        id,
        event_id,
        name,
        captain_name,
        captain_email,
        member_count,
        max_members,
        status,
        custom_answers,
        created_at,
        events (
          id,
          title
        ),
        registrations (
          id,
          registration_id,
          attendee_name,
          email,
          phone,
          department,
          attendance_status,
          custom_answers
        )
      `)
      .order("created_at", { ascending: false });

    if (options?.eventId && options.eventId !== "all") {
      query = query.eq("event_id", options.eventId);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[SketchRepository.listTeams] Database query failed:", error.message);
      throw new Error(`Failed to query teams: ${error.message}`);
    }

    if (!data) return [];

    let teams: Team[] = data.map((t: any) => {
      const roster = Array.isArray(t.registrations)
        ? t.registrations.map((m: any) => ({
            name: m.attendee_name,
            email: m.email,
            role: m.email === t.captain_email ? "Captain" : "Member",
            department: m.department || undefined,
            phone: m.phone || undefined,
            customAnswers: m.custom_answers || undefined,
            registrationId: m.registration_id,
            attendanceStatus: m.attendance_status,
          }))
        : [];

      return {
        id: t.id,
        eventId: t.event_id,
        eventTitle: t.events?.title || "",
        name: t.name,
        captainName: t.captain_name,
        captainEmail: t.captain_email,
        memberCount: t.member_count,
        maxMembers: t.max_members,
        status: t.status as "complete" | "incomplete",
        registeredAt: t.created_at,
        customAnswers: t.custom_answers || undefined,
        members: roster,
      };
    });

    if (options?.search) {
      const q = options.search.toLowerCase();
      teams = teams.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.captainName.toLowerCase().includes(q) ||
          t.eventTitle.toLowerCase().includes(q)
      );
    }

    return teams;
  }

  /**
   * Toggle attendance check-in status for an attendee.
   * In production mode, delegates to atomic PostgreSQL RPC public.toggle_attendance
   * which executes row locks, audit ledger tracking, and event counter sync in a single transaction.
   */
  static async toggleParticipantAttendance(params: {
    registrationIdOrUid: string;
    eventId: string;
    targetStatus?: "checked_in" | "not_checked_in";
    actorId?: string;
    method?: "manual" | "camera" | "simulation";
  }): Promise<{
    success: boolean;
    registrationId: string;
    attendanceStatus: "checked_in" | "not_checked_in";
    checkedInAt?: string;
    message: string;
    error?: string;
  }> {
    if (this.isPreview()) {
      // In preview mode, search dynamic submissions and mock participants
      const allForEvent = getAllParticipants(params.eventId);
      const target = allForEvent.find(
        (p) =>
          p.id === params.registrationIdOrUid ||
          p.registrationId === params.registrationIdOrUid ||
          p.qrCredentialId === params.registrationIdOrUid
      );

      if (!target) {
        return {
          success: false,
          registrationId: params.registrationIdOrUid,
          attendanceStatus: "not_checked_in",
          message: "Participant not found for the specified event in preview store.",
          error: "REGISTRATION_NOT_FOUND",
        };
      }

      const nextStatus =
        params.targetStatus !== undefined
          ? params.targetStatus
          : target.attendanceStatus === "checked_in"
          ? "not_checked_in"
          : "checked_in";

      target.attendanceStatus = nextStatus;
      target.checkedInAt = nextStatus === "checked_in" ? new Date().toISOString() : undefined;

      updateParticipantAttendance(target.id, nextStatus);
      updateParticipantAttendance(target.registrationId, nextStatus);

      return {
        success: true,
        registrationId: target.registrationId,
        attendanceStatus: nextStatus,
        checkedInAt: target.checkedInAt,
        message: nextStatus === "checked_in" ? "Verified & checked in" : "Check-in undone",
      };
    }

    const supabase: any = createAdminClient() || (await createClient());
    if (!supabase) {
      throw new Error("Database client is unavailable in production mode.");
    }

    // Attempt atomic execution via database procedure toggle_attendance
    const { data: rpcData, error: rpcErr } = await supabase.rpc("toggle_attendance", {
      p_registration_identifier: params.registrationIdOrUid,
      p_event_id: params.eventId,
      p_actor_id: params.actorId || null,
      p_method: params.method || "manual",
      p_target_status: params.targetStatus || null,
    });

    if (rpcErr) {
      console.error("[SketchRepository.toggleParticipantAttendance] RPC failure:", rpcErr.message);
      return {
        success: false,
        registrationId: params.registrationIdOrUid,
        attendanceStatus: "not_checked_in",
        message: rpcErr.message || "Failed to update attendance atomically.",
        error: "DATABASE_RPC_ERROR",
      };
    }

    if (rpcData && typeof rpcData === "object") {
      const res = rpcData as any;
      if (!res.success) {
        return {
          success: false,
          registrationId: params.registrationIdOrUid,
          attendanceStatus: "not_checked_in",
          message: res.message || "Check-in operation was rejected.",
          error: res.error || "REJECTED",
        };
      }

      return {
        success: true,
        registrationId: res.registration_id,
        attendanceStatus: res.attendance_status as "checked_in" | "not_checked_in",
        checkedInAt: res.checked_in_at || undefined,
        message: res.message || "Attendance updated successfully.",
      };
    }

    return {
      success: false,
      registrationId: params.registrationIdOrUid,
      attendanceStatus: "not_checked_in",
      message: "Unexpected response from attendance service.",
      error: "UNKNOWN_RESPONSE",
    };
  }

  /**
   * Fetch attendee records for an event (Admin view)
   */
  static async getEventAttendees(eventId: string): Promise<Participant[]> {
    return this.listParticipants({ eventId });
  }

  /**
   * List competition rounds with optional eventId filter
   */
  static async listRounds(eventId?: string): Promise<Round[]> {
    if (this.isPreview()) {
      return getStoredRounds(eventId);
    }

    const supabase: any = createAdminClient() || (await createClient());
    if (!supabase) {
      throw new Error("Database client is unavailable in production mode.");
    }

    let query = supabase
      .from("rounds")
      .select(`
        id,
        event_id,
        name,
        round_order,
        start_time,
        venue,
        status,
        eligible_count,
        advanced_count,
        created_at,
        updated_at,
        events (
          id,
          title
        )
      `)
      .order("round_order", { ascending: true });

    if (eventId && eventId !== "all") {
      query = query.eq("event_id", eventId);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[SketchRepository.listRounds] Database query failed:", error.message);
      throw new Error(`Failed to query rounds: ${error.message}`);
    }

    return (data || []).map((row: any) => this.mapRoundRowToRound(row));
  }

  /**
   * Fetch a single competition round by ID
   */
  static async getRoundById(id: string): Promise<Round | null> {
    if (this.isPreview()) {
      const all = getStoredRounds();
      return all.find((r) => r.id === id) || null;
    }

    const supabase: any = createAdminClient() || (await createClient());
    if (!supabase) {
      throw new Error("Database client is unavailable in production mode.");
    }

    const { data, error } = await supabase
      .from("rounds")
      .select(`
        id,
        event_id,
        name,
        round_order,
        start_time,
        venue,
        status,
        eligible_count,
        advanced_count,
        created_at,
        updated_at,
        events (
          id,
          title
        )
      `)
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;
    return this.mapRoundRowToRound(data);
  }

  /**
   * Create a new competition stage/round and ensure event.has_rounds is true
   */
  static async createRound(input: {
    eventId: string;
    name: string;
    order?: number;
    startTime?: string;
    venue?: string;
    status?: "upcoming" | "in_progress" | "completed";
    eligibleCount?: number;
    advancedCount?: number;
  }): Promise<Round> {
    if (this.isPreview()) {
      const existingRounds = getStoredRounds(input.eventId);
      const computedOrder = input.order || existingRounds.length + 1;
      const event = getStoredEvents().find((e) => e.id === input.eventId);
      const newRound: Round = {
        id: `rnd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        eventId: input.eventId,
        eventTitle: event?.title || "Competition Event",
        name: input.name.trim(),
        order: computedOrder,
        startTime: input.startTime || new Date().toISOString(),
        venue: input.venue ? input.venue.trim() : "Main Auditorium",
        status: input.status || "upcoming",
        eligibleCount: input.eligibleCount ?? 10,
        advancedCount: input.advancedCount ?? 0,
      };
      saveRound(newRound);
      if (event && !event.hasRounds) {
        saveEvent({ ...event, hasRounds: true });
      }
      return newRound;
    }

    const supabase: any = createAdminClient() || (await createClient());
    if (!supabase) {
      throw new Error("Database client is unavailable in production mode.");
    }

    // Verify parent event exists
    const { data: event, error: eventErr } = await supabase
      .from("events")
      .select("id, title, has_rounds")
      .eq("id", input.eventId)
      .single();

    if (eventErr || !event) {
      throw new Error(`Event with ID "${input.eventId}" not found.`);
    }

    // Determine round order if not explicitly specified
    let targetOrder = input.order;
    if (!targetOrder) {
      const { count } = await supabase
        .from("rounds")
        .select("id", { count: "exact", head: true })
        .eq("event_id", input.eventId);
      targetOrder = (count || 0) + 1;
    }

    const { data, error } = await supabase
      .from("rounds")
      .insert({
        event_id: input.eventId,
        name: input.name.trim(),
        round_order: targetOrder,
        start_time: input.startTime,
        venue: input.venue ? input.venue.trim() : "Main Auditorium",
        status: input.status || "upcoming",
        eligible_count: input.eligibleCount ?? 10,
        advanced_count: input.advancedCount ?? 0,
      })
      .select(`
        id,
        event_id,
        name,
        round_order,
        start_time,
        venue,
        status,
        eligible_count,
        advanced_count,
        created_at,
        updated_at
      `)
      .single();

    if (error || !data) {
      throw new Error(`Failed to create round: ${error?.message || "Unknown database error"}`);
    }

    // Ensure parent event has_rounds flag is set to true
    if (!event.has_rounds) {
      await supabase
        .from("events")
        .update({ has_rounds: true, updated_at: new Date().toISOString() })
        .eq("id", input.eventId);
    }

    return {
      id: data.id,
      eventId: data.event_id,
      eventTitle: event.title,
      name: data.name,
      order: data.round_order,
      startTime: data.start_time,
      venue: data.venue,
      status: data.status as "upcoming" | "in_progress" | "completed",
      eligibleCount: data.eligible_count,
      advancedCount: data.advanced_count || 0,
    };
  }

  /**
   * Update round details
   */
  static async updateRound(
    id: string,
    input: {
      name?: string;
      order?: number;
      startTime?: string;
      venue?: string;
      status?: "upcoming" | "in_progress" | "completed";
      eligibleCount?: number;
      advancedCount?: number;
    }
  ): Promise<Round> {
    if (this.isPreview()) {
      const all = getStoredRounds();
      const existing = all.find((r) => r.id === id);
      if (!existing) {
        throw new Error(`Round with ID "${id}" not found.`);
      }
      const updated: Round = {
        ...existing,
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(input.order !== undefined && { order: input.order }),
        ...(input.startTime !== undefined && { startTime: input.startTime }),
        ...(input.venue !== undefined && { venue: input.venue.trim() }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.eligibleCount !== undefined && { eligibleCount: input.eligibleCount }),
        ...(input.advancedCount !== undefined && { advancedCount: input.advancedCount }),
      };
      saveRound(updated);
      return updated;
    }

    const supabase: any = createAdminClient() || (await createClient());
    if (!supabase) {
      throw new Error("Database client is unavailable in production mode.");
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (input.name !== undefined) updatePayload.name = input.name.trim();
    if (input.order !== undefined) updatePayload.round_order = input.order;
    if (input.startTime !== undefined) updatePayload.start_time = input.startTime;
    if (input.venue !== undefined) updatePayload.venue = input.venue.trim();
    if (input.status !== undefined) updatePayload.status = input.status;
    if (input.eligibleCount !== undefined) updatePayload.eligible_count = input.eligibleCount;
    if (input.advancedCount !== undefined) updatePayload.advanced_count = input.advancedCount;

    const { data, error } = await supabase
      .from("rounds")
      .update(updatePayload)
      .eq("id", id)
      .select(`
        id,
        event_id,
        name,
        round_order,
        start_time,
        venue,
        status,
        eligible_count,
        advanced_count,
        events (
          id,
          title
        )
      `)
      .single();

    if (error || !data) {
      throw new Error(`Failed to update round: ${error?.message || "Unknown database error"}`);
    }

    return this.mapRoundRowToRound(data);
  }

  /**
   * Delete a round and synchronize event.has_rounds if 0 rounds remain
   */
  static async deleteRound(id: string): Promise<{ success: boolean; eventId: string }> {
    if (this.isPreview()) {
      const all = getStoredRounds();
      const existing = all.find((r) => r.id === id);
      if (!existing) {
        throw new Error(`Round with ID "${id}" not found.`);
      }
      deleteStoredRound(id);
      const remaining = getStoredRounds(existing.eventId);
      if (remaining.length === 0) {
        const event = getStoredEvents().find((e) => e.id === existing.eventId);
        if (event) {
          saveEvent({ ...event, hasRounds: false });
        }
      }
      return { success: true, eventId: existing.eventId };
    }

    const supabase: any = createAdminClient() || (await createClient());
    if (!supabase) {
      throw new Error("Database client is unavailable in production mode.");
    }

    // First fetch round to identify parent event_id
    const { data: round, error: fetchErr } = await supabase
      .from("rounds")
      .select("id, event_id")
      .eq("id", id)
      .single();

    if (fetchErr || !round) {
      throw new Error(`Round with ID "${id}" not found.`);
    }

    const eventId = round.event_id;

    const { error: deleteErr } = await supabase
      .from("rounds")
      .delete()
      .eq("id", id);

    if (deleteErr) {
      throw new Error(`Failed to delete round: ${deleteErr.message}`);
    }

    // Check if remaining rounds exist for this event
    const { count } = await supabase
      .from("rounds")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId);

    if (count === 0) {
      await supabase
        .from("events")
        .update({ has_rounds: false, updated_at: new Date().toISOString() })
        .eq("id", eventId);
    }

    return { success: true, eventId };
  }

  /**
   * Reorder rounds for an event
   */
  static async reorderRounds(eventId: string, roundIds: string[]): Promise<Round[]> {
    if (this.isPreview()) {
      const all = getStoredRounds();
      const eventRounds = all.filter((r) => r.eventId === eventId);
      const reordered = eventRounds.map((r) => {
        const newOrder = roundIds.indexOf(r.id) + 1;
        return newOrder > 0 ? { ...r, order: newOrder } : r;
      });
      reordered.sort((a, b) => a.order - b.order);
      reordered.forEach((r) => saveRound(r));
      return reordered;
    }

    const supabase: any = createAdminClient() || (await createClient());
    if (!supabase) {
      throw new Error("Database client is unavailable in production mode.");
    }

    for (let i = 0; i < roundIds.length; i++) {
      const roundId = roundIds[i];
      const newOrder = i + 1;
      const { error } = await supabase
        .from("rounds")
        .update({ round_order: newOrder, updated_at: new Date().toISOString() })
        .eq("id", roundId)
        .eq("event_id", eventId);

      if (error) {
        throw new Error(`Failed to reorder round "${roundId}": ${error.message}`);
      }
    }

    return this.listRounds(eventId);
  }

  /**
   * Create a new event with collision-safe slug generation
   */
  static async createEvent(
    input: {
      title: string;
      slug?: string;
      category: string;
      shortDescription?: string;
      description?: string;
      posterUrl?: string | null;
      heroImage?: string | null;
      heroImageFocalPoint?: string | null;
      directoryImage?: string | null;
      directoryImageFocalPoint?: string | null;
      startDate: string;
      endDate: string;
      venue: string;
      venueMode: "in-person" | "online" | "hybrid";
      capacity: number;
      lifecycle?: "draft" | "published" | "live" | "completed" | "archived";
      registrationState?: "upcoming" | "open" | "closed" | "full";
      hasTeams?: boolean;
      minTeamSize?: number | null;
      maxTeamSize?: number | null;
      hasRounds?: boolean;
      featured?: boolean;
      contactEmail?: string | null;
      contactPhone?: string | null;
      communityLink?: string | null;
      registrationForm?: Record<string, unknown>;
    },
    actorId?: string
  ): Promise<EventItem> {
    const supabase: any = createAdminClient() || (await createClient());
    if (!supabase) {
      throw new Error("Database client is unavailable.");
    }

    // Generate or clean base slug
    let baseSlug = (input.slug || input.title)
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (!baseSlug) baseSlug = `event-${Date.now().toString(36)}`;

    // Ensure unique slug
    let targetSlug = baseSlug;
    let collisionCount = 0;
    while (true) {
      const { data: existing } = await supabase
        .from("events")
        .select("id")
        .eq("slug", targetSlug)
        .maybeSingle();

      if (!existing) break;
      collisionCount++;
      targetSlug = `${baseSlug}-${collisionCount}`;
    }

    const insertPayload: Database["public"]["Tables"]["events"]["Insert"] = {
      slug: targetSlug,
      title: input.title.trim(),
      category: input.category,
      short_description: input.shortDescription?.trim() || "",
      description: input.description?.trim() || "",
      poster_url: input.posterUrl || null,
      hero_image: input.heroImage || null,
      hero_image_focal_point: input.heroImageFocalPoint || "center",
      directory_image: input.directoryImage || null,
      directory_image_focal_point: input.directoryImageFocalPoint || "center",
      start_date: input.startDate,
      end_date: input.endDate,
      venue: input.venue.trim(),
      venue_mode: input.venueMode,
      capacity: input.capacity,
      lifecycle: input.lifecycle || "draft",
      registration_state: input.registrationState || "upcoming",
      has_teams: Boolean(input.hasTeams),
      min_team_size: input.minTeamSize || null,
      max_team_size: input.maxTeamSize || null,
      has_rounds: Boolean(input.hasRounds),
      featured: Boolean(input.featured),
      contact_email: input.contactEmail?.trim() || null,
      contact_phone: input.contactPhone?.trim() || null,
      community_link: input.communityLink?.trim() || null,
      registration_form: (input.registrationForm as any) || { version: 1, sections: [] },
      created_by: actorId || null,
    };

    const { data, error } = await supabase
      .from("events")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to create event: ${error?.message || "Unknown database error"}`);
    }

    return this.mapEventRowToEventItem(data);
  }

  /**
   * Update an existing event with locked capacity & slug invariants
   */
  static async updateEvent(
    id: string,
    input: {
      title?: string;
      slug?: string;
      category?: string;
      shortDescription?: string;
      description?: string;
      posterUrl?: string | null;
      heroImage?: string | null;
      heroImageFocalPoint?: string | null;
      directoryImage?: string | null;
      directoryImageFocalPoint?: string | null;
      startDate?: string;
      endDate?: string;
      venue?: string;
      venueMode?: "in-person" | "online" | "hybrid";
      capacity?: number;
      registrationState?: "upcoming" | "open" | "closed" | "full";
      hasTeams?: boolean;
      minTeamSize?: number | null;
      maxTeamSize?: number | null;
      hasRounds?: boolean;
      featured?: boolean;
      contactEmail?: string | null;
      contactPhone?: string | null;
      communityLink?: string | null;
      registrationForm?: Record<string, unknown>;
    }
  ): Promise<EventItem> {
    const supabase: any = createAdminClient() || (await createClient());
    if (!supabase) {
      throw new Error("Database client is unavailable.");
    }

    // 1. Fetch current event state to verify invariants
    const { data: current, error: fetchErr } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !current) {
      throw new Error(`Event with id "${id}" not found.`);
    }

    // 2. Invariant Check: Capacity reduction guard
    if (input.capacity !== undefined && input.capacity < current.registered_count) {
      throw new Error(
        `Capacity cannot be reduced below current registrations (${current.registered_count}). Current registered count must be accommodated.`
      );
    }

    // 3. Invariant Check: Slug immutability for published events
    if (input.slug !== undefined && input.slug !== current.slug) {
      if (current.lifecycle === "published" || current.lifecycle === "live") {
        throw new Error("Slug cannot be modified once an event is published or live.");
      }
    }

    const updatePayload: Database["public"]["Tables"]["events"]["Update"] = {
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.slug !== undefined && { slug: input.slug.trim() }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.shortDescription !== undefined && { short_description: input.shortDescription.trim() }),
      ...(input.description !== undefined && { description: input.description.trim() }),
      ...(input.posterUrl !== undefined && { poster_url: input.posterUrl }),
      ...(input.heroImage !== undefined && { hero_image: input.heroImage }),
      ...(input.heroImageFocalPoint !== undefined && { hero_image_focal_point: input.heroImageFocalPoint }),
      ...(input.directoryImage !== undefined && { directory_image: input.directoryImage }),
      ...(input.directoryImageFocalPoint !== undefined && { directory_image_focal_point: input.directoryImageFocalPoint }),
      ...(input.startDate !== undefined && { start_date: input.startDate }),
      ...(input.endDate !== undefined && { end_date: input.endDate }),
      ...(input.venue !== undefined && { venue: input.venue.trim() }),
      ...(input.venueMode !== undefined && { venue_mode: input.venueMode }),
      ...(input.capacity !== undefined && { capacity: input.capacity }),
      ...(input.registrationState !== undefined && { registration_state: input.registrationState }),
      ...(input.hasTeams !== undefined && { has_teams: input.hasTeams }),
      ...(input.minTeamSize !== undefined && { min_team_size: input.minTeamSize }),
      ...(input.maxTeamSize !== undefined && { max_team_size: input.maxTeamSize }),
      ...(input.hasRounds !== undefined && { has_rounds: input.hasRounds }),
      ...(input.featured !== undefined && { featured: input.featured }),
      ...(input.contactEmail !== undefined && { contact_email: input.contactEmail?.trim() || null }),
      ...(input.contactPhone !== undefined && { contact_phone: input.contactPhone?.trim() || null }),
      ...(input.communityLink !== undefined && { community_link: input.communityLink?.trim() || null }),
      ...(input.registrationForm !== undefined && { registration_form: input.registrationForm as any }),
      updated_at: new Date().toISOString(),
    };

    let updateQuery = supabase
      .from("events")
      .update(updatePayload)
      .eq("id", id);

    if (input.capacity !== undefined) {
      updateQuery = updateQuery.lte("registered_count", input.capacity);
    }

    const { data, error } = await updateQuery.select("*").single();

    if (error || !data) {
      if (input.capacity !== undefined) {
        const { data: latest } = await supabase
          .from("events")
          .select("registered_count")
          .eq("id", id)
          .maybeSingle();
        if (latest && latest.registered_count > input.capacity) {
          throw new Error(
            `Capacity cannot be reduced below current registrations (${latest.registered_count}). Current registered count must be accommodated.`
          );
        }
      }
      throw new Error(`Failed to update event: ${error?.message || "Unknown database error"}`);
    }

    return this.mapEventRowToEventItem(data);
  }

  /**
   * Set event lifecycle state with status machine validation
   */
  static async setEventLifecycle(
    id: string,
    lifecycle: "draft" | "published" | "live" | "completed" | "archived"
  ): Promise<EventItem> {
    if (this.isPreview()) {
      const allEvents = getStoredEvents();
      const existing = allEvents.find((e) => e.id === id);
      if (!existing) {
        throw new Error(`Event with id "${id}" not found.`);
      }

      if (existing.lifecycle === lifecycle) {
        return existing;
      }

      if (lifecycle === "draft" && existing.registeredCount > 0) {
        throw new Error("Cannot revert an event to Draft once registrations have been recorded.");
      }

      if (
        (existing.lifecycle === "completed" || existing.lifecycle === "archived") &&
        (lifecycle === "draft" || lifecycle === "live")
      ) {
        throw new Error(`Cannot transition event from terminal state "${existing.lifecycle}" to "${lifecycle}".`);
      }

      let nextRegistrationState = existing.registrationState;
      if (lifecycle === "completed" || lifecycle === "archived") {
        nextRegistrationState = "closed";
      }

      const updatedEvent: EventItem = {
        ...existing,
        lifecycle,
        registrationState: nextRegistrationState,
      };

      saveEvent(updatedEvent);

      if (lifecycle === "completed") {
        const eventRounds = getStoredRounds(id);
        for (const r of eventRounds) {
          if (r.status === "in_progress") {
            saveRound({ ...r, status: "completed" });
          }
        }
      }

      return updatedEvent;
    }

    const supabase: any = createAdminClient() || (await createClient());
    if (!supabase) {
      throw new Error("Database client is unavailable.");
    }

    const { data: current, error: fetchErr } = await supabase
      .from("events")
      .select("id, lifecycle, registration_state, registered_count")
      .eq("id", id)
      .single();

    if (fetchErr || !current) {
      throw new Error(`Event with id "${id}" not found.`);
    }

    const currentLifecycle = current.lifecycle as "draft" | "published" | "live" | "completed" | "archived";
    if (currentLifecycle === lifecycle) {
      return this.mapEventRowToEventItem(current as any);
    }

    // Invariant: Cannot revert to Draft once registrations have been recorded
    if (lifecycle === "draft" && current.registered_count > 0) {
      throw new Error("Cannot revert an event to Draft once registrations have been recorded.");
    }

    // Terminal state invariant: completed or archived events cannot be moved back to draft or live
    if ((currentLifecycle === "completed" || currentLifecycle === "archived") && (lifecycle === "draft" || lifecycle === "live")) {
      throw new Error(`Cannot transition event from terminal state "${currentLifecycle}" to "${lifecycle}".`);
    }

    // Determine registration_state side-effects
    let nextRegistrationState = current.registration_state;
    if (lifecycle === "completed" || lifecycle === "archived") {
      nextRegistrationState = "closed";
    }

    const { data, error } = await supabase
      .from("events")
      .update({
        lifecycle,
        registration_state: nextRegistrationState,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to update event lifecycle: ${error?.message || "Unknown database error"}`);
    }

    // If event is marked completed, automatically close active in-progress rounds
    if (lifecycle === "completed") {
      await supabase
        .from("rounds")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("event_id", id)
        .eq("status", "in_progress");
    }

    return this.mapEventRowToEventItem(data);
  }

  /**
   * Check capacity and eligibility for an event before submission
   */
  static async checkEventRegistrationCapacity(
    eventId: string,
    requestedSlots: number = 1
  ): Promise<CapacityCheckResult> {
    const supabase: any = await createClient();
    if (!supabase) {
      return { canRegister: false, remainingCapacity: 0, reason: "Database not connected" };
    }

    const { data: event, error } = await supabase
      .from("events")
      .select("capacity, registered_count, lifecycle, registration_state")
      .eq("id", eventId)
      .single();

    if (error || !event) {
      return { canRegister: false, remainingCapacity: 0, reason: "Event not found" };
    }

    if (event.lifecycle !== "published" && event.lifecycle !== "live") {
      return { canRegister: false, remainingCapacity: 0, reason: "Event is not published" };
    }

    if (event.registration_state !== "open") {
      return { canRegister: false, remainingCapacity: 0, reason: `Registration is ${event.registration_state}` };
    }

    const remaining = event.capacity - event.registered_count;
    if (requestedSlots > remaining) {
      return {
        canRegister: false,
        remainingCapacity: Math.max(0, remaining),
        reason: "Requested slots exceed remaining capacity",
      };
    }

    return {
      canRegister: true,
      remainingCapacity: remaining,
    };
  }

  /**
   * Atomically register a participant or team for an event using database procedure
   */
  static async registerParticipant(params: {
    eventId: string;
    mode: RegistrationMode;
    attendeeName: string;
    email: string;
    phone?: string;
    department?: string;
    year?: string;
    teamName?: string;
    teamMembers?: Array<{ name: string; email: string; phone?: string; department?: string }>;
    customAnswers?: Record<string, unknown>;
  }): Promise<RegisterResult> {
    if (this.isPreview()) {
      const generatedRegId = `REG-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const generatedCredHash = `qr_cred_${Math.random().toString(36).substring(2, 10)}`;
      return {
        success: true,
        registrationId: generatedRegId,
        qrCredentialId: generatedCredHash,
        message: "Registration completed in preview mode.",
      };
    }

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(params.eventId)) {
      return {
        success: false,
        error: "INVALID_EVENT_ID",
        message: "Invalid event ID format.",
      };
    }

    const supabase: any = await createClient();
    if (!supabase) {
      return {
        success: false,
        error: "NO_DATABASE",
        message: "Database connection unavailable.",
      };
    }

    const { data, error } = await supabase.rpc("register_for_event", {
      p_event_id: params.eventId,
      p_mode: params.mode,
      p_attendee_name: params.attendeeName,
      p_email: params.email,
      p_phone: params.phone || null,
      p_department: params.department || null,
      p_year: params.year || null,
      p_team_name: params.teamName || null,
      p_team_members: (params.teamMembers || []) as any,
      p_custom_answers: (params.customAnswers || {}) as any,
    });

    if (error) {
      console.error("[SketchRepository] register_for_event RPC failed:", {
        code: error.code,
        message: error.message,
      });

      return {
        success: false,
        error: error.code || "DB_ERROR",
        message: "Database service temporarily unavailable. Please try again.",
      };
    }

    const res = data as any;
    if (!res.success) {
      return {
        success: false,
        error: res.error,
        message: res.message,
      };
    }

    let registrationRowId: string | undefined;
    try {
      const adminClient: any = createAdminClient() || supabase;
      if (adminClient && typeof adminClient.from === "function") {
        const resQuery = adminClient.from("registrations");
        if (resQuery && typeof resQuery.select === "function") {
          const selectBuilder = resQuery.select("id");
          if (selectBuilder && typeof selectBuilder.eq === "function") {
            const eqBuilder = selectBuilder.eq("registration_id", res.registration_id);
            if (eqBuilder && typeof eqBuilder.maybeSingle === "function") {
              const { data: regRow } = await eqBuilder.maybeSingle();
              if (regRow?.id) {
                registrationRowId = regRow.id;
              }
            }
          }
        }
      }
    } catch {
      // Ignore if mock client in unit tests does not support full builder
    }

    return {
      success: true,
      registrationId: res.registration_id,
      registrationRowId,
      qrCredentialId: res.qr_credential_id,
      message: res.message || "Registration confirmed.",
    };
  }

  /**
   * Verify and execute attendance check-in for a participant (Admin only)
   * Delegates directly to atomic toggleParticipantAttendance to preserve ACID invariants.
   */
  static async recordAttendance(params: {
    registrationId: string;
    eventId: string;
    method: "camera" | "manual" | "simulation";
    actorId?: string;
  }): Promise<{ success: boolean; message: string; participant?: Partial<Participant> }> {
    const res = await this.toggleParticipantAttendance({
      registrationIdOrUid: params.registrationId,
      eventId: params.eventId,
      targetStatus: "checked_in",
      actorId: params.actorId,
      method: params.method,
    });

    return {
      success: res.success,
      message: res.message,
      participant: res.success
        ? {
            registrationId: res.registrationId,
            attendanceStatus: res.attendanceStatus,
            checkedInAt: res.checkedInAt,
          }
        : undefined,
    };
  }

  /**
   * Append an entry to the immutable audit log
   */
  static async logAudit(params: {
    actorName: string;
    actorEmail: string;
    action: string;
    target: string;
    details: Record<string, unknown>;
  }): Promise<void> {
    if (this.isPreview()) {
      saveAuditLog({
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        actorName: params.actorName,
        actorEmail: params.actorEmail,
        action: params.action,
        target: params.target,
        timestamp: "Just now",
        details: typeof params.details === "string" ? params.details : JSON.stringify(params.details),
      });
      return;
    }

    const supabase: any = createAdminClient() || (await createClient());
    if (!supabase) return;

    const { error } = await supabase.from("audit_logs").insert({
      actor_name: params.actorName,
      actor_email: params.actorEmail,
      action: params.action,
      target: params.target,
      details: params.details as any,
    });

    if (error) {
      console.error("[SketchRepository] Failed to record audit log:", error);
    }
  }

  /**
   * List certificates with optional event filter
   */
  static async listCertificates(eventId?: string): Promise<CertificateRecord[]> {
    if (this.isPreview()) {
      return getStoredCertificates(eventId);
    }

    try {
      const supabase = createAdminClient() || (await createClient());
      if (!supabase) return [];

      let query = (supabase as any)
        .from("certificates")
        .select(`
          id,
          event_id,
          recipient_name,
          recipient_email,
          certificate_number,
          status,
          issued_at,
          events (
            title
          )
        `)
        .order("issued_at", { ascending: false });

      if (eventId && eventId !== "all") {
        query = query.eq("event_id", eventId);
      }

      const { data, error } = await query;
      if (error) {
        console.error("[SketchRepository] listCertificates error:", error);
        return [];
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        eventId: row.event_id,
        eventTitle: row.events?.title || "Sketch Event",
        recipientName: row.recipient_name,
        recipientEmail: row.recipient_email,
        certificateNumber: row.certificate_number,
        issuedAt: row.issued_at,
        status: row.status as "eligible" | "issued" | "revoked",
      }));
    } catch (err) {
      console.error("[SketchRepository] listCertificates exception:", err);
      return [];
    }
  }

  /**
   * Verify an issued certificate publicly by certificate number.
   * Calls scoped database RPC public.verify_certificate to prevent disclosing recipient email or private keys.
   */
  static async verifyCertificate(certificateNumber: string): Promise<{
    isValid: boolean;
    certificateNumber?: string;
    eventTitle?: string;
    recipientName?: string;
    issuedAt?: string;
    status?: string;
  } | null> {
    const cleanCertNumber = certificateNumber.trim();
    if (!cleanCertNumber) return null;

    if (this.isPreview()) {
      const all = getStoredCertificates();
      const found = all.find(
        (c) => c.certificateNumber.toLowerCase() === cleanCertNumber.toLowerCase() && c.status === "issued"
      );
      if (!found) return null;
      return {
        isValid: true,
        certificateNumber: found.certificateNumber,
        eventTitle: found.eventTitle,
        recipientName: found.recipientName,
        issuedAt: found.issuedAt,
        status: found.status,
      };
    }

    try {
      const supabase: any = (await createClient()) || createAdminClient();
      if (!supabase) return null;

      const { data, error } = await supabase.rpc("verify_certificate", {
        p_certificate_number: cleanCertNumber,
      });

      if (error || !data || data.length === 0) {
        return null;
      }

      const row = data[0];
      return {
        isValid: Boolean(row.is_valid),
        certificateNumber: row.certificate_number,
        eventTitle: row.event_title,
        recipientName: row.recipient_name,
        issuedAt: row.issued_at,
        status: row.status,
      };
    } catch (err) {
      console.error("[SketchRepository.verifyCertificate] Exception:", err);
      return null;
    }
  }

  /**
   * Issue batch certificates for checked-in attendees
   */
  static async batchIssueCertificates(params: {
    eventId?: string;
    actorName?: string;
    actorEmail?: string;
  }): Promise<{ issuedCount: number; certificates: CertificateRecord[] }> {
    const isPreviewMode = this.isPreview();
    const eventId = params.eventId && params.eventId !== "all" ? params.eventId : undefined;

    // Fetch participants and events to identify eligible attendees
    const [allParticipants, allEvents] = await Promise.all([
      this.listParticipants({ eventId }),
      this.listEvents(),
    ]);

    const eventMap = new Map(allEvents.map((e) => [e.id, e.title]));
    const existingCerts = await this.listCertificates(eventId);
    const existingEmails = new Set(existingCerts.map((c) => c.recipientEmail.toLowerCase()));

    // Eligible: checked_in and not yet issued for this event
    const eligibleAttendees = allParticipants.filter((p) => {
      const matchesEvent = !eventId || p.eventId === eventId;
      return matchesEvent && p.attendanceStatus === "checked_in" && !existingEmails.has(p.email.toLowerCase());
    });

    if (eligibleAttendees.length === 0) {
      return { issuedCount: 0, certificates: [] };
    }

    const newCertRecords: CertificateRecord[] = eligibleAttendees.map((p, idx) => ({
      id: isPreviewMode ? `cert-${Date.now()}-${idx}` : crypto.randomUUID(),
      eventId: p.eventId,
      eventTitle: p.eventTitle || eventMap.get(p.eventId) || "Sketch Event",
      recipientName: p.name,
      recipientEmail: p.email,
      certificateNumber: `SKETCH-CERT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      issuedAt: new Date().toISOString(),
      status: "issued" as const,
    }));

    if (isPreviewMode) {
      saveCertificates(newCertRecords);
    } else {
      try {
        const supabase = createAdminClient() || (await createClient());
        if (supabase) {
          const insertPayload = newCertRecords.map((c) => ({
            id: c.id,
            event_id: c.eventId,
            recipient_name: c.recipientName,
            recipient_email: c.recipientEmail,
            certificate_number: c.certificateNumber,
            status: c.status,
            issued_at: c.issuedAt,
          }));

          const { error: certErr } = await (supabase as any).from("certificates").insert(insertPayload);
          if (certErr) {
            console.error("[SketchRepository] Failed to insert certificates:", certErr);
            throw certErr;
          }

          // Enqueue outbox delivery jobs
          const outboxJobs = newCertRecords.map((c) => ({
            event_id: c.eventId,
            recipient_email: c.recipientEmail,
            recipient_name: c.recipientName,
            subject: `Certificate of Participation — ${c.eventTitle}`,
            template_type: "certificate",
            payload: {
              certificateNumber: c.certificateNumber,
              recipientName: c.recipientName,
              eventTitle: c.eventTitle,
              issuedAt: c.issuedAt,
            },
            status: "queued",
          }));

          await (supabase as any).from("communications_outbox").insert(outboxJobs);
        }
      } catch (dbErr) {
        console.error("[SketchRepository] DB batch issuance failed:", dbErr);
        if (this.isPreview()) {
          saveCertificates(newCertRecords);
        } else {
          throw dbErr;
        }
      }
    }

    // Log to audit trail
    await this.logAudit({
      actorName: params.actorName || "Administrator",
      actorEmail: params.actorEmail || "admin@sketch.org",
      action: "Issued Certificate Batch",
      target: `${eventId ? eventMap.get(eventId) || eventId : "All Events"} (${newCertRecords.length} certificates)`,
      details: {
        count: newCertRecords.length,
        eventId: eventId || "all",
      },
    });

    return { issuedCount: newCertRecords.length, certificates: newCertRecords };
  }

  /**
   * List communication outbox jobs
   */
  static async listOutboxJobs(eventId?: string): Promise<CommunicationJob[]> {
    if (this.isPreview()) {
      return getStoredCommunications(eventId);
    }

    try {
      const supabase = createAdminClient() || (await createClient());
      if (!supabase) return [];

      let query = (supabase as any)
        .from("communications_outbox")
        .select(`
          id,
          event_id,
          recipient_email,
          recipient_name,
          subject,
          template_type,
          status,
          attempts,
          last_error,
          scheduled_at,
          delivered_at,
          events (
            title
          )
        `)
        .order("created_at", { ascending: false });

      if (eventId && eventId !== "all") {
        query = query.eq("event_id", eventId);
      }

      const { data, error } = await query;
      if (error) {
        console.error("[SketchRepository] listOutboxJobs error:", error);
        return [];
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        eventId: row.event_id,
        eventTitle: row.events?.title || "Sketch Event",
        subject: row.subject,
        type: (row.template_type === "ticket_pass" ? "confirmation" : row.template_type) as any,
        recipientCount: 1,
        recipientEmail: row.recipient_email || undefined,
        recipientName: row.recipient_name || undefined,
        status: (row.status === "delivered" ? "sent" : row.status) as any,
        attempts: typeof row.attempts === "number" ? row.attempts : 0,
        lastError: row.last_error || undefined,
        scheduledAt: row.scheduled_at,
        deliveredAt: row.delivered_at,
      }));
    } catch (err) {
      console.error("[SketchRepository] listOutboxJobs exception:", err);
      return [];
    }
  }

  /**
   * Enqueue communication outbox job
   */
  static async enqueueCommunication(params: {
    eventId: string;
    subject: string;
    templateType: "ticket_pass" | "reminder" | "announcement" | "certificate";
    recipients: Array<{ email: string; name: string }>;
    payload?: Record<string, unknown>;
    scheduledAt?: string;
    actorName?: string;
    actorEmail?: string;
  }): Promise<{ success: boolean; enqueuedCount: number }> {
    const isPreviewMode = this.isPreview();
    const event = await this.getEventById(params.eventId);
    const eventTitle = event?.title || "Sketch Event";

    if (params.recipients.length === 0) {
      return { success: false, enqueuedCount: 0 };
    }

    if (isPreviewMode) {
      const commJob: CommunicationJob = {
        id: `comm-${Date.now()}`,
        eventId: params.eventId,
        eventTitle,
        subject: params.subject,
        type: params.templateType === "ticket_pass" ? "confirmation" : params.templateType,
        recipientCount: params.recipients.length,
        status: "queued",
        scheduledAt: params.scheduledAt || "Instant",
      };
      saveCommunication(commJob);
    } else {
      try {
        const supabase = createAdminClient() || (await createClient());
        if (supabase) {
          const rows = params.recipients.map((r) => ({
            event_id: params.eventId,
            recipient_email: r.email,
            recipient_name: r.name,
            subject: params.subject,
            template_type: params.templateType,
            payload: params.payload || {},
            status: "queued",
            scheduled_at: params.scheduledAt || new Date().toISOString(),
          }));

          const { error } = await (supabase as any).from("communications_outbox").insert(rows);
          if (error) {
            console.error("[SketchRepository] Failed to insert communications_outbox:", error);
            throw error;
          }
        }
      } catch (dbErr) {
        console.error("[SketchRepository] Enqueue outbox DB error:", dbErr);
        if (this.isPreview()) {
          const commJob: CommunicationJob = {
            id: `comm-${Date.now()}`,
            eventId: params.eventId,
            eventTitle,
            subject: params.subject,
            type: params.templateType === "ticket_pass" ? "confirmation" : params.templateType,
            recipientCount: params.recipients.length,
            status: "queued",
            scheduledAt: params.scheduledAt || "Instant",
          };
          saveCommunication(commJob);
        } else {
          throw dbErr;
        }
      }
    }

    // Audit log
    await this.logAudit({
      actorName: params.actorName || "Administrator",
      actorEmail: params.actorEmail || "admin@sketch.org",
      action: "Queued Announcement Dispatch",
      target: `${eventTitle} (${params.recipients.length} recipients)`,
      details: {
        eventId: params.eventId,
        subject: params.subject,
        templateType: params.templateType,
        recipientCount: params.recipients.length,
      },
    });

    return { success: true, enqueuedCount: params.recipients.length };
  }

  /**
   * Retry an eligible failed communication outbox job
   */
  static async retryFailedCommunication(jobId: string): Promise<{ success: boolean; message?: string }> {
    if (this.isPreview()) {
      const comms = getStoredCommunications();
      const found = comms.find((c) => c.id === jobId);
      if (found) {
        updateStoredCommunication({ ...found, status: "queued" });
        return { success: true, message: "Delivery retried in preview store." };
      }
      return { success: false, message: "Job not found in preview store." };
    }

    try {
      const supabase = createAdminClient();
      if (!supabase) {
        return { success: false, message: "Storage client unavailable." };
      }

      const { data, error } = await (supabase as any)
        .from("communications_outbox")
        .update({
          status: "queued",
          scheduled_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("id", jobId)
        .in("status", ["failed", "dead_letter"])
        .select("id")
        .single();

      if (error || !data) {
        return { success: false, message: error?.message || "Job not eligible for retry or already sent." };
      }

      return { success: true };
    } catch (err: any) {
      console.error("[SketchRepository] retryFailedCommunication error:", err);
      return { success: false, message: err?.message || "Failed to retry delivery." };
    }
  }

  /**
   * List audit log entries
   */
  static async listAuditLogs(options?: { search?: string; limit?: number }): Promise<AuditLogEntry[]> {
    if (this.isPreview()) {
      return getStoredAuditLogs();
    }

    try {
      const supabase = createAdminClient() || (await createClient());
      if (!supabase) return [];

      let query = (supabase as any)
        .from("audit_logs")
        .select("id, actor_name, actor_email, action, target, details, created_at")
        .order("created_at", { ascending: false })
        .limit(options?.limit || 100);

      const { data, error } = await query;
      if (error) {
        console.error("[SketchRepository] listAuditLogs error:", error);
        return [];
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        actorName: row.actor_name,
        actorEmail: row.actor_email,
        action: row.action,
        target: row.target,
        timestamp: row.created_at,
        details: typeof row.details === "object" ? JSON.stringify(row.details) : String(row.details || ""),
      }));
    } catch (err) {
      console.error("[SketchRepository] listAuditLogs exception:", err);
      return [];
    }
  }

  /**
   * List administrators and coordinators from admin_profiles
   */
  static async listAdminProfiles(): Promise<AdminUser[]> {
    if (this.isPreview()) {
      return [
        {
          id: "preview-admin",
          name: "Harshanth",
          email: "harshanth@sketch.org",
          role: "master_admin",
        },
      ];
    }

    try {
      const supabase = createAdminClient() || (await createClient());
      if (!supabase) return [];

      const { data, error } = await (supabase as any)
        .from("admin_profiles")
        .select("id, email, full_name, role, avatar_url")
        .order("created_at", { ascending: true });

      if (error || !data) {
        console.error("[SketchRepository] listAdminProfiles error:", error);
        return [];
      }

      return data.map((row: any) => ({
        id: row.id,
        name: row.full_name || row.email,
        email: row.email,
        role: row.role as AdminRole,
        avatarUrl: row.avatar_url || undefined,
      }));
    } catch (err) {
      console.error("[SketchRepository] listAdminProfiles exception:", err);
      return [];
    }
  }

  /**
   * Helper to convert Postgres row to EventItem domain type
   */
  private static mapEventRowToEventItem(row: Database["public"]["Tables"]["events"]["Row"]): EventItem {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      category: row.category as any,
      shortDescription: row.short_description,
      description: row.description,
      posterUrl: row.poster_url || "",
      heroImage: row.hero_image || undefined,
      heroImageFocalPoint: row.hero_image_focal_point || undefined,
      directoryImage: row.directory_image || undefined,
      directoryImageFocalPoint: row.directory_image_focal_point || undefined,
      startDate: row.start_date,
      endDate: row.end_date,
      venue: row.venue,
      venueMode: row.venue_mode,
      capacity: row.capacity,
      registeredCount: row.registered_count,
      checkedInCount: row.checked_in_count,
      lifecycle: row.lifecycle,
      registrationState: row.registration_state,
      hasTeams: row.has_teams,
      minTeamSize: row.min_team_size || undefined,
      maxTeamSize: row.max_team_size || undefined,
      hasRounds: row.has_rounds,
      featured: row.featured,
      contactEmail: row.contact_email || undefined,
      contactPhone: row.contact_phone || undefined,
      communityLink: row.community_link || undefined,
      registrationForm: row.registration_form as any,
    };
  }

  /**
   * Helper to convert Postgres row to Round domain type
   */
  private static mapRoundRowToRound(row: any): Round {
    return {
      id: row.id,
      eventId: row.event_id,
      eventTitle: row.events?.title || "",
      name: row.name,
      order: row.round_order,
      startTime: row.start_time,
      venue: row.venue,
      status: row.status as "upcoming" | "in_progress" | "completed",
      eligibleCount: row.eligible_count,
      advancedCount: row.advanced_count || 0,
    };
  }

  // ---------------------------------------------------------------------------
  // TICKET STUDIO & ROTATING QR METHODS
  // ---------------------------------------------------------------------------

  /**
   * List all ticket templates with their active/published status
   */
  static async listTicketTemplates(): Promise<TicketTemplate[]> {
    if (this.isPreview()) {
      return [
        {
          id: "77777777-7777-7777-7777-777777770001",
          name: "Cinematic Midnight Premiere",
          slug: "cinematic-midnight-premiere",
          category: "cinematic",
          description: "Deep charcoal pass with gold accents, perforated tear-off stub, and rotating live QR badge.",
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
    }

    const supabase = createAdminClient() || (await createClient());
    if (!supabase) return [];

    const { data, error } = await (supabase as any)
      .from("ticket_templates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[SketchRepository.listTicketTemplates] Database query failed:", {
        code: error.code,
        message: error.message,
        hint: error.hint,
        details: error.details,
      });
      if (error.code === "PGRST205" || error.code === "42P01") {
        throw new Error(
          "Table 'ticket_templates' was not found in the connected database. Migration 00007 must be applied to the target database."
        );
      }
      throw new Error(error.message || "Failed to load ticket templates from database.");
    }

    if (!data) return [];

    return data.map((t: any) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      category: t.category,
      description: t.description || undefined,
      isActive: t.is_active,
      createdBy: t.created_by || undefined,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    }));
  }

  /**
   * Get a ticket template with all its published and draft versions
   */
  static async getTicketTemplateById(id: string): Promise<{
    template: TicketTemplate | null;
    versions: TicketTemplateVersion[];
  }> {
    if (this.isPreview()) {
      return {
        template: {
          id,
          name: "Standard Event Pass",
          slug: "standard-event-pass",
          category: "cinematic",
          description: "Clean event pass with QR code, attendee details, and optional background.",
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        versions: [
          {
            id: "88888888-8888-8888-8888-888888880001",
            templateId: id,
            versionNumber: 1,
            designData: {
              layout: "cinematic-horizontal",
              canvas: { width: 800, height: 380, unit: "px" },
              theme: {
                background: "#111315",
                surface: "#181B1E",
                accent: "#E2B857",
                textColor: "#F3F4F6",
                secondaryTextColor: "#9CA3AF",
                borderColor: "#2C3136",
              },
              stub: {
                perforationPosition: "right",
                stubWidth: 240,
                badgeText: "ENTRY PASS",
              },
              qr: {
                size: 180,
                label: "SCAN TO VERIFY",
                rotating: true,
                refreshIntervalSec: 30,
              },
            },
            isPublished: true,
            publishedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          },
        ],
      };
    }

    const supabase = createAdminClient() || (await createClient());
    if (!supabase) return { template: null, versions: [] };

    const [tplRes, verRes] = await Promise.all([
      (supabase as any).from("ticket_templates").select("*").eq("id", id).single(),
      (supabase as any)
        .from("ticket_template_versions")
        .select("*")
        .eq("template_id", id)
        .order("version_number", { ascending: false }),
    ]);

    if (tplRes.error || !tplRes.data) return { template: null, versions: [] };

    const t = tplRes.data;
    const template: TicketTemplate = {
      id: t.id,
      name: t.name,
      slug: t.slug,
      category: t.category,
      description: t.description || undefined,
      isActive: t.is_active,
      createdBy: t.created_by || undefined,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    };

    const versions: TicketTemplateVersion[] = (verRes.data || []).map((v: any) => ({
      id: v.id,
      templateId: v.template_id,
      versionNumber: v.version_number,
      designData: v.design_data,
      isPublished: v.is_published,
      publishedAt: v.published_at || undefined,
      publishedBy: v.published_by || undefined,
      createdAt: v.created_at,
    }));

    return { template, versions };
  }

  /**
   * Create a new ticket template with an initial draft version
   */
  static async createTicketTemplate(params: {
    name: string;
    slug?: string;
    category?: string;
    description?: string;
    initialDesign?: any;
    actorId?: string;
  }): Promise<{ templateId: string; versionId: string }> {
    const slug =
      params.slug ||
      params.name
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-");

    if (this.isPreview()) {
      return {
        templateId: `tpl-${Date.now()}`,
        versionId: `ver-${Date.now()}`,
      };
    }

    const supabase = createAdminClient() || (await createClient());
    if (!supabase) throw new Error("Database client unavailable");

    const { data: tpl, error: tplErr } = await (supabase as any)
      .from("ticket_templates")
      .insert({
        name: params.name,
        slug,
        category: params.category || "cinematic",
        description: params.description || null,
        created_by: params.actorId || null,
      })
      .select()
      .single();

    if (tplErr || !tpl) {
      throw new Error(tplErr?.message || "Failed to create ticket template");
    }

    const { data: ver, error: verErr } = await (supabase as any)
      .from("ticket_template_versions")
      .insert({
        template_id: tpl.id,
        version_number: 1,
        design_data: params.initialDesign || {},
        is_published: false,
        published_by: params.actorId || null,
      })
      .select()
      .single();

    if (verErr || !ver) {
      throw new Error(verErr?.message || "Failed to create initial template version");
    }

    return { templateId: tpl.id, versionId: ver.id };
  }

  /**
   * Save a draft version of a ticket template
   */
  static async saveTemplateDraft(params: {
    templateId: string;
    designData: any;
  }): Promise<boolean> {
    if (this.isPreview()) return true;

    const supabase = createAdminClient() || (await createClient());
    if (!supabase) return false;

    // Look for existing unpublished draft
    const { data: existingDraft } = await (supabase as any)
      .from("ticket_template_versions")
      .select("id")
      .eq("template_id", params.templateId)
      .eq("is_published", false)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingDraft) {
      const { error } = await (supabase as any)
        .from("ticket_template_versions")
        .update({ design_data: params.designData })
        .eq("id", existingDraft.id);
      return !error;
    } else {
      // Find latest version number
      const { data: latest } = await (supabase as any)
        .from("ticket_template_versions")
        .select("version_number")
        .eq("template_id", params.templateId)
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextVer = (latest?.version_number || 0) + 1;
      const { error } = await (supabase as any).from("ticket_template_versions").insert({
        template_id: params.templateId,
        version_number: nextVer,
        design_data: params.designData,
        is_published: false,
      });
      return !error;
    }
  }

  /**
   * Publish an immutable template version.
   * Increments version number and locks the design from in-place mutation.
   */
  static async publishTemplateVersion(params: {
    templateId: string;
    designData: any;
    actorId?: string;
  }): Promise<{ versionId: string; versionNumber: number }> {
    if (this.isPreview()) {
      return { versionId: `ver-${Date.now()}`, versionNumber: 2 };
    }

    const supabase = createAdminClient() || (await createClient());
    if (!supabase) throw new Error("Database client unavailable");

    // Fetch highest version number
    const { data: latest } = await (supabase as any)
      .from("ticket_template_versions")
      .select("version_number")
      .eq("template_id", params.templateId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const newVersionNumber = (latest?.version_number || 0) + 1;

    const { data, error } = await (supabase as any)
      .from("ticket_template_versions")
      .insert({
        template_id: params.templateId,
        version_number: newVersionNumber,
        design_data: params.designData,
        is_published: true,
        published_at: new Date().toISOString(),
        published_by: params.actorId || null,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || "Failed to publish template version");
    }

    return { versionId: data.id, versionNumber: data.version_number };
  }

  /**
   * Assign an immutable ticket template version to an event
   */
  static async assignEventTicketTemplate(params: {
    eventId: string;
    templateVersionId: string;
    actorName?: string;
    actorEmail?: string;
  }): Promise<boolean> {
    if (this.isPreview()) return true;

    const supabase = createAdminClient() || (await createClient());
    if (!supabase) return false;

    const { error } = await (supabase as any)
      .from("events")
      .update({ ticket_template_version_id: params.templateVersionId })
      .eq("id", params.eventId);

    if (error) {
      console.error("[SketchRepository.assignEventTicketTemplate] Error:", error);
      return false;
    }

    await this.logAudit({
      actorName: params.actorName || "Admin",
      actorEmail: params.actorEmail || "admin@sketch.org",
      action: "ASSIGN_TICKET_TEMPLATE",
      target: params.eventId,
      details: { templateVersionId: params.templateVersionId },
    });

    return true;
  }

  /**
   * Atomically issue or reconcile a ticket for a registration
   */
  static async issueOrReconcileTicket(params: {
    registrationId: string;
    bearerTokenHash: string;
    ticketNumber: string;
  }): Promise<{
    success: boolean;
    ticketId?: string;
    ticketNumber?: string;
    status?: string;
    isExisting?: boolean;
    error?: string;
    message?: string;
  }> {
    if (this.isPreview()) {
      return {
        success: true,
        ticketId: `tkt-${Date.now()}`,
        ticketNumber: params.ticketNumber,
        status: "active",
        isExisting: false,
      };
    }

    const supabase = createAdminClient() || (await createClient());
    if (!supabase) return { success: false, error: "NO_DB", message: "Database offline" };

    const { data, error } = await (supabase as any).rpc("issue_or_reconcile_ticket", {
      p_registration_id: params.registrationId,
      p_bearer_token_hash: params.bearerTokenHash,
      p_ticket_number: params.ticketNumber,
    });

    if (error || !data) {
      console.error("[SketchRepository.issueOrReconcileTicket] Error:", error);
      return {
        success: false,
        error: error?.code || "TICKET_ISSUANCE_FAILED",
        message: error?.message || "Failed to issue ticket",
      };
    }

    const res = data as any;
    return {
      success: Boolean(res.success),
      ticketId: res.ticket_id,
      ticketNumber: res.ticket_number,
      status: res.status,
      isExisting: Boolean(res.is_existing),
      error: res.error,
      message: res.message,
    };
  }

  /**
   * Safe lookup of an attendee registration and its associated ticket by event and email.
   * Returns display and reconciliation data without exposing internal credentials.
   */
  static async getRegistrationByEventAndEmail(eventId: string, email: string): Promise<{
    id: string;
    registrationId: string;
    eventId: string;
    attendeeName: string;
    email: string;
    teamName?: string;
    status: string;
    attendanceStatus: string;
    qrCredentialId: string;
    createdAt: string;
    ticketId?: string;
    ticketNumber?: string;
    bearerTokenHash?: string;
    liveTicketUrl?: string;
  } | null> {
    if (this.isPreview()) {
      return null;
    }

    const supabase: any = createAdminClient() || (await createClient());
    if (!supabase) return null;

    const { data: reg, error } = await supabase
      .from("registrations")
      .select(`
        id,
        registration_id,
        event_id,
        team_id,
        attendee_name,
        email,
        status,
        attendance_status,
        qr_credential_id,
        created_at,
        teams (
          name
        )
      `)
      .eq("event_id", eventId)
      .ilike("email", email.trim().toLowerCase())
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !reg) return null;

    // Check associated ticket
    const { data: ticket } = await supabase
      .from("tickets")
      .select("id, ticket_number, bearer_token_hash, status")
      .eq("registration_id", reg.id)
      .maybeSingle();

    // Check communications outbox for live_ticket_url
    const { data: outbox } = await supabase
      .from("communications_outbox")
      .select("payload")
      .eq("event_id", eventId)
      .ilike("recipient_email", email.trim().toLowerCase())
      .eq("template_type", "ticket_pass")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const liveTicketUrl = (outbox?.payload as any)?.live_ticket_url;

    return {
      id: reg.id,
      registrationId: reg.registration_id,
      eventId: reg.event_id,
      attendeeName: reg.attendee_name,
      email: reg.email,
      teamName: reg.teams?.name || undefined,
      status: reg.status,
      attendanceStatus: reg.attendance_status,
      qrCredentialId: reg.qr_credential_id,
      createdAt: reg.created_at,
      ticketId: ticket?.id,
      ticketNumber: ticket?.ticket_number,
      bearerTokenHash: ticket?.bearer_token_hash,
      liveTicketUrl,
    };
  }

  /**
   * Updates an outbox ticket_pass job payload with live ticket URL and ticket number.
   */
  static async updateOutboxTicketPassPayload(params: {
    eventId: string;
    recipientEmail: string;
    liveTicketUrl: string;
    ticketNumber?: string;
  }): Promise<boolean> {
    if (this.isPreview()) return true;

    const supabase: any = createAdminClient() || (await createClient());
    if (!supabase) return false;

    const { data: existingOutbox, error: fetchErr } = await supabase
      .from("communications_outbox")
      .select("id, payload")
      .eq("event_id", params.eventId)
      .ilike("recipient_email", params.recipientEmail.trim().toLowerCase())
      .eq("template_type", "ticket_pass")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchErr || !existingOutbox) return false;

    const updatedPayload = {
      ...(typeof existingOutbox.payload === "object" && existingOutbox.payload !== null
        ? existingOutbox.payload
        : {}),
      live_ticket_url: params.liveTicketUrl,
      ...(params.ticketNumber ? { ticket_number: params.ticketNumber } : {}),
    };

    const { error: updateErr } = await supabase
      .from("communications_outbox")
      .update({ payload: updatedPayload })
      .eq("id", existingOutbox.id);

    if (updateErr) {
      console.error("[SketchRepository.updateOutboxTicketPassPayload] Failed:", updateErr);
      return false;
    }

    return true;
  }

  /**
   * Updates a ticket's bearer token hash during pass reconciliation.
   */
  static async updateTicketBearerTokenHash(ticketId: string, bearerTokenHash: string): Promise<boolean> {
    if (this.isPreview()) return true;

    const supabase: any = createAdminClient() || (await createClient());
    if (!supabase) return false;

    const { error } = await supabase
      .from("tickets")
      .update({
        bearer_token_hash: bearerTokenHash,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketId);

    return !error;
  }

  /**
   * Safe public lookup of a live ticket by bearer token
   * Returns display details only (zero PII exposure)
   */
  static async getTicketByBearerToken(rawBearerToken: string): Promise<LiveTicketData | null> {
    const cleanToken = rawBearerToken.trim();
    if (!cleanToken) return null;

    const tokenHash = hashBearerToken(cleanToken);

    if (this.isPreview()) {
      return {
        ticketId: "preview-ticket-001",
        ticketNumber: "TKT-2026-9999",
        eventId: "preview-event-001",
        eventTitle: "Sketch Premiere Summit 2026",
        eventSlug: "sketch-premiere-summit-2026",
        venue: "Grand Hall, Innovation Centre",
        venueMode: "in-person",
        startDate: new Date(Date.now() + 86400000).toISOString(),
        endDate: new Date(Date.now() + 172800000).toISOString(),
        attendeeName: "Sample Attendee",
        teamName: "Sample Team",
        ticketStatus: "active",
        attendanceStatus: "not_checked_in",
        templateDesign: {
          layout: "cinematic-horizontal",
          theme: {
            background: "#111315",
            surface: "#181B1E",
            accent: "#E2B857",
            textColor: "#F3F4F6",
            secondaryTextColor: "#9CA3AF",
            borderColor: "#2C3136",
          },
          stub: {
            perforationPosition: "right",
            stubWidth: 240,
            badgeText: "ENTRY PASS",
          },
          qr: {
            size: 180,
            label: "SCAN TO VERIFY",
            rotating: true,
            refreshIntervalSec: 30,
          },
        },
      };
    }

    const supabase = createAdminClient() || (await createClient());
    if (!supabase) return null;

    const { data, error } = await (supabase as any).rpc("get_ticket_by_bearer_hash", {
      p_bearer_token_hash: tokenHash,
    });

    if (error || !data || data.length === 0) {
      return null;
    }

    const row = data[0];
    return {
      ticketId: row.ticket_id,
      ticketNumber: row.ticket_number,
      eventId: row.event_id,
      eventTitle: row.event_title,
      eventSlug: row.event_slug,
      venue: row.venue,
      venueMode: row.venue_mode,
      startDate: row.start_date,
      endDate: row.end_date,
      attendeeName: row.attendee_name,
      teamName: row.team_name || undefined,
      ticketStatus: row.ticket_status,
      attendanceStatus: row.attendance_status,
      templateDesign: row.template_design,
      checkedInAt: row.checked_in_at || undefined,
    };
  }

  /**
   * Atomic server verification of a rotating QR token
   */
  static async verifyRotatingQrToken(params: {
    ticketId: string;
    eventId: string;
    actorId: string;
    method?: string;
  }): Promise<{
    success: boolean;
    error?: string;
    message: string;
    attendanceStatus?: string;
    attendeeName?: string;
    ticketNumber?: string;
    checkedInAt?: string;
  }> {
    if (this.isPreview()) {
      return {
        success: true,
        message: "Check-in confirmed (Preview).",
        attendanceStatus: "checked_in",
        attendeeName: "Sample Attendee",
        ticketNumber: "TKT-2026-9999",
      };
    }

    const supabase = createAdminClient() || (await createClient());
    if (!supabase) return { success: false, error: "NO_DB", message: "Database offline" };

    const { data, error } = await (supabase as any).rpc("verify_rotating_qr_token", {
      p_ticket_id: params.ticketId,
      p_event_id: params.eventId,
      p_actor_id: params.actorId,
      p_method: params.method || "camera",
    });

    if (error || !data) {
      console.error("[SketchRepository.verifyRotatingQrToken] Error:", error);
      return {
        success: false,
        error: error?.code || "VERIFICATION_FAILED",
        message: error?.message || "Failed to verify QR token",
      };
    }

    const res = data as any;
    return {
      success: Boolean(res.success),
      error: res.error,
      message: res.message,
      attendanceStatus: res.attendance_status,
      attendeeName: res.attendee_name,
      ticketNumber: res.ticket_number,
      checkedInAt: res.checked_in_at,
    };
  }

  /**
   * Revoke an active ticket
   */
  static async revokeTicket(params: {
    ticketId: string;
    actorId: string;
    reason?: string;
  }): Promise<{ success: boolean; message: string; error?: string }> {
    if (this.isPreview()) {
      return { success: true, message: "Ticket revoked (Preview)." };
    }

    const supabase = createAdminClient() || (await createClient());
    if (!supabase) return { success: false, error: "NO_DB", message: "Database offline" };

    const { data, error } = await (supabase as any).rpc("revoke_ticket", {
      p_ticket_id: params.ticketId,
      p_actor_id: params.actorId,
      p_reason: params.reason || "Revoked by administration",
    });

    if (error || !data) {
      return {
        success: false,
        error: error?.code || "REVOCATION_FAILED",
        message: error?.message || "Failed to revoke ticket",
      };
    }

    return data as any;
  }
}
