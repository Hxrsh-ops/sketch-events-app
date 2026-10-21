import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/cron/process-outbox/route";
import { getServerCronSecret } from "@/lib/env.server";

const SUPABASE_URL = "http://127.0.0.1:54321";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const isDbOnline = await fetch("http://127.0.0.1:54321/rest/v1/", {
  signal: AbortSignal.timeout(2500),
}).then(r => r.ok).catch(() => false);

describe.skipIf(!isDbOnline)("Phase 6 Security Remediation & Contract Verification", () => {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const createdEventIds: string[] = [];
  const createdAuthUserIds: string[] = [];
  const masterAdminActorId = "3c3f407e-9c73-4b2f-9b97-22c3e0afedca";
  let analystActorId: string = "";

  beforeAll(async () => {
    // 1. Verify DB reachability
    const { error: pingErr } = await admin.from("events").select("id").limit(1);
    if (pingErr) {
      throw new Error(`Local Supabase database is unreachable: ${pingErr.message}`);
    }

    // 2. Create an unauthorized auth user + admin profile (analyst role) to test RBAC enforcement
    const analystEmail = `analyst-${Date.now()}@sketch.test`;
    const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
      email: analystEmail,
      password: "Password123!",
      email_confirm: true,
    });
    if (authErr || !authUser?.user) {
      throw new Error(`Failed to create test auth user: ${authErr?.message}`);
    }

    analystActorId = authUser.user.id;
    createdAuthUserIds.push(analystActorId);

    const { error: profileErr } = await admin.from("admin_profiles").insert({
      id: analystActorId,
      email: analystEmail,
      full_name: "Security Test Analyst",
      role: "analyst",
    });
    if (profileErr) {
      throw new Error(`Failed to create test analyst profile: ${profileErr.message}`);
    }
  });

  afterAll(async () => {
    // Clean up created events and all cascaded or related records
    for (const eventId of createdEventIds) {
      await admin.from("audit_logs").delete().eq("details->>event_id", eventId);
      await admin.from("attendance_records").delete().eq("event_id", eventId);
      await admin.from("communications_outbox").delete().eq("event_id", eventId);
      await admin.from("certificates").delete().eq("event_id", eventId);
      await admin.from("registrations").delete().eq("event_id", eventId);
      await admin.from("teams").delete().eq("event_id", eventId);
      await admin.from("events").delete().eq("id", eventId);
    }

    for (const userId of createdAuthUserIds) {
      await admin.from("admin_profiles").delete().eq("id", userId);
      await admin.auth.admin.deleteUser(userId);
    }
  });

  it("1. Certificate Privacy: direct anon table access is blocked, scoped RPC protects recipient email", async () => {
    // Create an event
    const slug = `cert-sec-${Date.now()}`;
    const { data: event, error: eventErr } = await admin
      .from("events")
      .insert({
        title: "Certificate Privacy Event",
        slug,
        category: "Ceremony",
        short_description: "Certificate privacy verification",
        description: "Checking certificate table lockdown and scoped RPC.",
        venue: "Auditorium",
        venue_mode: "in-person",
        start_date: new Date(Date.now() - 86400000).toISOString(),
        end_date: new Date(Date.now() - 3600000).toISOString(),
        capacity: 100,
        lifecycle: "completed",
        registration_state: "closed",
        has_teams: false,
      })
      .select()
      .single();

    expect(eventErr).toBeNull();
    createdEventIds.push(event.id);

    const certNumber = `SKETCH-CERT-${Date.now()}-TST`;
    const secretEmail = "confidential-attendee@sketch.test";
    const recipientName = "Alice Private";

    // Insert issued certificate using admin client
    const { error: certInsertErr } = await admin.from("certificates").insert({
      event_id: event.id,
      certificate_number: certNumber,
      recipient_name: recipientName,
      recipient_email: secretEmail,
      status: "issued",
      issued_at: new Date().toISOString(),
    });
    expect(certInsertErr).toBeNull();

    // A. Anonymous query to public.certificates MUST be denied or return empty (REVOKE ALL + RLS)
    const { data: anonTableData, error: anonTableErr } = await anon
      .from("certificates")
      .select("*")
      .eq("certificate_number", certNumber);

    // Either PostgREST returns a permission denied error or zero records
    if (anonTableErr) {
      expect(anonTableErr.message).toMatch(/permission denied|does not exist/i);
    } else {
      expect(anonTableData).toEqual([]);
    }

    // B. Anonymous call to verify_certificate RPC MUST succeed with scoped metadata
    const { data: rpcData, error: rpcErr } = await anon.rpc("verify_certificate", {
      p_certificate_number: certNumber,
    });

    expect(rpcErr).toBeNull();
    expect(rpcData).toBeDefined();
    expect(rpcData.length).toBe(1);

    const certRecord = rpcData[0];
    expect(certRecord.is_valid).toBe(true);
    expect(certRecord.certificate_number).toBe(certNumber);
    expect(certRecord.event_title).toBe("Certificate Privacy Event");
    expect(certRecord.recipient_name).toBe(recipientName);
    expect(certRecord.status).toBe("issued");
    expect(certRecord.issued_at).toBeDefined();

    // CRITICAL: Recipient email and internal IDs must NOT be returned
    expect(certRecord.recipient_email).toBeUndefined();
    expect(certRecord.user_id).toBeUndefined();
    expect(certRecord.event_id).toBeUndefined();
    expect(certRecord.id).toBeUndefined();
  });

  it("2. Case-Insensitive Duplicate Registration: blocks email variants across cases and whitespace", async () => {
    const slug = `reg-ci-${Date.now()}`;
    const { data: event, error: eventErr } = await admin
      .from("events")
      .insert({
        title: "Case Insensitive Reg Event",
        slug,
        category: "Workshop",
        short_description: "Case-insensitive registration check",
        description: "Checking duplicate detection.",
        venue: "Hall B",
        venue_mode: "in-person",
        start_date: new Date(Date.now() + 86400000).toISOString(),
        end_date: new Date(Date.now() + 172800000).toISOString(),
        capacity: 10,
        lifecycle: "published",
        registration_state: "open",
        has_teams: false,
      })
      .select()
      .single();

    expect(eventErr).toBeNull();
    createdEventIds.push(event.id);

    const baseEmail = `test-user-${Date.now()}@sketch.test`;

    // First registration with lowercase
    const { data: reg1, error: reg1Err } = await admin.rpc("register_for_event", {
      p_event_id: event.id,
      p_mode: "individual",
      p_attendee_name: "Original User",
      p_email: baseEmail,
    });
    expect(reg1Err).toBeNull();
    expect(reg1.success).toBe(true);

    // Second registration with uppercase
    const { data: regUpper } = await admin.rpc("register_for_event", {
      p_event_id: event.id,
      p_mode: "individual",
      p_attendee_name: "Duplicate User Upper",
      p_email: baseEmail.toUpperCase(),
    });
    expect(regUpper.success).toBe(false);
    expect(regUpper.error).toBe("ALREADY_REGISTERED");

    // Third registration with surrounding whitespace and mixed case
    const { data: regPadded } = await admin.rpc("register_for_event", {
      p_event_id: event.id,
      p_mode: "individual",
      p_attendee_name: "Duplicate User Padded",
      p_email: `  ${baseEmail.toUpperCase()}  `,
    });
    expect(regPadded.success).toBe(false);
    expect(regPadded.error).toBe("ALREADY_REGISTERED");
  });

  it("3. Registration Lifecycle: cancellation cleanly permits re-registration", async () => {
    const slug = `cancel-re-reg-${Date.now()}`;
    const { data: event, error: eventErr } = await admin
      .from("events")
      .insert({
        title: "Cancellation Re-Reg Event",
        slug,
        category: "Hackathon",
        short_description: "Cancellation check",
        description: "Testing partial unique index.",
        venue: "Innovation Hub",
        venue_mode: "in-person",
        start_date: new Date(Date.now() + 86400000).toISOString(),
        end_date: new Date(Date.now() + 172800000).toISOString(),
        capacity: 10,
        lifecycle: "published",
        registration_state: "open",
        has_teams: false,
      })
      .select()
      .single();

    expect(eventErr).toBeNull();
    createdEventIds.push(event.id);

    const email = `cycler-${Date.now()}@sketch.test`;

    // 1. Initial registration
    const { data: initialReg, error: initErr } = await admin.rpc("register_for_event", {
      p_event_id: event.id,
      p_mode: "individual",
      p_attendee_name: "Cycle Attendee",
      p_email: email,
    });
    expect(initErr).toBeNull();
    expect(initialReg.success).toBe(true);

    // 2. Cancel registration (status = 'cancelled')
    const { error: cancelErr } = await admin
      .from("registrations")
      .update({ status: "cancelled" })
      .eq("registration_id", initialReg.registration_id);
    expect(cancelErr).toBeNull();

    // 3. Re-registration with the same email MUST succeed under partial index
    const { data: reReg, error: reRegErr } = await admin.rpc("register_for_event", {
      p_event_id: event.id,
      p_mode: "individual",
      p_attendee_name: "Cycle Attendee Returned",
      p_email: email,
    });

    expect(reRegErr).toBeNull();
    expect(reReg.success).toBe(true);
    expect(reReg.registration_id).not.toBe(initialReg.registration_id);
  });

  it("4. Team Registration: blocks duplicate emails inside payload and against existing attendees", async () => {
    const slug = `team-sec-${Date.now()}`;
    const { data: event, error: eventErr } = await admin
      .from("events")
      .insert({
        title: "Team Security Event",
        slug,
        category: "Hackathon",
        short_description: "Team duplicate validation",
        description: "Checking team validation rules.",
        venue: "Lab A",
        venue_mode: "in-person",
        start_date: new Date(Date.now() + 86400000).toISOString(),
        end_date: new Date(Date.now() + 172800000).toISOString(),
        capacity: 20,
        lifecycle: "published",
        registration_state: "open",
        has_teams: true,
        min_team_size: 2,
        max_team_size: 4,
      })
      .select()
      .single();

    expect(eventErr).toBeNull();
    createdEventIds.push(event.id);

    const captainEmail = `captain-${Date.now()}@sketch.test`;
    const member1Email = `member1-${Date.now()}@sketch.test`;

    // A. Member email identical to captain email MUST be rejected
    const { data: captainDupResult } = await admin.rpc("register_for_event", {
      p_event_id: event.id,
      p_mode: "team",
      p_attendee_name: "Captain Test",
      p_email: captainEmail,
      p_team_name: "Team Alpha",
      p_team_members: [
        { name: "Duplicate Member", email: captainEmail },
      ],
    });
    expect(captainDupResult.success).toBe(false);
    expect(captainDupResult.error).toBe("DUPLICATE_TEAM_EMAIL");

    // B. Duplicate email within the member list itself MUST be rejected
    const { data: internalDupResult } = await admin.rpc("register_for_event", {
      p_event_id: event.id,
      p_mode: "team",
      p_attendee_name: "Captain Test",
      p_email: captainEmail,
      p_team_name: "Team Beta",
      p_team_members: [
        { name: "Member One", email: member1Email },
        { name: "Member One Copy", email: member1Email.toUpperCase() },
      ],
    });
    expect(internalDupResult.success).toBe(false);
    expect(internalDupResult.error).toBe("DUPLICATE_TEAM_MEMBER_EMAIL");

    // C. Member email matching an existing active registration MUST be rejected
    // First register someone individually
    const existingSoloEmail = `solo-${Date.now()}@sketch.test`;
    const { data: soloReg } = await admin.rpc("register_for_event", {
      p_event_id: event.id,
      p_mode: "individual",
      p_attendee_name: "Solo Registered",
      p_email: existingSoloEmail,
    });
    expect(soloReg.success).toBe(true);

    // Try to register team with that member
    const { data: conflictResult } = await admin.rpc("register_for_event", {
      p_event_id: event.id,
      p_mode: "team",
      p_attendee_name: "Captain Test",
      p_email: captainEmail,
      p_team_name: "Team Gamma",
      p_team_members: [
        { name: "Conflict Member", email: existingSoloEmail },
      ],
    });
    expect(conflictResult.success).toBe(false);
    expect(conflictResult.error).toBe("MEMBER_ALREADY_REGISTERED");
  });

  it("5. Attendance Authorization: enforces actor presence, RBAC role, and cross-event isolation", async () => {
    const slug1 = `att-sec1-${Date.now()}`;
    const slug2 = `att-sec2-${Date.now()}`;

    const { data: event1 } = await admin
      .from("events")
      .insert({
        title: "Attendance Event 1",
        slug: slug1,
        category: "Conference",
        short_description: "Attendance check",
        description: "Testing attendance toggle authorization.",
        venue: "Hall 1",
        venue_mode: "in-person",
        start_date: new Date(Date.now() + 86400000).toISOString(),
        end_date: new Date(Date.now() + 172800000).toISOString(),
        capacity: 10,
        lifecycle: "published",
        registration_state: "open",
        has_teams: false,
      })
      .select()
      .single();

    const { data: event2 } = await admin
      .from("events")
      .insert({
        title: "Attendance Event 2",
        slug: slug2,
        category: "Conference",
        short_description: "Attendance check 2",
        description: "Cross event check.",
        venue: "Hall 2",
        venue_mode: "in-person",
        start_date: new Date(Date.now() + 86400000).toISOString(),
        end_date: new Date(Date.now() + 172800000).toISOString(),
        capacity: 10,
        lifecycle: "published",
        registration_state: "open",
        has_teams: false,
      })
      .select()
      .single();

    createdEventIds.push(event1.id, event2.id);

    const { data: reg } = await admin.rpc("register_for_event", {
      p_event_id: event1.id,
      p_mode: "individual",
      p_attendee_name: "Attendee For Attendance",
      p_email: `att-attendee-${Date.now()}@sketch.test`,
    });
    expect(reg.success).toBe(true);

    // A. Anonymous client direct call to toggle_attendance is strictly revoked
    const { error: anonRpcErr } = await anon.rpc("toggle_attendance", {
      p_registration_identifier: reg.registration_id,
      p_event_id: event1.id,
      p_actor_id: masterAdminActorId,
    });
    expect(anonRpcErr).not.toBeNull();
    expect(anonRpcErr?.message).toMatch(/permission denied|does not exist/i);

    // B. Missing actor_id MUST return ACTOR_REQUIRED
    const { data: nullActorResult } = await admin.rpc("toggle_attendance", {
      p_registration_identifier: reg.registration_id,
      p_event_id: event1.id,
      p_actor_id: null,
    });
    expect(nullActorResult.success).toBe(false);
    expect(nullActorResult.error).toBe("ACTOR_REQUIRED");

    // C. Non-existent actor_id MUST return UNAUTHORIZED_ACTOR
    const randomUuid = "99999999-9999-9999-9999-999999999999";
    const { data: fakeActorResult } = await admin.rpc("toggle_attendance", {
      p_registration_identifier: reg.registration_id,
      p_event_id: event1.id,
      p_actor_id: randomUuid,
    });
    expect(fakeActorResult.success).toBe(false);
    expect(fakeActorResult.error).toBe("UNAUTHORIZED_ACTOR");

    // D. Actor with unauthorized role ('analyst') MUST return UNAUTHORIZED_ACTOR
    const { data: analystResult } = await admin.rpc("toggle_attendance", {
      p_registration_identifier: reg.registration_id,
      p_event_id: event1.id,
      p_actor_id: analystActorId,
    });
    expect(analystResult.success).toBe(false);
    expect(analystResult.error).toBe("UNAUTHORIZED_ACTOR");

    // E. Cross-event registration identifier MUST return REGISTRATION_NOT_FOUND
    const { data: crossEventResult } = await admin.rpc("toggle_attendance", {
      p_registration_identifier: reg.registration_id,
      p_event_id: event2.id, // Wrong event!
      p_actor_id: masterAdminActorId,
    });
    expect(crossEventResult.success).toBe(false);
    expect(crossEventResult.error).toBe("REGISTRATION_NOT_FOUND");

    // F. Authorized actor ('master_admin') MUST succeed and record attendance & audit log
    const { data: successResult } = await admin.rpc("toggle_attendance", {
      p_registration_identifier: reg.registration_id,
      p_event_id: event1.id,
      p_actor_id: masterAdminActorId,
      p_method: "camera",
    });
    expect(successResult.success).toBe(true);
    expect(successResult.attendance_status).toBe("checked_in");

    // Verify audit log entry was written
    const { data: auditLog } = await admin
      .from("audit_logs")
      .select("*")
      .eq("target", reg.registration_id)
      .eq("action", "ATTENDANCE_CHECK_IN")
      .single();

    expect(auditLog).toBeDefined();
    expect(auditLog.actor_id).toBe(masterAdminActorId);
  });

  it("6. Outbox Cron Route: authenticated GET succeeds, unauthenticated GET returns 405 Method Not Allowed", async () => {
    const cronSecret = getServerCronSecret() || "dev-cron-secret";
    process.env.CRON_SECRET = cronSecret;

    // A. Unauthenticated GET request -> 405 Method Not Allowed
    const unauthReq = new NextRequest("http://localhost:3000/api/cron/process-outbox", {
      method: "GET",
    });
    const unauthRes = await GET(unauthReq);
    expect(unauthRes.status).toBe(405);
    const unauthBody = await unauthRes.json();
    expect(unauthBody.error).toBe("METHOD_NOT_ALLOWED");

    // B. Invalid authorization GET request -> 405 Method Not Allowed
    const invalidAuthReq = new NextRequest("http://localhost:3000/api/cron/process-outbox", {
      method: "GET",
      headers: {
        authorization: "Bearer wrong-secret",
      },
    });
    const invalidAuthRes = await GET(invalidAuthReq);
    expect(invalidAuthRes.status).toBe(405);

    // C. Authenticated GET request with valid CRON_SECRET -> 200 OK
    const authReq = new NextRequest("http://localhost:3000/api/cron/process-outbox?batch_size=5", {
      method: "GET",
      headers: {
        authorization: `Bearer ${cronSecret}`,
      },
    });
    const authRes = await GET(authReq);
    expect(authRes.status).toBe(200);
    const authBody = await authRes.json();
    expect(authBody.success).toBe(true);
    expect(typeof authBody.processed).toBe("number");
  });
});
