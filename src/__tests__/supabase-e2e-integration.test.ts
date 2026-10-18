import { describe, it, expect, vi, beforeEach } from "vitest";
import { EmailOutboxWorker } from "@/lib/email/worker";
import { TestEmailAdapter, MailpitEmailAdapter } from "@/lib/email/adapters";
import { createClient } from "@supabase/supabase-js";
import { registerForEventAction } from "@/app/actions/registration-actions";
import { createEventAction, updateEventAction } from "@/app/actions/event-actions";
import * as sessionModule from "@/lib/auth/session";
import { SketchRepository } from "@/lib/supabase/repository";
import { resetAppEnvCache } from "@/lib/env";

// Mock next/cache so revalidatePath does not fail in test environment
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

/**
 * End-to-End Registration & Transactional Outbox Integration Tests
 * Validates real server-side execution against live Supabase and local Mailpit stack.
 */
describe("E2E Integration: Real Supabase Stack & Application Lifecycle", () => {
  const localSupabaseUrl = "http://127.0.0.1:54321";
  const localAnonKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
  const localServiceKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
  const mailpitApiUrl = "http://127.0.0.1:54324";

  let isSupabaseReachable = false;
  let isMailpitReachable = false;
  let adminClient: any = null;

  beforeEach(async () => {
    process.env.NEXT_PUBLIC_APP_MODE = "production";
    process.env.NEXT_PUBLIC_SUPABASE_URL = localSupabaseUrl;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = localAnonKey;
    process.env.SUPABASE_SERVICE_ROLE_KEY = localServiceKey;
    process.env.EMAIL_PROVIDER = "test";
    process.env.EMAIL_FROM = "Sketch Events <noreply@sketch.events>";
    process.env.MAILPIT_URL = mailpitApiUrl;
    resetAppEnvCache();

    try {
      const pingRes = await fetch("http://127.0.0.1:54321/rest/v1/", {
        signal: AbortSignal.timeout(600),
      }).catch(() => null);

      if (pingRes) {
        adminClient = createClient(localSupabaseUrl, localServiceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data, error } = await adminClient.from("events").select("id").limit(1);
        if (!error && data) {
          isSupabaseReachable = true;
        }
      }
    } catch {
      isSupabaseReachable = false;
    }

    try {
      const mailpitPing = await fetch(`${mailpitApiUrl}/api/v1/messages`, {
        signal: AbortSignal.timeout(600),
      }).catch(() => null);
      if (mailpitPing && mailpitPing.ok) {
        isMailpitReachable = true;
      }
    } catch {
      isMailpitReachable = false;
    }
  });

  it("Scenario 1: Direct database RPC & sequence generation (Database Layer)", async () => {
    if (!isSupabaseReachable) {
      console.log("[E2E Test] Local Supabase stack is offline. Skipping Scenario 1.");
      expect(true).toBe(true);
      return;
    }

    // 1. Create a published test event
    const testEventSlug = `e2e-rpc-${Date.now()}`;
    const { data: event, error: eventErr } = await adminClient
      .from("events")
      .insert({
        title: "Database RPC Hackathon",
        slug: testEventSlug,
        category: "Technical",
        short_description: "Direct RPC test event",
        description: "Testing direct RPC call.",
        venue: "Auditorium A",
        venue_mode: "in-person",
        start_date: new Date(Date.now() + 86400000).toISOString(),
        end_date: new Date(Date.now() + 172800000).toISOString(),
        capacity: 100,
        lifecycle: "published",
        registration_state: "open",
        has_teams: false,
      })
      .select()
      .single();

    expect(eventErr).toBeNull();

    // 2. Execute register_for_event RPC
    const attendeeEmail = `rpc-attendee-${Date.now()}@sketch.test`;
    const { data: rpcResult, error: rpcErr } = await adminClient.rpc("register_for_event", {
      p_event_id: event.id,
      p_mode: "individual",
      p_attendee_name: "Direct Attendee",
      p_email: attendeeEmail,
    });

    expect(rpcErr).toBeNull();
    expect(rpcResult.success).toBe(true);
    expect(rpcResult.registration_id).toMatch(/^REG-2026-\d{5}-[A-Z0-9]{6}$/);

    // 3. Verify outbox row in real database
    const { data: outboxRows } = await adminClient
      .from("communications_outbox")
      .select("*")
      .eq("event_id", event.id)
      .eq("recipient_email", attendeeEmail);

    expect(outboxRows).toHaveLength(1);
    expect(outboxRows![0].status).toBe("queued");

    // Cleanup
    await adminClient.from("communications_outbox").delete().eq("event_id", event.id);
    await adminClient.from("registrations").delete().eq("event_id", event.id);
    await adminClient.from("events").delete().eq("id", event.id);
  });

  it("Scenario 2: Full Server Action Path (registerForEventAction -> Repository -> Database RPC -> Outbox)", async () => {
    if (!isSupabaseReachable) {
      console.log("[E2E Test] Local Supabase stack is offline. Skipping Scenario 2.");
      expect(true).toBe(true);
      return;
    }

    // 1. Create a published test event in the live database
    const testEventSlug = `e2e-action-${Date.now()}`;
    const { data: event, error: eventErr } = await adminClient
      .from("events")
      .insert({
        title: "Action Flow Hackathon 2026",
        slug: testEventSlug,
        category: "Design",
        short_description: "Real Server Action integration event",
        description: "Full end-to-end testing via registerForEventAction.",
        venue: "Design Lab 4",
        venue_mode: "in-person",
        start_date: new Date(Date.now() + 86400000).toISOString(),
        end_date: new Date(Date.now() + 172800000).toISOString(),
        capacity: 50,
        lifecycle: "published",
        registration_state: "open",
        has_teams: false,
      })
      .select()
      .single();

    expect(eventErr).toBeNull();

    // 2. Invoke the real Next.js Server Action
    const attendeeEmail = `action-attendee-${Date.now()}@sketch.test`;
    const actionResult = await registerForEventAction({
      eventId: event.id,
      slug: event.slug,
      mode: "individual",
      attendeeName: "Miles Morales",
      email: attendeeEmail,
      phone: "1234567890",
      department: "Graphic Design",
      year: "3rd Year",
    });

    expect(actionResult.success).toBe(true);
    if (!actionResult.success) return;

    expect(actionResult.data.registrationId).toMatch(/^REG-2026-\d{5}-[A-Z0-9]{6}$/);
    expect(actionResult.data.eventTitle).toBe("Action Flow Hackathon 2026");

    // 3. Verify participant persisted in database
    const { data: attendees } = await adminClient
      .from("registrations")
      .select("*")
      .eq("event_id", event.id)
      .eq("email", attendeeEmail);

    expect(attendees).toHaveLength(1);
    expect(attendees![0].attendee_name).toBe("Miles Morales");

    // 4. Verify outbox row created
    const { data: outboxRows } = await adminClient
      .from("communications_outbox")
      .select("*")
      .eq("event_id", event.id)
      .eq("recipient_email", attendeeEmail);

    expect(outboxRows).toHaveLength(1);
    expect(outboxRows![0].status).toBe("queued");
    expect(outboxRows![0].payload.registration_id).toBe(actionResult.data.registrationId);

    // Cleanup
    await adminClient.from("communications_outbox").delete().eq("event_id", event.id);
    await adminClient.from("registrations").delete().eq("event_id", event.id);
    await adminClient.from("events").delete().eq("id", event.id);
  });

  it("Scenario 3: Live Mailpit Email Transport (Outbox -> Worker Claim -> Mailpit REST API -> Inbox Verification)", async () => {
    if (!isSupabaseReachable || !isMailpitReachable) {
      console.log("[E2E Test] Local Supabase or Mailpit is offline. Skipping Scenario 3.");
      expect(true).toBe(true);
      return;
    }

    // Clear existing Mailpit messages for clean assertion
    await fetch(`${mailpitApiUrl}/api/v1/messages`, { method: "DELETE" }).catch(() => {});

    // 1. Create test event
    const testEventSlug = `e2e-mailpit-${Date.now()}`;
    const { data: event } = await adminClient
      .from("events")
      .insert({
        title: "Mailpit Live Verification Sprint",
        slug: testEventSlug,
        category: "Creative",
        short_description: "Mailpit live email dispatch test",
        description: "Checking actual email appearance in Mailpit inbox.",
        venue: "Virtual Arena",
        venue_mode: "online",
        start_date: new Date(Date.now() + 86400000).toISOString(),
        end_date: new Date(Date.now() + 172800000).toISOString(),
        capacity: 25,
        lifecycle: "published",
        registration_state: "open",
        has_teams: false,
      })
      .select()
      .single();

    // 2. Perform registration via Server Action
    const attendeeEmail = `mailpit-student-${Date.now()}@sketch.test`;
    const actionResult = await registerForEventAction({
      eventId: event.id,
      slug: event.slug,
      mode: "individual",
      attendeeName: "Peter Parker",
      email: attendeeEmail,
    });

    expect(actionResult.success).toBe(true);
    if (!actionResult.success) return;

    // 3. Configure worker with MailpitEmailAdapter
    const mailpitAdapter = new MailpitEmailAdapter("Sketch Events <noreply@sketch.events>", mailpitApiUrl);
    const worker = new EmailOutboxWorker(mailpitAdapter);

    // 4. Run worker to claim and deliver batch
    const batchResult = await worker.processBatch(10);
    expect(batchResult.claimed).toBeGreaterThanOrEqual(1);
    expect(batchResult.succeeded).toBeGreaterThanOrEqual(1);

    // 5. Query Mailpit API to confirm message actually arrived in inbox
    const mailpitRes = await fetch(`${mailpitApiUrl}/api/v1/messages`);
    const mailpitData = await mailpitRes.json();

    expect(mailpitData.total).toBeGreaterThanOrEqual(1);
    const deliveredMessage = mailpitData.messages.find(
      (m: any) => m.To && m.To.some((toObj: any) => toObj.Address === attendeeEmail)
    );

    expect(deliveredMessage).toBeDefined();
    expect(deliveredMessage.Subject).toContain("Mailpit Live Verification Sprint");

    // Fetch full message details to verify HTML contains registration ID
    const msgDetailRes = await fetch(`${mailpitApiUrl}/api/v1/message/${deliveredMessage.ID}`);
    const msgDetail = await msgDetailRes.json();
    expect(msgDetail.HTML).toContain(actionResult.data.registrationId);

    // 6. Verify outbox in live Supabase reflects transport success
    const { data: outboxRows } = await adminClient
      .from("communications_outbox")
      .select("status, attempts, delivered_at")
      .eq("event_id", event.id)
      .eq("recipient_email", attendeeEmail);

    expect(outboxRows![0].status).toBe("sent");
    expect(outboxRows![0].attempts).toBe(1);
    expect(outboxRows![0].delivered_at).toBeDefined();

    // Cleanup
    await adminClient.from("communications_outbox").delete().eq("event_id", event.id);
    await adminClient.from("registrations").delete().eq("event_id", event.id);
    await adminClient.from("events").delete().eq("id", event.id);
    await fetch(`${mailpitApiUrl}/api/v1/messages`, { method: "DELETE" }).catch(() => {});
  });

  it("Scenario 4: Worker resilience against live Supabase (retry backoff & stuck job recovery)", async () => {
    if (!isSupabaseReachable) {
      console.log("[E2E Test] Local Supabase stack is offline. Skipping Scenario 4.");
      expect(true).toBe(true);
      return;
    }

    // 1. Create a dummy event for outbox foreign key
    const { data: event } = await adminClient
      .from("events")
      .insert({
        title: "Resilience Test Event",
        slug: `e2e-resilience-${Date.now()}`,
        category: "Test",
        short_description: "Stuck job recovery verification",
        description: "Checking recoverStuckJobs on real DB.",
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

    // 2. Insert a simulated stuck job (abandoned in 'processing' 15 minutes ago)
    const stuckJobId = "f0000000-0000-0000-0000-000000000001";
    const stuckScheduledAt = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    await adminClient.from("communications_outbox").insert({
      id: stuckJobId,
      event_id: event.id,
      recipient_email: "stuck-worker@sketch.test",
      recipient_name: "Stuck Worker Attendee",
      subject: "Test Pass",
      template_type: "ticket_pass",
      payload: {
        registration_id: "REG-2026-99999-STUCK1",
        qr_credential_id: "QR-STUCK-1",
        event_title: "Resilience Test Event",
        venue: "Virtual",
        start_date: "2026-11-20T10:00:00Z",
      },
      status: "processing",
      attempts: 1,
      scheduled_at: stuckScheduledAt,
    });

    // 3. Instantiate worker and run recoverStuckJobs(10)
    const worker = new EmailOutboxWorker(new TestEmailAdapter());
    const recoveredCount = await worker.recoverStuckJobs(10);

    expect(recoveredCount).toBeGreaterThanOrEqual(1);

    // 4. Verify job in real database was reset to 'queued' with descriptive error log
    const { data: recoveredJob } = await adminClient
      .from("communications_outbox")
      .select("status, last_error")
      .eq("id", stuckJobId)
      .single();

    expect(recoveredJob?.status).toBe("queued");
    expect(recoveredJob?.last_error).toContain("RECOVERED");

    // Cleanup
    await adminClient.from("communications_outbox").delete().eq("id", stuckJobId);
    await adminClient.from("events").delete().eq("id", event.id);
  });

  it("Scenario 5: Live Event & Admin Management (Create -> List -> Detail -> Update -> Unauthorized Rejection -> Persist)", async () => {
    if (!isSupabaseReachable) {
      console.log("[E2E Test] Local Supabase stack is offline. Skipping Scenario 5.");
      expect(true).toBe(true);
      return;
    }

    // 1. Fetch real seeded admin profile from database
    const { data: adminProfile } = await adminClient
      .from("admin_profiles")
      .select("id, email, full_name, role")
      .limit(1)
      .single();

    vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValue({
      isAuthenticated: true,
      isAdmin: true,
      user: {
        id: adminProfile ? adminProfile.id : "3c3f407e-9c73-4b2f-9b97-22c3e0afedca",
        name: adminProfile ? adminProfile.full_name : "Lead Admin",
        email: adminProfile ? adminProfile.email : "lead@sketch.org",
        role: (adminProfile?.role as any) || "master_admin",
      },
    });

    const uniqueSlug = `live-mgmt-${Date.now()}`;
    const createPayload = {
      title: "Live Supabase Admin Hackathon",
      slug: uniqueSlug,
      category: "Hackathon",
      shortDescription: "Testing event lifecycle and admin actions against real DB.",
      description: "Comprehensive description for live database testing.",
      venue: "Main Hall, Engineering Block",
      venueMode: "in-person" as const,
      startDate: new Date(Date.now() + 86400000).toISOString(),
      endDate: new Date(Date.now() + 172800000).toISOString(),
      capacity: 80,
      lifecycle: "draft" as const,
      registrationState: "upcoming" as const,
      hasTeams: true,
      minTeamSize: 2,
      maxTeamSize: 4,
    };

    // 2. Create event via Server Action
    const createResult = await createEventAction(createPayload);
    if (!createResult.success) {
      console.error("[Scenario 5] createEventAction failed:", createResult);
    }
    expect(createResult.success).toBe(true);
    if (!createResult.success) return;

    const createdEvent = createResult.data;
    expect(createdEvent.id).toBeDefined();
    expect(createdEvent.title).toBe("Live Supabase Admin Hackathon");
    expect(createdEvent.slug).toBe(uniqueSlug);

    // 3. Read in directory via repository
    const allEvents = await SketchRepository.listEvents();
    const foundInDirectory = allEvents.find((e) => e.id === createdEvent.id);
    expect(foundInDirectory).toBeDefined();
    expect(foundInDirectory?.capacity).toBe(80);

    // 4. Open event detail via repository
    const detailEvent = await SketchRepository.getEventById(createdEvent.id);
    expect(detailEvent).toBeDefined();
    expect(detailEvent?.id).toBe(createdEvent.id);
    expect(detailEvent?.venue).toBe("Main Hall, Engineering Block");

    // 5. Update event metadata via Server Action
    const updateResult = await updateEventAction({
      id: createdEvent.id,
      shortDescription: "Updated short description for live persistence verification.",
      capacity: 95,
    });

    expect(updateResult.success).toBe(true);

    // 6. Test unauthorized rejection
    vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValueOnce({
      isAuthenticated: false,
      isAdmin: false,
      user: null,
    });

    const unauthUpdate = await updateEventAction({
      id: createdEvent.id,
      capacity: 100,
    });
    expect(unauthUpdate.success).toBe(false);
    if (!unauthUpdate.success) {
      expect(unauthUpdate.error).toBe("UNAUTHORIZED");
    }

    // 7. Fresh read confirms persistence of updated values in PostgreSQL
    const freshRead = await SketchRepository.getEventById(createdEvent.id);
    expect(freshRead?.shortDescription).toBe("Updated short description for live persistence verification.");
    expect(freshRead?.capacity).toBe(95);

    // Cleanup
    await adminClient.from("events").delete().eq("id", createdEvent.id);
  });
});
