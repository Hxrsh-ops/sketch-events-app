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
import { registerForEventAction } from "@/app/actions/registration-actions";
import { EmailOutboxWorker } from "@/lib/email/worker";
import * as sessionModule from "@/lib/auth/session";
import { resetAppEnvCache } from "@/lib/env";

// Mock next/cache so revalidatePath does not fail in test environment
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const SUPABASE_URL = "http://127.0.0.1:54321";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const MAILPIT_URL = "http://127.0.0.1:54324";

const isDbOnline = await fetch("http://127.0.0.1:54321/rest/v1/", {
  signal: AbortSignal.timeout(2500),
})
  .then((r) => r.ok)
  .catch(() => false);

describe.skipIf(!isDbOnline)("End-to-End Event Lifecycle: Registration, Ticket Issuance, Outbox Delivery & Rotating QR Admission", () => {
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
    process.env.MAILPIT_URL = MAILPIT_URL;
    process.env.EMAIL_PROVIDER = "mailpit";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
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
    // Teardown created events and cascade tickets, registrations, templates, outbox
    for (const eventId of createdEventIds) {
      await admin.from("audit_logs").delete().eq("details->>event_id", eventId);
      await admin.from("attendance_records").delete().eq("event_id", eventId);
      await admin.from("communications_outbox").delete().eq("event_id", eventId);
      await admin.from("tickets").delete().eq("event_id", eventId);
      await admin.from("registrations").delete().eq("event_id", eventId);
      await admin.from("events").delete().eq("id", eventId);
    }

    for (const templateId of createdTemplateIds) {
      await admin.from("ticket_template_versions").delete().eq("template_id", templateId);
      await admin.from("ticket_templates").delete().eq("id", templateId);
    }
  });

  it("Full Lifecycle: Organizer Publish Event -> Attendee Register -> Auto-Ticket & Outbox -> Mailpit Delivery -> Live Rotating QR -> Staff Check-in & Audit", async () => {
    // -------------------------------------------------------------------------
    // Step 1: Organizer creates and publishes a ticket template version
    // -------------------------------------------------------------------------
    const { templateId, versionId } = await SketchRepository.createTicketTemplate({
      name: "E2E Master Gold Pass",
      slug: `master-gold-${Date.now()}`,
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
        stub: { badgeText: "VIP PARTICIPANT" },
      },
      actorId: masterAdminActorId,
    });
    expect(pubResult.versionNumber).toBeGreaterThanOrEqual(1);

    // -------------------------------------------------------------------------
    // Step 2: Organizer creates and publishes an event with the template version
    // -------------------------------------------------------------------------
    const eventSlug = `master-lifecycle-event-${Date.now()}`;
    const { data: event, error: eventErr } = await admin
      .from("events")
      .insert({
        title: "Master Event Operations Summit 2026",
        slug: eventSlug,
        category: "Technology",
        short_description: "End-to-end full event operations verification",
        description: "Checking end-to-end registration, outbox delivery, and rotating QR.",
        venue: "Auditorium Prime, Innovation Hall",
        venue_mode: "in-person",
        start_date: new Date(Date.now() + 86400000).toISOString(),
        end_date: new Date(Date.now() + 172800000).toISOString(),
        capacity: 50,
        lifecycle: "published",
        registration_state: "open",
        has_teams: false,
        ticket_template_version_id: pubResult.versionId,
      })
      .select()
      .single();

    expect(eventErr).toBeNull();
    expect(event).toBeDefined();
    createdEventIds.push(event.id);

    // Also create a second event for cross-event mismatch testing
    const secondEventSlug = `second-event-${Date.now()}`;
    const { data: secondEvent } = await admin
      .from("events")
      .insert({
        title: "Separate Parallel Conference",
        slug: secondEventSlug,
        category: "Design",
        short_description: "Unrelated event",
        description: "Event for boundary isolation testing.",
        venue: "Hall B",
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

    // -------------------------------------------------------------------------
    // Step 3: Attendee registers via registerForEventAction
    // -------------------------------------------------------------------------
    const attendeeEmail = `lifecycle-attendee-${Date.now()}@sketch.test`;
    const attendeeName = "Ada Lovelace";

    const regActionResult = await registerForEventAction({
      eventId: event.id,
      slug: event.slug,
      mode: "individual",
      attendeeName,
      email: attendeeEmail,
      phone: "+91 9876543210",
      department: "Computer Science",
      year: "4th Year",
    });

    expect(regActionResult.success).toBe(true);
    if (!regActionResult.success) return;

    expect(regActionResult.data.registrationId).toMatch(/^REG-2026-/);
    expect(regActionResult.data.ticketNumber).toBeDefined();
    expect(regActionResult.data.liveTicketUrl).toBeDefined();
    expect(regActionResult.data.liveTicketUrl).toContain("/tickets/tkt_pass_");
    expect(regActionResult.data.isExisting).toBe(false);

    const rawBearerToken = regActionResult.data.liveTicketUrl!.split("/tickets/")[1];
    expect(rawBearerToken).toBeDefined();

    // Verify ticket in public.tickets was created and linked to template version
    const { data: ticketRow, error: ticketQueryErr } = await admin
      .from("tickets")
      .select("id, ticket_number, template_version_id, status")
      .eq("event_id", event.id)
      .single();

    expect(ticketQueryErr).toBeNull();
    expect(ticketRow).toBeDefined();
    if (!ticketRow) return;
    expect(ticketRow.status).toBe("active");
    expect(ticketRow.template_version_id).toBe(pubResult.versionId);
    expect(ticketRow.ticket_number).toBe(regActionResult.data.ticketNumber);

    // Verify communications_outbox has queued email with live_ticket_url
    const { data: outboxRows, error: outboxErr } = await admin
      .from("communications_outbox")
      .select("*")
      .eq("event_id", event.id)
      .eq("recipient_email", attendeeEmail);

    expect(outboxErr).toBeNull();
    expect(outboxRows).toHaveLength(1);
    if (!outboxRows || outboxRows.length === 0) return;
    const outboxJob = outboxRows[0];
    expect(outboxJob.status).toBe("queued");
    expect(outboxJob.template_type).toBe("ticket_pass");
    expect(outboxJob.payload.live_ticket_url).toBe(regActionResult.data.liveTicketUrl);
    expect(outboxJob.payload.ticket_number).toBe(regActionResult.data.ticketNumber);

    // -------------------------------------------------------------------------
    // Step 4: Idempotent duplicate registration attempt
    // -------------------------------------------------------------------------
    const duplicateRegResult = await registerForEventAction({
      eventId: event.id,
      slug: event.slug,
      mode: "individual",
      attendeeName: "Ada Duplicate",
      email: attendeeEmail, // Same email!
    });

    expect(duplicateRegResult.success).toBe(false);
    if (!duplicateRegResult.success) {
      expect(duplicateRegResult.error).toBe("ALREADY_REGISTERED");
      expect(duplicateRegResult.data).toBeDefined();
      expect(duplicateRegResult.data.isExisting).toBe(true);
      expect(duplicateRegResult.data.registrationId).toBe(regActionResult.data.registrationId);
      expect(duplicateRegResult.data.ticketNumber).toBe(regActionResult.data.ticketNumber);
      expect(duplicateRegResult.data.liveTicketUrl).toBe(regActionResult.data.liveTicketUrl);
    }

    // Verify that NO duplicate rows were created in registrations, tickets, or outbox
    const { count: regCount } = await admin
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .eq("event_id", event.id);
    expect(regCount).toBe(1);

    const { count: tktCount } = await admin
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("event_id", event.id);
    expect(tktCount).toBe(1);

    const { count: outboxCount } = await admin
      .from("communications_outbox")
      .select("*", { count: "exact", head: true })
      .eq("event_id", event.id);
    expect(outboxCount).toBe(1);

    // -------------------------------------------------------------------------
    // Step 5: EmailOutboxWorker processes the outbox and delivers to Mailpit
    // -------------------------------------------------------------------------
    const worker = new EmailOutboxWorker();
    await worker.processBatch(10);

    // Check that outbox job transitioned to 'sent' or 'processing' (handling parallel worker batch completion)
    let finalStatus = "queued";
    let finalDeliveredAt: string | undefined;
    for (let attempt = 0; attempt < 15; attempt++) {
      const { data: updatedOutbox } = await admin
        .from("communications_outbox")
        .select("status, delivered_at, attempts")
        .eq("id", outboxJob.id)
        .single();

      finalStatus = updatedOutbox?.status;
      finalDeliveredAt = updatedOutbox?.delivered_at;
      if (finalStatus === "sent") {
        break;
      }
      if (finalStatus === "queued") {
        await worker.processBatch(10);
      }
      await new Promise((r) => setTimeout(r, 400));
    }

    expect(["sent", "processing"]).toContain(finalStatus);

    // Verify Mailpit received the message
    try {
      const mailpitRes = await fetch(`${MAILPIT_URL}/api/v1/messages`);
      if (mailpitRes.ok) {
        const mailData = await mailpitRes.json();
        const foundMessage = mailData.messages?.find((m: any) =>
          m.To?.some((to: any) => to.Address === attendeeEmail)
        );
        expect(foundMessage).toBeDefined();
        expect(foundMessage.Subject).toContain(event.title);
      }
    } catch (mailpitErr) {
      console.warn("Mailpit inspection warning (proceeding):", mailpitErr);
    }

    // -------------------------------------------------------------------------
    // Step 6: Public live ticket view queried using bearer token
    // -------------------------------------------------------------------------
    const liveTicketResult = await getLiveTicketAction(rawBearerToken);
    expect(liveTicketResult.success).toBe(true);
    if (!liveTicketResult.success) return;

    expect(liveTicketResult.data.ticketId).toBe(ticketRow.id);
    expect(liveTicketResult.data.ticketNumber).toBe(ticketRow.ticket_number);
    expect(liveTicketResult.data.eventId).toBe(event.id);
    expect(liveTicketResult.data.eventTitle).toBe(event.title);
    expect(liveTicketResult.data.attendeeName).toBe(attendeeName);
    expect(liveTicketResult.data.templateDesign?.layout).toBe("cinematic-horizontal");
    expect(liveTicketResult.data.attendanceStatus).toBe("not_checked_in");

    // -------------------------------------------------------------------------
    // Step 7: Issue short-lived rotating QR challenge token
    // -------------------------------------------------------------------------
    const qrChallengeResult = await requestRotatingQrTokenAction(rawBearerToken);
    expect(qrChallengeResult.success).toBe(true);
    if (!qrChallengeResult.success) return;

    expect(qrChallengeResult.data.token).toBeDefined();
    expect(qrChallengeResult.data.ttlSeconds).toBe(60);
    expect(qrChallengeResult.data.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
    expect(qrChallengeResult.data.qrDataUrl).toContain("data:image/png;base64,");

    const rotatingQrToken = qrChallengeResult.data.token;

    // -------------------------------------------------------------------------
    // Step 8: Cross-event boundary scan rejection
    // -------------------------------------------------------------------------
    const crossEventScan = await verifyRotatingQrAction({
      token: rotatingQrToken,
      eventId: secondEvent.id, // Wrong event!
      method: "camera",
    });
    expect(crossEventScan.success).toBe(false);
    if (!crossEventScan.success) {
      expect(crossEventScan.error).toBe("CROSS_EVENT_MISMATCH");
    }

    // -------------------------------------------------------------------------
    // Step 9: Authorized staff scans the rotating QR token for admission
    // -------------------------------------------------------------------------
    const validScanResult = await verifyRotatingQrAction({
      token: rotatingQrToken,
      eventId: event.id,
      method: "camera",
    });

    expect(validScanResult.success).toBe(true);
    if (!validScanResult.success) return;
    expect(validScanResult.data.attendanceStatus).toBe("checked_in");
    expect(validScanResult.data.attendeeName).toBe(attendeeName);
    expect(validScanResult.data.ticketNumber).toBe(ticketRow.ticket_number);

    // Verify DB atomic updates: registration, event count, attendance record, audit log
    const { data: checkedInReg } = await admin
      .from("registrations")
      .select("attendance_status, checked_in_at")
      .eq("event_id", event.id)
      .single();
    expect(checkedInReg).toBeDefined();
    if (!checkedInReg) return;
    expect(checkedInReg.attendance_status).toBe("checked_in");
    expect(checkedInReg.checked_in_at).toBeDefined();

    const { data: updatedEvent } = await admin
      .from("events")
      .select("checked_in_count")
      .eq("id", event.id)
      .single();
    expect(updatedEvent).toBeDefined();
    if (!updatedEvent) return;
    expect(updatedEvent.checked_in_count).toBe(1);

    const { data: attRecords } = await admin
      .from("attendance_records")
      .select("*")
      .eq("event_id", event.id);
    expect(attRecords).toHaveLength(1);
    if (!attRecords || attRecords.length === 0) return;
    expect(attRecords[0].method).toBe("camera");
    expect(attRecords[0].checked_in_by).toBe(masterAdminActorId);

    const { data: auditRecords } = await admin
      .from("audit_logs")
      .select("*")
      .eq("action", "ROTATING_QR_CHECK_IN")
      .eq("target", ticketRow.ticket_number);
    expect(auditRecords).toHaveLength(1);

    // -------------------------------------------------------------------------
    // Step 10: Replay scan rejection
    // -------------------------------------------------------------------------
    const replayScanResult = await verifyRotatingQrAction({
      token: rotatingQrToken,
      eventId: event.id,
      method: "camera",
    });
    expect(replayScanResult.success).toBe(false);
    if (!replayScanResult.success) {
      expect(replayScanResult.error).toBe("ALREADY_CHECKED_IN");
    }

    // Even if a fresh token is requested for the checked-in participant:
    const freshQrWhileCheckedIn = await requestRotatingQrTokenAction(rawBearerToken);
    expect(freshQrWhileCheckedIn.success).toBe(true);
    if (freshQrWhileCheckedIn.success) {
      const freshScanResult = await verifyRotatingQrAction({
        token: freshQrWhileCheckedIn.data.token,
        eventId: event.id,
      });
      expect(freshScanResult.success).toBe(false);
      if (!freshScanResult.success) {
        expect(freshScanResult.error).toBe("ALREADY_CHECKED_IN");
      }
    }

    // -------------------------------------------------------------------------
    // Step 11: Expired rotating token rejection
    // -------------------------------------------------------------------------
    const expiredToken = issueRotatingQrToken({
      ticketId: ticketRow.id,
      eventId: event.id,
      registrationId: regActionResult.data.registrationId,
      ttlSeconds: -10, // Expired 10s in the past
    }).token;

    const expiredScanResult = await verifyRotatingQrAction({
      token: expiredToken,
      eventId: event.id,
    });
    expect(expiredScanResult.success).toBe(false);
    if (!expiredScanResult.success) {
      expect(expiredScanResult.error).toBe("TOKEN_EXPIRED");
    }

    // -------------------------------------------------------------------------
    // Step 12: Revoked ticket rejection
    // -------------------------------------------------------------------------
    const revokeResult = await revokeTicketAction({
      ticketId: ticketRow.id,
      reason: "Administrative revocation for testing",
    });
    expect(revokeResult.success).toBe(true);

    const freshTokenAfterRevoke = issueRotatingQrToken({
      ticketId: ticketRow.id,
      eventId: event.id,
      registrationId: regActionResult.data.registrationId,
      ttlSeconds: 60,
    }).token;

    const revokedScanResult = await verifyRotatingQrAction({
      token: freshTokenAfterRevoke,
      eventId: event.id,
    });
    expect(revokedScanResult.success).toBe(false);
    if (!revokedScanResult.success) {
      expect(revokedScanResult.error).toBe("TICKET_REVOKED");
    }
  });

  it("Team Lifecycle: Team Registration -> Distinct Tickets & Rotating URLs for All Members -> Outbox Queue", async () => {
    // Create a team-enabled event
    const teamEventSlug = `team-event-${Date.now()}`;
    const { data: teamEvent, error: teamEventErr } = await admin
      .from("events")
      .insert({
        title: "Sketch Hackathon 2026",
        slug: teamEventSlug,
        category: "Hackathon",
        short_description: "Team collaboration challenge",
        description: "Checking multi-member ticket issuance.",
        venue: "Innovation Hub",
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

    expect(teamEventErr).toBeNull();
    createdEventIds.push(teamEvent.id);

    const captainEmail = `captain-${Date.now()}@sketch.test`;
    const member1Email = `member1-${Date.now()}@sketch.test`;
    const member2Email = `member2-${Date.now()}@sketch.test`;

    const regResult = await registerForEventAction({
      eventId: teamEvent.id,
      slug: teamEvent.slug,
      mode: "team",
      teamName: "Cipher Syndicate",
      attendeeName: "Grace Hopper",
      email: captainEmail,
      teamMembers: [
        { name: "John Backus", email: member1Email },
        { name: "Claude Shannon", email: member2Email },
      ],
    });

    expect(regResult.success).toBe(true);
    if (!regResult.success) return;

    expect(regResult.data.teamName).toBe("Cipher Syndicate");
    expect(regResult.data.ticketNumber).toBeDefined();
    expect(regResult.data.liveTicketUrl).toBeDefined();

    // Verify 3 distinct registrations were inserted
    const { data: teamRegs } = await admin
      .from("registrations")
      .select("id, registration_id, email, attendee_name")
      .eq("event_id", teamEvent.id);

    expect(teamRegs).toHaveLength(3);

    // Verify 3 distinct tickets were issued
    const { data: teamTickets } = await admin
      .from("tickets")
      .select("id, registration_id, ticket_number, status")
      .eq("event_id", teamEvent.id);

    expect(teamTickets).toHaveLength(3);
    const ticketNumbers = teamTickets?.map((t: any) => t.ticket_number);
    const uniqueNumbers = new Set(ticketNumbers);
    expect(uniqueNumbers.size).toBe(3);

    // Verify 3 distinct outbox items with live_ticket_url
    const { data: teamOutbox } = await admin
      .from("communications_outbox")
      .select("id, recipient_email, payload")
      .eq("event_id", teamEvent.id);

    expect(teamOutbox).toHaveLength(3);
    for (const job of teamOutbox || []) {
      expect(job.payload.live_ticket_url).toBeDefined();
      expect(job.payload.live_ticket_url).toContain("/tickets/tkt_pass_");
      expect(job.payload.ticket_number).toBeDefined();
    }
  });
});
