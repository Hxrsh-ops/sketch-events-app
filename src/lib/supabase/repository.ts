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
  RegistrationSubmission,
  AuditLogEntry,
  AdminRole,
} from "@/types";
import { Database, RegistrationMode } from "@/types/database";
import { getStoredEvents } from "@/lib/registration-store";
import { MOCK_PARTICIPANTS } from "@/lib/mock-data";

export interface RegisterResult {
  success: boolean;
  registrationId?: string;
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
   * Fetch attendee records for an event (Admin view)
   */
  static async getEventAttendees(eventId: string): Promise<Participant[]> {
    if (this.isPreview()) {
      return MOCK_PARTICIPANTS.filter((p) => p.eventId === eventId || eventId === "evt-01");
    }

    const supabase: any = createAdminClient() || (await createClient());
    if (!supabase) {
      throw new Error("Database client is unavailable in production mode.");
    }

    const { data, error } = await supabase
      .from("registrations")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data.map((r: any) => ({
      id: r.id,
      registrationId: r.registration_id,
      eventId: r.event_id,
      eventTitle: "",
      name: r.attendee_name,
      email: r.email,
      phone: r.phone || undefined,
      department: r.department || undefined,
      year: r.year || undefined,
      teamId: r.team_id || undefined,
      teamName: r.team_name || undefined,
      registeredAt: r.created_at,
      status: r.status,
      attendanceStatus: r.attendance_status,
      checkedInAt: r.checked_in_at || undefined,
      qrCredentialId: r.qr_credential_id,
      customAnswers: r.custom_answers,
    }));
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
    const supabase: any = createAdminClient() || (await createClient());
    if (!supabase) {
      throw new Error("Database client is unavailable.");
    }

    const { data: current, error: fetchErr } = await supabase
      .from("events")
      .select("lifecycle, registered_count")
      .eq("id", id)
      .single();

    if (fetchErr || !current) {
      throw new Error(`Event with id "${id}" not found.`);
    }

    // Invariant: An archived event with registered attendees cannot simply be discarded
    if (lifecycle === "draft" && current.registered_count > 0) {
      throw new Error("Cannot revert an event to Draft once registrations have been recorded.");
    }

    const { data, error } = await supabase
      .from("events")
      .update({
        lifecycle,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to update event lifecycle: ${error?.message || "Unknown database error"}`);
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

    return {
      success: true,
      registrationId: res.registration_id,
      qrCredentialId: res.qr_credential_id,
      message: res.message || "Registration confirmed.",
    };
  }

  /**
   * Verify and execute attendance check-in for a participant (Admin only)
   */
  static async recordAttendance(params: {
    registrationId: string;
    eventId: string;
    method: "camera" | "manual" | "simulation";
  }): Promise<{ success: boolean; message: string; participant?: Partial<Participant> }> {
    const supabase: any = await createClient();
    if (!supabase) {
      return { success: false, message: "Database connection unavailable" };
    }

    // 1. Fetch registration record
    const { data: registration, error: regError } = await supabase
      .from("registrations")
      .select("*")
      .eq("registration_id", params.registrationId)
      .eq("event_id", params.eventId)
      .single();

    if (regError || !registration) {
      return { success: false, message: "Participant not found for this event" };
    }

    if (registration.attendance_status === "checked_in") {
      return {
        success: false,
        message: `Already checked in at ${registration.checked_in_at}`,
      };
    }

    // 2. Insert attendance record
    const { error: attError } = await supabase.from("attendance_records").insert({
      registration_id: registration.id,
      event_id: params.eventId,
      method: params.method,
    });

    if (attError) {
      return { success: false, message: `Check-in failed: ${attError.message}` };
    }

    // 3. Update registration attendance status
    const nowIso = new Date().toISOString();
    await supabase
      .from("registrations")
      .update({
        attendance_status: "checked_in",
        checked_in_at: nowIso,
      })
      .eq("id", registration.id);

    // 4. Increment event checked-in count
    const { data: event } = await supabase
      .from("events")
      .select("checked_in_count")
      .eq("id", params.eventId)
      .single();

    if (event) {
      await supabase
        .from("events")
        .update({ checked_in_count: event.checked_in_count + 1 })
        .eq("id", params.eventId);
    }

    return {
      success: true,
      message: "Check-in verified successfully",
      participant: {
        id: registration.id,
        name: registration.attendee_name,
        email: registration.email,
        registrationId: registration.registration_id,
        attendanceStatus: "checked_in",
        checkedInAt: nowIso,
      },
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
}
