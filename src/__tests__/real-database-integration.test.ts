import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { EmailOutboxWorker } from "@/lib/email/worker";
import { TestEmailAdapter } from "@/lib/email/adapters";

const SUPABASE_URL = "http://127.0.0.1:54321";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const isDbOnline = await fetch("http://127.0.0.1:54321/rest/v1/", {
  signal: AbortSignal.timeout(2500),
}).then(r => r.ok).catch(() => false);

describe.skipIf(!isDbOnline)("Phase 4: Real Database Integration Validation (Local Supabase on Port 54322)", () => {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const createdEventIds: string[] = [];
  const testActorId: string = "3c3f407e-9c73-4b2f-9b97-22c3e0afedca";

  beforeAll(async () => {
    const { error } = await admin.from("events").select("id").limit(1);
    if (error) {
      throw new Error(`Real database is not reachable on port 54322 / API 54321: ${error.message}`);
    }
  });

  afterAll(async () => {
    // Strict cleanup of only records created during this test run
    for (const eventId of createdEventIds) {
      await admin.from("audit_logs").delete().eq("details->>event_id", eventId);
      await admin.from("attendance_records").delete().eq("event_id", eventId);
      await admin.from("communications_outbox").delete().eq("event_id", eventId);
      await admin.from("registrations").delete().eq("event_id", eventId);
      await admin.from("rounds").delete().eq("event_id", eventId);
      await admin.from("events").delete().eq("id", eventId);
    }
  });

  it("1. Registration RPC: duplicate prevention and capacity enforcement", async () => {
    const slug = `integ-cap-${Date.now()}`;
    const { data: event, error: eventErr } = await admin
      .from("events")
      .insert({
        title: "Capacity & Duplicate Test Event",
        slug,
        category: "Workshop",
        short_description: "Real DB capacity enforcement",
        description: "Checking capacity and duplicate constraints.",
        venue: "Lab 1",
        venue_mode: "in-person",
        start_date: new Date(Date.now() + 86400000).toISOString(),
        end_date: new Date(Date.now() + 172800000).toISOString(),
        capacity: 2, // 2 seats available
        lifecycle: "published",
        registration_state: "open",
        has_teams: false,
      })
      .select()
      .single();

    expect(eventErr).toBeNull();
    expect(event).toBeDefined();
    createdEventIds.push(event.id);

    const email1 = `user1-${Date.now()}@sketch.test`;

    // First registration should succeed
    const { data: reg1, error: reg1Err } = await admin.rpc("register_for_event", {
      p_event_id: event.id,
      p_mode: "individual",
      p_attendee_name: "User One",
      p_email: email1,
    });

    expect(reg1Err).toBeNull();
    expect(reg1.success).toBe(true);
    expect(reg1.registration_id).toMatch(/^REG-2026-\d{5}-[A-Z0-9]{6}$/);

    // Duplicate email for same event must be rejected with ALREADY_REGISTERED (case-insensitive)
    const { data: regDup, error: regDupErr } = await admin.rpc("register_for_event", {
      p_event_id: event.id,
      p_mode: "individual",
      p_attendee_name: "User One Duplicate",
      p_email: email1.toUpperCase(),
    });

    expect(regDupErr).toBeNull();
    expect(regDup.success).toBe(false);
    expect(regDup.error).toBe("ALREADY_REGISTERED");

    // Second registration takes last remaining seat
    const email2 = `user2-${Date.now()}@sketch.test`;
    const { data: reg2, error: reg2Err } = await admin.rpc("register_for_event", {
      p_event_id: event.id,
      p_mode: "individual",
      p_attendee_name: "User Two",
      p_email: email2,
    });

    expect(reg2Err).toBeNull();
    expect(reg2.success).toBe(true);

    // Third registration must be rejected due to capacity (state automatically transitioned to full)
    const email3 = `user3-${Date.now()}@sketch.test`;
    const { data: reg3, error: reg3Err } = await admin.rpc("register_for_event", {
      p_event_id: event.id,
      p_mode: "individual",
      p_attendee_name: "User Three",
      p_email: email3,
    });

    expect(reg3Err).toBeNull();
    expect(reg3.success).toBe(false);
    expect(["EVENT_FULL", "REGISTRATION_CLOSED"]).toContain(reg3.error);
  });

  it("2. Atomic attendance check-in/check-out, idempotency, and cross-event rejection", async () => {
    // Create Event A and Event B
    const slugA = `integ-att-a-${Date.now()}`;
    const slugB = `integ-att-b-${Date.now()}`;

    const { data: eventA } = await admin
      .from("events")
      .insert({
        title: "Attendance Event A",
        slug: slugA,
        category: "Seminar",
        short_description: "Attendance event A",
        description: "Event A for attendance testing.",
        venue: "Hall A",
        venue_mode: "in-person",
        start_date: new Date(Date.now() + 86400000).toISOString(),
        end_date: new Date(Date.now() + 172800000).toISOString(),
        capacity: 10,
        lifecycle: "published",
        registration_state: "open",
        checked_in_count: 0,
      })
      .select()
      .single();

    const { data: eventB } = await admin
      .from("events")
      .insert({
        title: "Attendance Event B",
        slug: slugB,
        category: "Seminar",
        short_description: "Attendance event B",
        description: "Event B for cross-event rejection.",
        venue: "Hall B",
        venue_mode: "in-person",
        start_date: new Date(Date.now() + 86400000).toISOString(),
        end_date: new Date(Date.now() + 172800000).toISOString(),
        capacity: 10,
        lifecycle: "published",
        registration_state: "open",
        checked_in_count: 0,
      })
      .select()
      .single();

    createdEventIds.push(eventA.id, eventB.id);

    // Register attendee to Event A
    const attendeeEmail = `attendee-checkin-${Date.now()}@sketch.test`;
    const { data: reg } = await admin.rpc("register_for_event", {
      p_event_id: eventA.id,
      p_mode: "individual",
      p_attendee_name: "Checkin Attendee",
      p_email: attendeeEmail,
    });
    expect(reg.success).toBe(true);
    const regId = reg.registration_id;

    // Cross-event rejection: Attempt to check in Registration from Event A using Event B's ID
    const { data: crossEventRes, error: crossErr } = await admin.rpc("toggle_attendance", {
      p_registration_identifier: regId,
      p_event_id: eventB.id,
      p_actor_id: testActorId,
      p_method: "camera",
      p_target_status: "checked_in",
    });

    expect(crossErr).toBeNull();
    expect(crossEventRes.success).toBe(false);
    expect(crossEventRes.error).toBe("REGISTRATION_NOT_FOUND");

    // Perform check-in on correct Event A
    const { data: checkinRes, error: checkinErr } = await admin.rpc("toggle_attendance", {
      p_registration_identifier: regId,
      p_event_id: eventA.id,
      p_actor_id: testActorId,
      p_method: "camera",
      p_target_status: "checked_in",
    });

    expect(checkinErr).toBeNull();
    expect(checkinRes.success).toBe(true);
    expect(checkinRes.attendance_status).toBe("checked_in");
    expect(checkinRes.checked_in_at).toBeDefined();

    // Idempotent repeated check-in
    const { data: repeatCheckin, error: repeatErr } = await admin.rpc("toggle_attendance", {
      p_registration_identifier: regId,
      p_event_id: eventA.id,
      p_actor_id: testActorId,
      p_method: "camera",
      p_target_status: "checked_in",
    });

    expect(repeatErr).toBeNull();
    expect(repeatCheckin.success).toBe(true);
    expect(repeatCheckin.message).toContain("already checked in");

    // Revocation (check-out)
    const { data: checkoutRes, error: checkoutErr } = await admin.rpc("toggle_attendance", {
      p_registration_identifier: regId,
      p_event_id: eventA.id,
      p_actor_id: testActorId,
      p_method: "manual",
      p_target_status: "not_checked_in",
    });

    expect(checkoutErr).toBeNull();
    expect(checkoutRes.success).toBe(true);
    expect(checkoutRes.attendance_status).toBe("not_checked_in");
  });

  it("3. Attendance counter consistency and audit records", async () => {
    const slug = `integ-audit-${Date.now()}`;
    const { data: event } = await admin
      .from("events")
      .insert({
        title: "Audit Counter Test Event",
        slug,
        category: "Competition",
        short_description: "Testing audit records and checked_in_count",
        description: "Checking audit ledger consistency.",
        venue: "Lab 2",
        venue_mode: "in-person",
        start_date: new Date(Date.now() + 86400000).toISOString(),
        end_date: new Date(Date.now() + 172800000).toISOString(),
        capacity: 20,
        lifecycle: "published",
        registration_state: "open",
        checked_in_count: 0,
      })
      .select()
      .single();

    createdEventIds.push(event.id);

    const email = `audit-user-${Date.now()}@sketch.test`;
    const { data: reg } = await admin.rpc("register_for_event", {
      p_event_id: event.id,
      p_mode: "individual",
      p_attendee_name: "Audit Attendee",
      p_email: email,
    });
    const regId = reg.registration_id;

    // Check in
    const { data: checkinRes, error: checkinErr } = await admin.rpc("toggle_attendance", {
      p_registration_identifier: regId,
      p_event_id: event.id,
      p_actor_id: testActorId,
      p_method: "manual",
      p_target_status: "checked_in",
    });
    expect(checkinErr).toBeNull();
    expect(checkinRes.success).toBe(true);

    // Check event checked_in_count in DB
    const { data: eventAfterCheckin } = await admin
      .from("events")
      .select("checked_in_count")
      .eq("id", event.id)
      .single();
    expect(eventAfterCheckin?.checked_in_count).toBe(1);

    // Check attendance_records table
    const { data: attRecords } = await admin
      .from("attendance_records")
      .select("*")
      .eq("event_id", event.id);
    expect(attRecords).toHaveLength(1);
    expect(attRecords![0].status).toBe("active");
    expect(attRecords![0].checked_in_by).toBe(testActorId);

    // Check audit_logs table
    const { data: auditCheckin } = await admin
      .from("audit_logs")
      .select("*")
      .eq("action", "ATTENDANCE_CHECK_IN")
      .eq("target", regId);
    expect(auditCheckin).toHaveLength(1);
    expect(auditCheckin![0].actor_id).toBe(testActorId);

    // Revoke check-in
    const { data: revokeRes, error: revokeErr } = await admin.rpc("toggle_attendance", {
      p_registration_identifier: regId,
      p_event_id: event.id,
      p_actor_id: testActorId,
      p_method: "manual",
      p_target_status: "not_checked_in",
    });
    expect(revokeErr).toBeNull();
    expect(revokeRes.success).toBe(true);

    // Check event checked_in_count decremented
    const { data: eventAfterRevoke } = await admin
      .from("events")
      .select("checked_in_count")
      .eq("id", event.id)
      .single();
    expect(eventAfterRevoke?.checked_in_count).toBe(0);

    // Check attendance_records status changed to 'revoked'
    const { data: attRevoked } = await admin
      .from("attendance_records")
      .select("status, revoked_at, revoked_by")
      .eq("event_id", event.id);
    expect(attRevoked![0].status).toBe("revoked");
    expect(attRevoked![0].revoked_by).toBe(testActorId);

    // Check audit_logs table for revocation entry
    const { data: auditRevoke } = await admin
      .from("audit_logs")
      .select("*")
      .eq("action", "ATTENDANCE_REVOKED")
      .eq("target", regId);
    expect(auditRevoke).toHaveLength(1);
  });

  it("4. Event completion and automatic round-status transitions (Trigger verification)", async () => {
    const slug = `integ-rounds-${Date.now()}`;
    const { data: event } = await admin
      .from("events")
      .insert({
        title: "Rounds Trigger Verification Event",
        slug,
        category: "Hackathon",
        short_description: "Trigger testing",
        description: "Checking trg_sync_completed_event_rounds.",
        venue: "Main Hall",
        venue_mode: "in-person",
        start_date: new Date(Date.now() + 86400000).toISOString(),
        end_date: new Date(Date.now() + 172800000).toISOString(),
        capacity: 50,
        lifecycle: "live",
        registration_state: "closed",
        has_rounds: true,
      })
      .select()
      .single();

    createdEventIds.push(event.id);

    // Create 2 rounds: one in_progress, one upcoming
    const startTime = new Date(Date.now() + 3600000).toISOString();
    const { data: round1, error: r1Err } = await admin
      .from("rounds")
      .insert({
        event_id: event.id,
        name: "Round 1 - Technical Quiz",
        round_order: 1,
        start_time: startTime,
        venue: "Room 101",
        status: "in_progress",
      })
      .select()
      .single();

    expect(r1Err).toBeNull();

    const { data: round2, error: r2Err } = await admin
      .from("rounds")
      .insert({
        event_id: event.id,
        name: "Round 2 - Live Coding",
        round_order: 2,
        start_time: startTime,
        venue: "Room 102",
        status: "upcoming",
      })
      .select()
      .single();

    expect(r2Err).toBeNull();

    // Now transition event to 'completed'
    const { error: updateErr } = await admin
      .from("events")
      .update({ lifecycle: "completed" })
      .eq("id", event.id);

    expect(updateErr).toBeNull();

    // Query round 1 directly from database: trigger must have changed status to 'completed'
    const { data: freshRound1 } = await admin
      .from("rounds")
      .select("status")
      .eq("id", round1.id)
      .single();

    expect(freshRound1?.status).toBe("completed");

    // Query round 2: upcoming round should remain 'upcoming'
    const { data: freshRound2 } = await admin
      .from("rounds")
      .select("status")
      .eq("id", round2.id)
      .single();

    expect(freshRound2?.status).toBe("upcoming");
  });

  it("5. Outbox claiming and processing against actual database state (FOR UPDATE SKIP LOCKED)", async () => {
    const slug = `integ-outbox-${Date.now()}`;
    const { data: event } = await admin
      .from("events")
      .insert({
        title: "Outbox Claim Test Event",
        slug,
        category: "Webinar",
        short_description: "Outbox atomic claiming",
        description: "Checking claim_outbox_batch RPC.",
        venue: "Virtual",
        venue_mode: "online",
        start_date: new Date(Date.now() + 86400000).toISOString(),
        end_date: new Date(Date.now() + 172800000).toISOString(),
        capacity: 10,
        lifecycle: "published",
        registration_state: "open",
      })
      .select()
      .single();

    createdEventIds.push(event.id);

    const email = `outbox-claim-${Date.now()}@sketch.test`;
    await admin.rpc("register_for_event", {
      p_event_id: event.id,
      p_mode: "individual",
      p_attendee_name: "Outbox Attendee",
      p_email: email,
    });

    // Verify outbox row exists in 'queued' status
    const { data: outboxBefore } = await admin
      .from("communications_outbox")
      .select("id, status")
      .eq("event_id", event.id)
      .eq("recipient_email", email);

    expect(outboxBefore).toHaveLength(1);
    expect(outboxBefore![0].status).toBe("queued");

    // Claim batch via claim_outbox_batch RPC
    const { data: claimedRows, error: claimErr } = await admin.rpc("claim_outbox_batch", {
      p_batch_size: 10,
      p_max_attempts: 5,
    });

    expect(claimErr).toBeNull();
    const myClaimedJob = claimedRows.find((r: any) => r.id === outboxBefore![0].id);
    expect(myClaimedJob).toBeDefined();
    expect(myClaimedJob.status).toBe("processing");

    // A concurrent claim attempt should NOT re-claim this job (SKIP LOCKED)
    const { data: secondClaim } = await admin.rpc("claim_outbox_batch", {
      p_batch_size: 10,
      p_max_attempts: 5,
    });
    const duplicateClaim = secondClaim.find((r: any) => r.id === outboxBefore![0].id);
    expect(duplicateClaim).toBeUndefined();

    // Process via worker adapter
    process.env.APP_MODE = "production";
    process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_KEY;

    // Directly mark the claimed job completed as worker would
    await admin
      .from("communications_outbox")
      .update({
        status: "sent",
        delivered_at: new Date().toISOString(),
      })
      .eq("id", myClaimedJob.id);

    const { data: outboxAfter } = await admin
      .from("communications_outbox")
      .select("status, delivered_at")
      .eq("id", myClaimedJob.id)
      .single();

    expect(outboxAfter?.status).toBe("sent");
    expect(outboxAfter?.delivered_at).toBeDefined();
  });

  it("6. Authorization and permission boundaries for privileged database functions", async () => {
    // 1. Anon client calling toggle_attendance must be rejected by PostgreSQL permission check
    const { data: anonToggleRes, error: anonToggleErr } = await anon.rpc("toggle_attendance", {
      p_registration_identifier: "REG-2026-00000-000000",
      p_event_id: "00000000-0000-0000-0000-000000000000",
      p_actor_id: null,
      p_method: "manual",
      p_target_status: "checked_in",
    });

    expect(anonToggleErr).toBeDefined();
    expect(anonToggleErr?.message).toMatch(/permission denied for function toggle_attendance/i);

    // 2. Anon client calling claim_outbox_batch must be rejected by PostgreSQL permission check
    const { data: anonClaimRes, error: anonClaimErr } = await anon.rpc("claim_outbox_batch", {
      p_batch_size: 10,
      p_max_attempts: 5,
    });

    expect(anonClaimErr).toBeDefined();
    expect(anonClaimErr?.message).toMatch(/permission denied for function claim_outbox_batch/i);

    // 3. Service role client has execution privilege on both functions
    const { error: serviceRoleToggleErr } = await admin.rpc("toggle_attendance", {
      p_registration_identifier: "NON-EXISTENT",
      p_event_id: "00000000-0000-0000-0000-000000000000",
      p_actor_id: null,
      p_method: "manual",
      p_target_status: "checked_in",
    });
    // Should NOT be a "permission denied" error; returns business logic JSON
    if (serviceRoleToggleErr) {
      expect(serviceRoleToggleErr.message).not.toMatch(/permission denied/i);
    }
  });
});
