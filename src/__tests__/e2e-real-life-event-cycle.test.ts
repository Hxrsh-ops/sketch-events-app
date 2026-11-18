import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { SketchRepository } from "@/lib/supabase/repository";
import { generateTicketBearerToken } from "@/lib/ticket/rotating-qr";
import { generateUnifiedTicketSvg, DEFAULT_UNIFIED_TICKET_DESIGN } from "@/lib/ticket/ticket-renderer";
import { getLiveTicketAction } from "@/app/actions/ticket-actions";
import { updateSession } from "@/lib/supabase/middleware";
import { NextRequest } from "next/server";
import * as sessionModule from "@/lib/auth/session";
import { resetAppEnvCache } from "@/lib/env";

// Mock next/cache so revalidatePath does not fail in test environment
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Load .env.local if present
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const [key, ...rest] = trimmed.split("=");
      const val = rest.join("=").trim();
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = val;
      }
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fvnkhzlbvxemwlkmwhbz.supabase.co";
const DUMMY_FALLBACK_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const isLiveDb = Boolean(SERVICE_KEY && ANON_KEY && SUPABASE_URL);

describe.runIf(isLiveDb)("Real-Life Sketch Event Lifecycle & Security Hardening E2E", () => {
  const adminSupabase = createClient(SUPABASE_URL, SERVICE_KEY || DUMMY_FALLBACK_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const createdEventIds: string[] = [];
  const createdTemplateIds: string[] = [];
  const createdCertIds: string[] = [];
  const adminActorId = "fda0b2bf-186a-48c9-9924-093b04d951e3"; // Harshanth (master_admin)

  beforeAll(() => {
    process.env.APP_MODE = "production";
    process.env.NEXT_PUBLIC_APP_MODE = "production";
    process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ANON_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_KEY;
    process.env.NEXT_PUBLIC_APP_URL = "https://sketchhub-liard.vercel.app";
    resetAppEnvCache();

    vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValue({
      isAuthenticated: true,
      isAdmin: true,
      user: {
        id: adminActorId,
        name: "Harshanth",
        email: "kmharshanth6@gmail.com",
        role: "master_admin",
      },
    });
  });

  afterAll(async () => {
    // Clean up created test data cleanly
    for (const certId of createdCertIds) {
      await adminSupabase.from("certificates").delete().eq("id", certId);
    }

    for (const eventId of createdEventIds) {
      await adminSupabase.from("round_advancements").delete().eq("event_id", eventId);
      await adminSupabase.from("round_submissions").delete().eq("event_id", eventId);
      await adminSupabase.from("rounds").delete().eq("event_id", eventId);
      await adminSupabase.from("attendance_records").delete().eq("event_id", eventId);
      await adminSupabase.from("communications_outbox").delete().eq("event_id", eventId);
      await adminSupabase.from("tickets").delete().eq("event_id", eventId);
      await adminSupabase.from("registrations").delete().eq("event_id", eventId);
      await adminSupabase.from("teams").delete().eq("event_id", eventId);
      await adminSupabase.from("events").delete().eq("id", eventId);
    }

    for (const templateId of createdTemplateIds) {
      await adminSupabase.from("ticket_template_versions").delete().eq("template_id", templateId);
      await adminSupabase.from("ticket_templates").delete().eq("id", templateId);
    }
  });

  it("Executes full event lifecycle: Event Creation -> Form Builder -> Registration -> Static QR Pass -> Check-In -> Rounds -> Certificates", async () => {
    const timestamp = Date.now();
    const uniqueSlug = `sketch-hackfest-${timestamp}`;

    // -------------------------------------------------------------------------
    // Phase 1: Event Creation with Custom Form Builder & Competition Rounds
    // -------------------------------------------------------------------------
    const newEvent = await SketchRepository.createEvent({
      title: `SKETCH HACKFEST ${timestamp}: AI & CREATIVE TECH`,
      slug: uniqueSlug,
      description: "Campus-wide 24-hour innovation hackathon with custom form fields and multi-stage rounds.",
      category: "Hackathon & Innovation",
      venueMode: "in-person",
      venue: "Main Innovation Hall, Block C",
      startDate: new Date(Date.now() + 86400000).toISOString(),
      endDate: new Date(Date.now() + 172800000).toISOString(),
      capacity: 50,
      hasTeams: true,
      minTeamSize: 2,
      maxTeamSize: 4,
      hasRounds: true,
      registrationForm: {
        fields: [
          {
            id: "tshirt_size",
            label: "T-Shirt Size",
            type: "select",
            required: true,
            options: ["S", "M", "L", "XL", "XXL"],
          },
          {
            id: "github_handle",
            label: "GitHub Profile",
            type: "text",
            required: true,
          },
          {
            id: "dietary_pref",
            label: "Dietary Preference",
            type: "select",
            required: true,
            options: ["Vegetarian", "Non-Vegetarian"],
          },
        ],
      },
    });

    expect(newEvent).toBeDefined();
    expect(newEvent.id).toBeDefined();
    createdEventIds.push(newEvent.id);

    // Create 3 competition rounds for the event
    await SketchRepository.createRound({
      eventId: newEvent.id,
      name: "Round 1: Ideation & Pitch Review",
      order: 1,
      venue: "Innovation Hall A",
      status: "in_progress",
    });
    await SketchRepository.createRound({
      eventId: newEvent.id,
      name: "Round 2: Prototype & Architecture Build",
      order: 2,
      venue: "Lab Block 2",
      status: "upcoming",
    });
    await SketchRepository.createRound({
      eventId: newEvent.id,
      name: "Round 3: Final Jury Demo",
      order: 3,
      venue: "Main Stage",
      status: "upcoming",
    });

    // Initial state: draft, 0 registrations
    expect(newEvent.lifecycle).toBe("draft");
    expect(newEvent.registeredCount).toBe(0);
    expect(newEvent.checkedInCount).toBe(0);

    // -------------------------------------------------------------------------
    // Phase 2: Create & Assign Ticket Template (Static QR Pass Design)
    // -------------------------------------------------------------------------
    const templateDesign = {
      ...DEFAULT_UNIFIED_TICKET_DESIGN,
      qr: {
        size: 180,
        label: "SCAN TO VERIFY",
        rotating: false,
        refreshIntervalSec: 0,
      },
    };

    const { templateId } = await SketchRepository.createTicketTemplate({
      name: `Hackfest Gold Pass ${timestamp}`,
      description: "Official static admission pass with high-contrast barcode",
      initialDesign: templateDesign,
      actorId: adminActorId,
    });

    createdTemplateIds.push(templateId);

    // Publish template version and link to event
    const { versionId } = await SketchRepository.publishTemplateVersion({
      templateId,
      designData: templateDesign,
      actorId: adminActorId,
    });

    await SketchRepository.assignEventTicketTemplate({
      eventId: newEvent.id,
      templateVersionId: versionId,
      actorName: "Harshanth",
      actorEmail: "kmharshanth6@gmail.com",
    });

    // -------------------------------------------------------------------------
    // Phase 3: Transition Lifecycle: draft -> published
    // -------------------------------------------------------------------------
    const publishedEvent = await SketchRepository.updateEvent(newEvent.id, {
      lifecycle: "published",
      registrationState: "open",
    });
    expect(publishedEvent.lifecycle).toBe("published");
    expect(publishedEvent.registrationState).toBe("open");

    // -------------------------------------------------------------------------
    // Phase 4: Team Participant Registration Flow
    // -------------------------------------------------------------------------
    const captainEmail = `arun.${timestamp}@testsketch.org`;
    const memberEmail = `bala.${timestamp}@testsketch.org`;

    const regResult = await SketchRepository.registerParticipant({
      eventId: newEvent.id,
      mode: "team",
      attendeeName: "Arun Innovator",
      email: captainEmail,
      phone: "9876543210",
      department: "Computer Science",
      year: "3rd Year",
      teamName: "Apex Creators",
      teamMembers: [
        {
          name: "Bala Developer",
          email: memberEmail,
          department: "Information Tech",
          phone: "9876543211",
        },
      ],
      customAnswers: {
        tshirt_size: "L",
        github_handle: "arun-innovator",
        dietary_pref: "Vegetarian",
      },
    });

    expect(regResult.success).toBe(true);
    expect(regResult.registrationId).toBeDefined();

    // Verify registration row in database
    const { data: regRows } = await adminSupabase
      .from("registrations")
      .select("id, registration_id, attendee_name, email, attendance_status, qr_credential_id")
      .eq("event_id", newEvent.id);

    expect(regRows).toHaveLength(2); // Captain + Member
    const captainRow = regRows?.find((r) => r.email === captainEmail);
    const memberRow = regRows?.find((r) => r.email === memberEmail);

    expect(captainRow).toBeDefined();
    expect(captainRow?.attendance_status).toBe("not_checked_in");
    expect(memberRow).toBeDefined();

    // Issue ticket for captain with permanent static ticket number
    const { rawToken, tokenHash } = generateTicketBearerToken();
    const ticketNumber = `TKT-${captainRow!.registration_id.replace(/^REG-/, "")}`;

    const issuedTicket = await SketchRepository.issueOrReconcileTicket({
      registrationId: captainRow!.id,
      bearerTokenHash: tokenHash,
      ticketNumber,
    });

    expect(issuedTicket.ticketNumber).toBe(ticketNumber);
    expect(issuedTicket.status).toBe("active");

    // -------------------------------------------------------------------------
    // Phase 5: Verify Static QR Pass Rendering (No Dynamic Timers)
    // -------------------------------------------------------------------------
    const passSvg = await generateUnifiedTicketSvg({
      design: {
        ...DEFAULT_UNIFIED_TICKET_DESIGN,
        qr: { size: 180, label: "SCAN TO VERIFY", rotating: false, refreshIntervalSec: 0 },
      },
      event: {
        title: publishedEvent.title,
        category: "IN-PERSON",
        venue: publishedEvent.venue,
        venueMode: publishedEvent.venueMode,
        startDate: publishedEvent.startDate,
        organizerName: "SKETCH",
      },
      attendee: {
        name: "Arun Innovator",
        ticketNumber: issuedTicket.ticketNumber || ticketNumber,
        teamName: "Apex Creators",
      },
      qrPayload: issuedTicket.ticketNumber || ticketNumber,
    });

    expect(passSvg).toContain(issuedTicket.ticketNumber);
    expect(passSvg).toContain("Arun Innovator");
    expect(passSvg).toContain("Apex Creators");
    expect(passSvg).toContain("PRESENT AT ADMISSION DESK");
    // Ensure no rotating countdown timer is present in SVG output
    expect(passSvg).not.toContain("Refreshes in");

    // Verify Live Ticket Action lookup by bearer token
    const liveTicketResult = await getLiveTicketAction(rawToken);
    expect(liveTicketResult.success).toBe(true);
    if (liveTicketResult.success) {
      expect(liveTicketResult.data.attendeeName).toBe("Arun Innovator");
      expect(liveTicketResult.data.ticketNumber).toBe(issuedTicket.ticketNumber);
      expect(liveTicketResult.data.ticketStatus).toBe("active");
    }

    // -------------------------------------------------------------------------
    // Phase 6: Transition Lifecycle: published -> live
    // -------------------------------------------------------------------------
    const liveEvent = await SketchRepository.updateEvent(newEvent.id, {
      lifecycle: "live",
    });
    expect(liveEvent.lifecycle).toBe("live");

    // -------------------------------------------------------------------------
    // Phase 7: Desk Attendance Scanner Check-In (Static Pass)
    // -------------------------------------------------------------------------
    // Check in Arun via his ticket number
    const checkInRes = await SketchRepository.toggleParticipantAttendance({
      registrationIdOrUid: captainRow!.registration_id,
      eventId: newEvent.id,
      targetStatus: "checked_in",
      actorId: adminActorId,
      method: "camera",
    });

    expect(checkInRes.success).toBe(true);
    expect(checkInRes.attendanceStatus).toBe("checked_in");

    // Verify event checked_in_count incremented
    const updatedEventAfterCheckIn = await SketchRepository.getEventById(newEvent.id);
    expect(updatedEventAfterCheckIn?.checkedInCount).toBe(1);

    // Verify participant list reflects ticketNumber and checked_in status
    const participantsList = await SketchRepository.listParticipants({ eventId: newEvent.id });
    const arunParticipant = participantsList.find((p) => p.email === captainEmail);
    expect(arunParticipant?.attendanceStatus).toBe("checked_in");
    expect(arunParticipant?.ticketNumber).toBe(issuedTicket.ticketNumber);

    // Test duplicate check-in idempotency
    const duplicateCheckIn = await SketchRepository.toggleParticipantAttendance({
      registrationIdOrUid: captainRow!.registration_id,
      eventId: newEvent.id,
      targetStatus: "checked_in",
      actorId: adminActorId,
      method: "camera",
    });
    // Should confirm already checked in without double-incrementing count
    expect(duplicateCheckIn.attendanceStatus).toBe("checked_in");
    const countAfterDuplicate = await SketchRepository.getEventById(newEvent.id);
    expect(countAfterDuplicate?.checkedInCount).toBe(1);

    // -------------------------------------------------------------------------
    // Phase 8: Competition Round Progression
    // -------------------------------------------------------------------------
    const rounds = await SketchRepository.listRounds(newEvent.id);
    expect(rounds.length).toBeGreaterThanOrEqual(3);
    const round1 = rounds.find((r) => r.order === 1);
    const round2 = rounds.find((r) => r.order === 2);
    expect(round1).toBeDefined();
    expect(round2).toBeDefined();

    // Advance Round 1 to completed and update advanced count
    if (round1 && round2) {
      const updatedRound1 = await SketchRepository.updateRound(round1.id, {
        status: "completed",
        advancedCount: 1,
      });
      expect(updatedRound1.status).toBe("completed");
      expect(updatedRound1.advancedCount).toBe(1);

      const updatedRound2 = await SketchRepository.updateRound(round2.id, {
        status: "in_progress",
        eligibleCount: 1,
      });
      expect(updatedRound2.status).toBe("in_progress");
    }

    // -------------------------------------------------------------------------
    // Phase 9: Transition Lifecycle: live -> completed
    // -------------------------------------------------------------------------
    const completedEvent = await SketchRepository.updateEvent(newEvent.id, {
      lifecycle: "completed",
    });
    expect(completedEvent.lifecycle).toBe("completed");

    // -------------------------------------------------------------------------
    // Phase 10: Certificate Generation & Public Verification
    // -------------------------------------------------------------------------
    // 10a. Eligible checked-in attendee receives certificate
    const cert = await SketchRepository.issueIndividualCertificate({
      participantId: captainRow!.id,
      actorName: "Harshanth",
      actorEmail: "kmharshanth6@gmail.com",
    });

    expect(cert).toBeDefined();
    expect(cert.id).toBeDefined();
    expect(cert.status).toBe("issued");
    expect(cert.certificateNumber).toMatch(/^SKETCH-CERT-2026-\d+/);
    createdCertIds.push(cert.id);

    // 10b. Public verification RPC checks certificate validity
    const verifiedCert = await SketchRepository.verifyCertificate(cert.certificateNumber);
    expect(verifiedCert).not.toBeNull();
    expect(verifiedCert?.isValid).toBe(true);
    expect(verifiedCert?.recipientName).toBe("Arun Innovator");
    expect(verifiedCert?.status).toBe("issued");

    // 10c. Verify non-checked-in participant cannot receive a certificate
    await expect(
      SketchRepository.issueIndividualCertificate({
        participantId: memberRow!.id,
        actorName: "Harshanth",
        actorEmail: "kmharshanth6@gmail.com",
      })
    ).rejects.toThrow(/checked-in/i);

    // -------------------------------------------------------------------------
    // Phase 11: Security & Route Hardening Verification
    // -------------------------------------------------------------------------
    // Direct unauthorized access to /certificates redirects to /ops/gateway or login with strict headers
    const certsReq = new NextRequest("http://localhost:3000/certificates", {
      headers: {},
    });
    const certsRes = await updateSession(certsReq);
    expect(certsRes.status).toBe(307);
    expect(certsRes.headers.get("location")).toContain("/ops/gateway?redirect=%2Fcertificates");
    expect(certsRes.headers.get("X-Robots-Tag")).toBe("noindex, nofollow, noarchive");
    expect(certsRes.headers.get("Cache-Control")).toContain("no-store");

    // Gateway path responds with noindex headers
    const gatewayReq = new NextRequest("http://localhost:3000/ops/gateway", {
      headers: {},
    });
    const gatewayRes = await updateSession(gatewayReq);
    expect(gatewayRes.headers.get("X-Robots-Tag")).toBe("noindex, nofollow, noarchive");
  }, 45000); // 45s timeout for complete multi-phase live lifecycle
});
