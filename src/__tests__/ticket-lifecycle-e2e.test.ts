import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { SketchRepository } from "@/lib/supabase/repository";
import {
  generateTicketBearerToken,
  issueRotatingQrToken,
} from "@/lib/ticket/rotating-qr";
import {
  getLiveTicketAction,
  requestRotatingQrTokenAction,
  verifyRotatingQrAction,
  revokeTicketAction,
} from "@/app/actions/ticket-actions";
import * as sessionModule from "@/lib/auth/session";

// Mock next/cache so revalidatePath does not fail in test environment
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const SUPABASE_URL = "http://127.0.0.1:54321";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

import { resetAppEnvCache } from "@/lib/env";

const isDbOnline = await fetch("http://127.0.0.1:54321/rest/v1/", {
  signal: AbortSignal.timeout(2500),
})
  .then((r) => r.ok)
  .catch(() => false);

describe.skipIf(!isDbOnline)("E2E Ticket Studio, Rotating QR & Admission Lifecycle", () => {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const createdEventIds: string[] = [];
  const createdTemplateIds: string[] = [];
  const masterAdminActorId = "3c3f407e-9c73-4b2f-9b97-22c3e0afedca";

  beforeAll(async () => {
    process.env.NEXT_PUBLIC_APP_MODE = "production";
    process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ANON_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_KEY;
    resetAppEnvCache();

    vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValue({
      isAuthenticated: true,
      isAdmin: true,
      user: {
        id: masterAdminActorId,
        name: "Lead Admin",
        email: "lead@sketch.org",
        role: "master_admin",
      },
    });
  });

  afterAll(async () => {
    // Teardown created events and cascade tickets, registrations, templates
    for (const eventId of createdEventIds) {
      await admin.from("audit_logs").delete().eq("details->>event_id", eventId);
      await admin.from("attendance_records").delete().eq("event_id", eventId);
      await admin.from("tickets").delete().eq("event_id", eventId);
      await admin.from("registrations").delete().eq("event_id", eventId);
      await admin.from("events").delete().eq("id", eventId);
    }

    for (const templateId of createdTemplateIds) {
      await admin.from("ticket_template_versions").delete().eq("template_id", templateId);
      await admin.from("ticket_templates").delete().eq("id", templateId);
    }
  });

  it("Full Lifecycle: Template Publish -> Ticket Reconcile -> Bearer Query -> Rotating QR Check-in -> Replay & Revocation", async () => {
    // 1. Create a custom template and publish an immutable version
    const { templateId, versionId } = await SketchRepository.createTicketTemplate({
      name: "E2E Cinematic Gold Pass",
      slug: `e2e-gold-${Date.now()}`,
      category: "cinematic",
      description: "Gold tear-off stub with rotating live QR",
      initialDesign: {
        layout: "cinematic-horizontal",
        theme: { accent: "#E2B857", surface: "#181B1E" },
      },
      actorId: masterAdminActorId,
    });
    createdTemplateIds.push(templateId);

    const pubResult = await SketchRepository.publishTemplateVersion({
      templateId,
      designData: {
        layout: "cinematic-horizontal",
        theme: { accent: "#F59E0B", surface: "#1A1A1A" },
        stub: { badgeText: "E2E VIP" },
      },
      actorId: masterAdminActorId,
    });
    expect(pubResult.versionNumber).toBeGreaterThanOrEqual(2);

    // 2. Create published event and assign the published template version
    const slug = `tkt-e2e-${Date.now()}`;
    const { data: event, error: eventErr } = await admin
      .from("events")
      .insert({
        title: "E2E Ticket Operations Summit",
        slug,
        category: "Conference",
        short_description: "End-to-end rotating ticket verification",
        description: "Checking rotating QR lifecycle.",
        venue: "Tech Auditorium",
        venue_mode: "in-person",
        start_date: new Date(Date.now() + 86400000).toISOString(),
        end_date: new Date(Date.now() + 172800000).toISOString(),
        capacity: 100,
        lifecycle: "published",
        registration_state: "open",
        has_teams: false,
        ticket_template_version_id: pubResult.versionId,
      })
      .select()
      .single();

    expect(eventErr).toBeNull();
    createdEventIds.push(event.id);

    // 3. Register participant
    const attendeeEmail = `ticket-attendee-${Date.now()}@sketch.test`;
    const { data: reg, error: regErr } = await admin.rpc("register_for_event", {
      p_event_id: event.id,
      p_mode: "individual",
      p_attendee_name: "Bruce Wayne",
      p_email: attendeeEmail,
    });

    expect(regErr).toBeNull();
    expect(reg.success).toBe(true);

    // Fetch the registration UUID
    const { data: regRow } = await admin
      .from("registrations")
      .select("id")
      .eq("registration_id", reg.registration_id)
      .single();

    expect(regRow).toBeDefined();

    // 4. Issue ticket with high-entropy bearer token
    const { rawToken, tokenHash } = generateTicketBearerToken();
    const ticketNumber = `TKT-${reg.registration_id}`;

    const issueResult = await SketchRepository.issueOrReconcileTicket({
      registrationId: regRow!.id,
      bearerTokenHash: tokenHash,
      ticketNumber,
    });

    expect(issueResult.success).toBe(true);
    expect(issueResult.ticketNumber).toBe(ticketNumber);
    const ticketId = issueResult.ticketId!;

    // 5. Test idempotency: re-issuing for same registration returns existing ticket
    const idempResult = await SketchRepository.issueOrReconcileTicket({
      registrationId: regRow!.id,
      bearerTokenHash: "different-hash-that-should-be-ignored",
      ticketNumber: "TKT-DIFFERENT",
    });
    expect(idempResult.success).toBe(true);
    expect(idempResult.ticketId).toBe(ticketId);
    expect(idempResult.ticketNumber).toBe(ticketNumber);

    // 6. Public live-ticket lookup via bearer token (Zero PII Assertion)
    const liveTicketRes = await getLiveTicketAction(rawToken);
    expect(liveTicketRes.success).toBe(true);
    if (!liveTicketRes.success) return;

    const liveData = liveTicketRes.data;
    expect(liveData.attendeeName).toBe("Bruce Wayne");
    expect(liveData.ticketNumber).toBe(ticketNumber);
    expect(liveData.eventTitle).toBe("E2E Ticket Operations Summit");
    expect(liveData.ticketStatus).toBe("active");
    expect(liveData.attendanceStatus).toBe("not_checked_in");

    // CRITICAL: Ensure no attendee email, no phone, no user UUIDs are returned
    expect((liveData as any).email).toBeUndefined();
    expect((liveData as any).phone).toBeUndefined();
    expect((liveData as any).bearerTokenHash).toBeUndefined();

    // 7. Request fresh rotating QR token from live ticket page
    const qrReqRes = await requestRotatingQrTokenAction(rawToken);
    expect(qrReqRes.success).toBe(true);
    if (!qrReqRes.success) return;

    const qrToken = qrReqRes.data.token;
    expect(qrToken).toBeDefined();
    expect(qrReqRes.data.qrDataUrl.startsWith("data:image/png;base64,")).toBe(true);

    // 8. Cross-Event Security: scanning with wrong event ID must be rejected
    const { data: secondEvent } = await admin
      .from("events")
      .insert({
        title: "Secondary Unrelated Event",
        slug: `sec-event-${Date.now()}`,
        category: "Workshop",
        short_description: "Wrong event check",
        description: "Checking cross-event scan rejection.",
        venue: "Hall 2",
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
    createdEventIds.push(secondEvent.id);

    const crossEventScan = await verifyRotatingQrAction({
      token: qrToken,
      eventId: secondEvent.id, // Wrong event!
      method: "camera",
    });
    expect(crossEventScan.success).toBe(false);
    if (!crossEventScan.success) {
      expect(crossEventScan.error).toBe("CROSS_EVENT_MISMATCH");
    }

    // 9. Valid Check-in at correct event terminal
    const validScan = await verifyRotatingQrAction({
      token: qrToken,
      eventId: event.id,
      method: "camera",
    });

    expect(validScan.success).toBe(true);
    if (!validScan.success) return;
    expect(validScan.data.attendanceStatus).toBe("checked_in");
    expect(validScan.data.attendeeName).toBe("Bruce Wayne");

    // Verify checked_in_count on event table was incremented
    const { data: updatedEvent } = await admin
      .from("events")
      .select("checked_in_count")
      .eq("id", event.id)
      .single();
    expect(updatedEvent?.checked_in_count).toBeGreaterThanOrEqual(1);

    // 10. Anti-Replay: duplicate scan of same QR token or newly rotated token MUST be rejected
    const duplicateScan = await verifyRotatingQrAction({
      token: qrToken,
      eventId: event.id,
      method: "camera",
    });
    expect(duplicateScan.success).toBe(false);
    if (!duplicateScan.success) {
      expect(duplicateScan.error).toBe("ALREADY_CHECKED_IN");
    }

    // Even if client rotates to a brand-new token, database state prevents replay
    const { token: freshTokenWhileCheckedIn } = issueRotatingQrToken({
      ticketId,
      eventId: event.id,
      registrationId: ticketNumber,
      ttlSeconds: 60,
    });
    const duplicateFreshScan = await verifyRotatingQrAction({
      token: freshTokenWhileCheckedIn,
      eventId: event.id,
      method: "camera",
    });
    expect(duplicateFreshScan.success).toBe(false);
    if (!duplicateFreshScan.success) {
      expect(duplicateFreshScan.error).toBe("ALREADY_CHECKED_IN");
    }

    // 11. Revocation Workflow
    const revokeRes = await revokeTicketAction({
      ticketId,
      reason: "Security flag: duplicate credential report",
    });
    expect(revokeRes.success).toBe(true);

    // Verify subsequent live ticket query reflects 'revoked'
    const revokedTicketQuery = await getLiveTicketAction(rawToken);
    expect(revokedTicketQuery.success).toBe(true);
    if (revokedTicketQuery.success) {
      expect(revokedTicketQuery.data?.ticketStatus).toBe("revoked");
    }

    // Requesting fresh QR token on revoked ticket is blocked
    const blockedQrReq = await requestRotatingQrTokenAction(rawToken);
    expect(blockedQrReq.success).toBe(false);
    if (!blockedQrReq.success) {
      expect(blockedQrReq.error).toBe("TICKET_REVOKED");
    }
  });

  it("Concurrent Scans: parallel check-in attempts on the same ticket atomically allow exactly one scan and reject the other with ALREADY_CHECKED_IN", async () => {
    // 1. Create a dedicated event
    const { data: concEvent } = await admin
      .from("events")
      .insert({
        title: "Concurrent Scan Race Summit",
        slug: `conc-scan-${Date.now()}`,
        category: "Technology",
        short_description: "Testing concurrent scan mutual exclusion",
        description: "Postgres row lock concurrency verification.",
        venue: "Concurrency Terminal",
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
    createdEventIds.push(concEvent.id);

    // 2. Register attendee via RPC
    const attendeeEmail = `diana-${Date.now()}@sketch.test`;
    const { data: reg, error: regErr } = await admin.rpc("register_for_event", {
      p_event_id: concEvent.id,
      p_mode: "individual",
      p_attendee_name: "Diana Prince",
      p_email: attendeeEmail,
    });
    expect(regErr).toBeNull();
    expect(reg.success).toBe(true);

    const { data: regRow } = await admin
      .from("registrations")
      .select("id")
      .eq("registration_id", reg.registration_id)
      .single();

    expect(regRow).toBeDefined();

    // 3. Issue ticket
    const { rawToken, tokenHash } = generateTicketBearerToken();
    const concTicketNumber = `TKT-${reg.registration_id}`;

    const { ticketId } = await SketchRepository.issueOrReconcileTicket({
      registrationId: regRow!.id,
      bearerTokenHash: tokenHash,
      ticketNumber: concTicketNumber,
    });

    // 4. Generate rotating QR token
    const { token: concQrToken } = issueRotatingQrToken({
      ticketId: ticketId!,
      eventId: concEvent.id,
      registrationId: concTicketNumber,
      ttlSeconds: 60,
    });

    // 5. Fire two concurrent verification calls simultaneously via Promise.all
    const [scanA, scanB] = await Promise.all([
      verifyRotatingQrAction({
        token: concQrToken,
        eventId: concEvent.id,
        method: "camera",
      }),
      verifyRotatingQrAction({
        token: concQrToken,
        eventId: concEvent.id,
        method: "camera",
      }),
    ]);

    // Exactly one must succeed, and exactly one must fail with ALREADY_CHECKED_IN
    const successCount = (scanA.success ? 1 : 0) + (scanB.success ? 1 : 0);
    const failureCount = (!scanA.success ? 1 : 0) + (!scanB.success ? 1 : 0);

    expect(successCount).toBe(1);
    expect(failureCount).toBe(1);

    const failedResult = !scanA.success ? scanA : scanB;
    if (!failedResult.success) {
      expect(failedResult.error).toBe("ALREADY_CHECKED_IN");
    }

    // Verify event checked_in_count was incremented by EXACTLY 1
    const { data: finalEvent } = await admin
      .from("events")
      .select("checked_in_count")
      .eq("id", concEvent.id)
      .single();
    expect(finalEvent?.checked_in_count).toBe(1);
  });
});
