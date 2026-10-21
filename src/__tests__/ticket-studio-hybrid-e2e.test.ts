import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { SketchRepository } from "@/lib/supabase/repository";
import {
  generateTicketBearerToken,
} from "@/lib/ticket/rotating-qr";
import {
  uploadTicketBackgroundAction,
  createTicketTemplateAction,
  saveTemplateDraftAction,
  publishTemplateVersionAction,
  assignEventTemplateAction,
  getTicketTemplateAction,
  getLiveTicketAction,
} from "@/app/actions/ticket-actions";
import { EmailOutboxWorker } from "@/lib/email/worker";
import * as sessionModule from "@/lib/auth/session";
import { resetAppEnvCache } from "@/lib/env";
import { resetServerEnvCache } from "@/lib/env.server";

// Mock next/cache so revalidatePath does not fail in test environment
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const SUPABASE_URL = "http://127.0.0.1:54321";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const MAILPIT_API = "http://127.0.0.1:54324/api/v1";

const isDbOnline = await fetch("http://127.0.0.1:54321/rest/v1/", {
  signal: AbortSignal.timeout(2500),
})
  .then((r) => r.ok)
  .catch(() => false);

describe.skipIf(!isDbOnline)("Comprehensive Ticket Studio & Mailpit Hybrid Lifecycle E2E", () => {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const masterAdminActorId = "3c3f407e-9c73-4b2f-9b97-22c3e0afedca";
  const createdEventIds: string[] = [];
  const createdTemplateIds: string[] = [];

  beforeAll(async () => {
    process.env.APP_MODE = "production";
    process.env.NEXT_PUBLIC_APP_MODE = "production";
    process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ANON_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_KEY;
    process.env.EMAIL_PROVIDER = "mailpit";
    process.env.MAILPIT_URL = "http://127.0.0.1:54324";
    process.env.EMAIL_FROM = "SketchHUB Local <noreply@sketch.local>";
    resetAppEnvCache();
    resetServerEnvCache();

    vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValue({
      isAuthenticated: true,
      isAdmin: true,
      user: {
        id: masterAdminActorId,
        name: "Master Admin",
        email: "admin@sketch.local",
        role: "master_admin",
      },
    });
  });

  afterAll(async () => {
    // Teardown created events and templates
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

  it(
    "completes full lifecycle: upload image → save draft → publish → reload → assign event → issue ticket → verify live rendering → Mailpit email",
    async () => {
    // -------------------------------------------------------------------------
    // Step 1: Upload Background Image via Supabase Storage
    // -------------------------------------------------------------------------
    const pngHeader = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    ]);
    const testFile = new File([pngHeader], "summit-stage-backdrop.png", { type: "image/png" });
    const uploadFormData = new FormData();
    uploadFormData.append("file", testFile);

    const uploadRes = await uploadTicketBackgroundAction(uploadFormData);
    expect(uploadRes.success).toBe(true);
    if (!uploadRes.success) throw new Error("Upload failed");

    const uploadedImageUrl = uploadRes.data.url;
    expect(uploadedImageUrl).toContain("/storage/v1/object/public/ticket-assets/");

    // Verify public accessibility via plain HTTP GET (unauthenticated)
    const publicFetch = await fetch(uploadedImageUrl);
    expect(publicFetch.status).toBe(200);

    // -------------------------------------------------------------------------
    // Step 2: Create Template & Save Draft with Background Image
    // -------------------------------------------------------------------------
    const uniqueSlug = `summit-hybrid-${Date.now()}`;
    const createRes = await createTicketTemplateAction({
      name: `Summit Hybrid Edition ${Date.now()}`,
      category: "cinematic",
      slug: uniqueSlug,
      description: "Official hybrid summit pass template with high-res stage background",
    });
    expect(createRes.success).toBe(true);
    if (!createRes.success) throw new Error("Create template failed");

    const templateId = createRes.data.templateId;
    createdTemplateIds.push(templateId);

    const draftDesign = {
      layout: "cinematic-horizontal" as const,
      canvas: { width: 800, height: 380, unit: "px" as const },
      theme: {
        background: "#0D0F12",
        surface: "#16191D",
        accent: "#F59E0B",
        textColor: "#FFFFFF",
        secondaryTextColor: "#9CA3AF",
        borderColor: "#262A30",
        fontFamily: "cinematic" as const,
      },
      stub: {
        perforationPosition: "right" as const,
        stubWidth: 240,
        badgeText: "ENTRY PASS",
        showPerforationDots: true,
      },
      qr: {
        size: 180,
        label: "SCAN TO VERIFY",
        rotating: true,
        refreshIntervalSec: 30,
      },
      backgroundImage: {
        url: uploadedImageUrl,
        fit: "cover" as const,
        position: "center" as const,
        overlayColor: "#000000",
        overlayOpacity: 0.5,
      },
      elements: [],
    };

    const draftRes = await saveTemplateDraftAction({
      templateId,
      designData: draftDesign,
    });
    expect(draftRes.success).toBe(true);

    // -------------------------------------------------------------------------
    // Step 3: Publish Version
    // -------------------------------------------------------------------------
    const publishRes = await publishTemplateVersionAction({
      templateId,
      designData: draftDesign,
    });
    expect(publishRes.success).toBe(true);
    if (!publishRes.success) throw new Error("Publish failed");

    const publishedVersionId = publishRes.data.versionId;
    expect(publishedVersionId).toBeDefined();

    // -------------------------------------------------------------------------
    // Step 4: Reload & Verify Persistence
    // -------------------------------------------------------------------------
    const reloaded = await getTicketTemplateAction(templateId);
    expect(reloaded.success).toBe(true);
    if (!reloaded.success || !reloaded.data.template) throw new Error("Reload failed");

    const matchingVersion = reloaded.data.versions.find((v) => v.id === publishedVersionId);
    expect(matchingVersion).toBeDefined();
    expect(matchingVersion?.isPublished).toBe(true);
    expect(matchingVersion?.designData.backgroundImage?.url).toBe(uploadedImageUrl);
    expect(matchingVersion?.designData.backgroundImage?.fit).toBe("cover");

    // -------------------------------------------------------------------------
    // Step 5: Create Event & Assign Template
    // -------------------------------------------------------------------------
    const eventSlug = `hybrid-summit-${Date.now()}`;
    const { data: event, error: eventErr } = await admin
      .from("events")
      .insert({
        title: "Sketch Regional Hybrid Summit 2026",
        slug: eventSlug,
        description: "Flagship engineering summit with live credentials",
        venue: "Metropolitan Grand Center, Hall 4",
        category: "technical",
        lifecycle: "published",
        registration_state: "open",
        has_teams: false,
        start_date: new Date(Date.now() + 86400000 * 7).toISOString(),
        end_date: new Date(Date.now() + 86400000 * 8).toISOString(),
        capacity: 250,
      })
      .select()
      .single();

    expect(eventErr).toBeNull();
    expect(event).toBeDefined();
    const eventId = event!.id;
    createdEventIds.push(eventId);

    const assignRes = await assignEventTemplateAction({
      eventId,
      templateVersionId: publishedVersionId,
    });
    expect(assignRes.success).toBe(true);

    // -------------------------------------------------------------------------
    // Step 6: Register Attendee & Issue Ticket
    // -------------------------------------------------------------------------
    const attendeeEmail = `attendee-${Date.now()}@sketch.local`;
    const { data: reg, error: regErr } = await admin.rpc("register_for_event", {
      p_event_id: eventId,
      p_mode: "individual",
      p_attendee_name: "Elena Rostova",
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

    const { rawToken, tokenHash } = generateTicketBearerToken();
    const ticketNumber = `TKT-${reg.registration_id}`;

    const issuedTicket = await SketchRepository.issueOrReconcileTicket({
      registrationId: regRow!.id,
      bearerTokenHash: tokenHash,
      ticketNumber,
    });

    expect(issuedTicket).toBeDefined();
    expect(issuedTicket.ticketNumber).toBe(ticketNumber);

    // -------------------------------------------------------------------------
    // Step 7: Verify Live Ticket Rendering
    // -------------------------------------------------------------------------
    const livePassRes = await getLiveTicketAction(rawToken);
    expect(livePassRes.success).toBe(true);
    if (!livePassRes.success) throw new Error("Live pass query failed");

    expect(livePassRes.data.attendeeName).toBe("Elena Rostova");
    expect(livePassRes.data.eventTitle).toBe("Sketch Regional Hybrid Summit 2026");
    expect(livePassRes.data.templateDesign).toBeDefined();
    expect(livePassRes.data.templateDesign?.backgroundImage?.url).toBe(uploadedImageUrl);
    expect(livePassRes.data.templateDesign?.stub.badgeText).toBe("ENTRY PASS");

    // -------------------------------------------------------------------------
    // Step 8: Transactional Email Dispatch & Mailpit Verification
    // -------------------------------------------------------------------------
    // Queue outbox job for ticket pass
    const { data: outboxJob, error: outboxErr } = await admin
      .from("communications_outbox")
      .insert({
        event_id: eventId,
        recipient_email: attendeeEmail,
        recipient_name: "Elena Rostova",
        subject: "Your Live Entry Pass for Sketch Regional Hybrid Summit 2026",
        template_type: "ticket_pass",
        payload: {
          registration_id: regRow!.id,
          qr_credential_id: issuedTicket.ticketNumber,
          event_title: "Sketch Regional Hybrid Summit 2026",
          venue: "Metropolitan Grand Center, Hall 4",
          start_date: event!.start_date,
          ticket_number: issuedTicket.ticketNumber,
          bearer_token: rawToken,
          live_ticket_url: `http://localhost:3000/tickets/${rawToken}`,
          background_image_url: uploadedImageUrl,
        },
        status: "queued",
        scheduled_at: new Date().toISOString(),
      })
      .select()
      .single();

    expect(outboxErr).toBeNull();
    expect(outboxJob).toBeDefined();

    // Run Outbox Worker with Mailpit adapter (process all pending batch jobs)
    const worker = new EmailOutboxWorker();
    let totalProcessed = 0;
    for (let i = 0; i < 5; i++) {
      const res = await worker.processBatch(25);
      totalProcessed += res.processed;
      if (res.claimed === 0) break;
    }
    expect(totalProcessed).toBeGreaterThanOrEqual(1);

    // Verify Mailpit Captured the Email
    const mailpitRes = await fetch(`${MAILPIT_API}/messages`);
    expect(mailpitRes.status).toBe(200);
    const mailpitData = await mailpitRes.json();

    const matchingEmail = mailpitData.messages?.find((m: any) =>
      m.To?.some((t: any) => t.Address === attendeeEmail) &&
      m.Subject?.includes("Your Live Entry Pass")
    );
    expect(matchingEmail).toBeDefined();
    expect(matchingEmail.Subject).toContain("Sketch Regional Hybrid Summit 2026");

    // Inspect rendered email body from Mailpit
    const messageDetailRes = await fetch(`${MAILPIT_API}/message/${matchingEmail.ID}`);
    expect(messageDetailRes.status).toBe(200);
    const messageDetail = await messageDetailRes.json();

    expect(messageDetail.HTML).toContain("Elena Rostova");
    expect(messageDetail.HTML).toContain(issuedTicket.ticketNumber);
    expect(messageDetail.HTML).toContain(uploadedImageUrl);
    expect(messageDetail.HTML).toContain(`/tickets/${rawToken}`);
  }, 30000);
});
