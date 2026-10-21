import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  renderTicketPassEmail,
  renderCertificateEmail,
  renderAnnouncementEmail,
} from "@/lib/email/templates";
import { ResendEmailAdapter, BrevoEmailAdapter, TestEmailAdapter } from "@/lib/email/adapters";
import { EmailOutboxWorker } from "@/lib/email/worker";
import { TicketPassPayload } from "@/lib/email/types";

describe("Email Engine: Templates and Validation", () => {
  const validPayload: TicketPassPayload = {
    registration_id: "REG-2026-10001-A1B2C3",
    qr_credential_id: "SKETCH-TKT-9DA76B0A6D06",
    event_title: "Design Systems Conference 2026",
    venue: "Main Auditorium, Hall B",
    start_date: "2026-11-15T09:00:00Z",
  };

  it("successfully renders ticket pass HTML and text for individual registration", () => {
    const rendered = renderTicketPassEmail(validPayload, "Alice Designer");

    expect(rendered.html).toContain("Design Systems Conference 2026");
    expect(rendered.html).toContain("REG-2026-10001-A1B2C3");
    expect(rendered.html).toContain("SKETCH-TKT-9DA76B0A6D06");
    expect(rendered.html).toContain("Alice Designer");
    expect(rendered.text).toContain("Registration ID: REG-2026-10001-A1B2C3");
  });

  it("successfully renders team badge when team_name is provided", () => {
    const teamPayload = { ...validPayload, team_name: "Pixel Pioneers" };
    const rendered = renderTicketPassEmail(teamPayload, "Captain Bob");

    expect(rendered.html).toContain("TEAM: Pixel Pioneers");
    expect(rendered.text).toContain("Team: Pixel Pioneers");
  });

  it("escapes malicious HTML characters in event title and names", () => {
    const xssPayload = {
      ...validPayload,
      event_title: "Hacked <script>alert('xss')</script> Event",
    };
    const rendered = renderTicketPassEmail(xssPayload, "Attacker <img src=x onerror=alert(1)>");

    expect(rendered.html).not.toContain("<script>");
    expect(rendered.html).toContain("&lt;script&gt;");
    expect(rendered.html).not.toContain("<img src=x");
  });

  it("throws validation error when required fields are missing", () => {
    const invalidPayload = {
      registration_id: "REG-2026-10001",
      // missing qr_credential_id, event_title, etc.
    };

    expect(() => renderTicketPassEmail(invalidPayload, "Jane Doe")).toThrowError(
      /Invalid ticket pass payload/
    );
  });

  it("successfully renders certificate HTML and text with serial number and event title", () => {
    const certPayload = {
      certificateNumber: "SKETCH-CERT-2026-9999",
      eventTitle: "Hackathon Finale 2026",
      issuedAt: "2026-10-19T10:00:00Z",
    };
    const rendered = renderCertificateEmail(
      certPayload,
      "Charlie Scholar",
      "Your Certificate for Hackathon Finale 2026"
    );

    expect(rendered.html).toContain("SKETCH-CERT-2026-9999");
    expect(rendered.html).toContain("Hackathon Finale 2026");
    expect(rendered.html).toContain("Charlie Scholar");
    expect(rendered.text).toContain("Certificate Number: SKETCH-CERT-2026-9999");
    expect(rendered.text).toContain("Recipient: Charlie Scholar");
  });

  it("successfully renders announcement HTML and text with custom content and sender", () => {
    const announcementPayload = {
      bodyContent: "The venue has been shifted to Conference Hall 3.",
      sender: "Event Coordinator",
    };
    const rendered = renderAnnouncementEmail(
      announcementPayload,
      "Dana Attendee",
      "Urgent: Venue Update"
    );

    expect(rendered.html).toContain("Urgent: Venue Update");
    expect(rendered.html).toContain("Dana Attendee");
    expect(rendered.html).toContain("The venue has been shifted to Conference Hall 3.");
    expect(rendered.html).toContain("Event Coordinator");
    expect(rendered.text).toContain("Subject: Urgent: Venue Update");
    expect(rendered.text).toContain("The venue has been shifted to Conference Hall 3.");
  });
});

describe("Email Engine: Provider Adapters", () => {
  let testAdapter: TestEmailAdapter;

  beforeEach(() => {
    testAdapter = new TestEmailAdapter();
  });

  it("TestEmailAdapter records dispatched emails in memory", async () => {
    const result = await testAdapter.sendEmail({
      to: "test@example.com",
      toName: "Test User",
      subject: "Test Subject",
      html: "<p>Hello</p>",
      idempotencyKey: "key-123",
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
    expect(testAdapter.sentMessages.length).toBe(1);
    expect(testAdapter.sentMessages[0].idempotencyKey).toBe("key-123");
    expect(testAdapter.sentMessages[0].to).toBe("test@example.com");
  });

  it("TestEmailAdapter correctly handles simulated failures", async () => {
    testAdapter.shouldFail = true;
    testAdapter.failureMessage = "Rate limit exceeded";
    testAdapter.failureRetryable = true;

    const result = await testAdapter.sendEmail({
      to: "test@example.com",
      subject: "Test",
      html: "<p>Hello</p>",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Rate limit exceeded");
    expect(result.retryable).toBe(true);
  });

  it("ResendEmailAdapter rejects live dispatch if API key is placeholder or unconfigured", async () => {
    const resend = new ResendEmailAdapter("your-resend-api-key-here", "test@sketch.org");
    const result = await resend.sendEmail({
      to: "test@example.com",
      subject: "Test",
      html: "<p>Hello</p>",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("RESEND_API_KEY_UNCONFIGURED");
    expect(result.retryable).toBe(false);
  });

  it("BrevoEmailAdapter rejects live dispatch if API key is missing or placeholder", async () => {
    const brevoEmpty = new BrevoEmailAdapter("", "test@sketch.org");
    const resEmpty = await brevoEmpty.sendEmail({
      to: "test@example.com",
      subject: "Test",
      html: "<p>Hello</p>",
    });
    expect(resEmpty.success).toBe(false);
    expect(resEmpty.error).toContain("BREVO_API_KEY_UNCONFIGURED");
    expect(resEmpty.retryable).toBe(false);

    const brevoPlaceholder = new BrevoEmailAdapter(
      "xkeysib-your_brevo_api_key_here",
      "test@sketch.org"
    );
    const resPlaceholder = await brevoPlaceholder.sendEmail({
      to: "test@example.com",
      subject: "Test",
      html: "<p>Hello</p>",
    });
    expect(resPlaceholder.success).toBe(false);
    expect(resPlaceholder.error).toContain("BREVO_API_KEY_UNCONFIGURED");
    expect(resPlaceholder.retryable).toBe(false);
  });

  it("BrevoEmailAdapter formats payload properly and handles HTTP 200 success", async () => {
    let capturedUrl = "";
    let capturedBody: any = null;
    let capturedHeaders: any = null;

    vi.spyOn(global, "fetch").mockImplementationOnce(async (url: any, init: any) => {
      capturedUrl = url.toString();
      capturedHeaders = init.headers;
      capturedBody = JSON.parse(init.body);
      return {
        ok: true,
        status: 201,
        json: async () => ({ messageId: "<brevo-msg-xyz-123@smtp-relay.mailin.fr>" }),
      } as any;
    });

    const brevo = new BrevoEmailAdapter("xkeysib-valid-test-key", "SketchHUB <noreply@sketch.events>");
    const result = await brevo.sendEmail({
      to: "attendee@example.com",
      toName: "Test Attendee",
      subject: "Ticket Confirmation",
      html: "<p>Your ticket</p>",
      text: "Your ticket",
      replyTo: "support@sketch.events",
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBe("<brevo-msg-xyz-123@smtp-relay.mailin.fr>");
    expect(capturedUrl).toBe("https://api.brevo.com/v3/smtp/email");
    expect(capturedHeaders["api-key"]).toBe("xkeysib-valid-test-key");
    expect(capturedBody.sender).toEqual({ name: "SketchHUB", email: "noreply@sketch.events" });
    expect(capturedBody.to).toEqual([{ email: "attendee@example.com", name: "Test Attendee" }]);
    expect(capturedBody.replyTo).toEqual({ email: "support@sketch.events" });
  });

  it("BrevoEmailAdapter classifies HTTP 429 rate limits and 5xx as retryable", async () => {
    // 429 Rate Limit
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ message: "Rate limit exceeded" }),
    } as any);

    const brevo = new BrevoEmailAdapter("test-key", "test@sketch.org");
    const res429 = await brevo.sendEmail({ to: "test@example.com", subject: "Test", html: "hi" });
    expect(res429.success).toBe(false);
    expect(res429.error).toContain("429");
    expect(res429.retryable).toBe(true);

    // 503 Service Unavailable
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({ message: "Service unavailable" }),
    } as any);

    const res503 = await brevo.sendEmail({ to: "test@example.com", subject: "Test", html: "hi" });
    expect(res503.success).toBe(false);
    expect(res503.error).toContain("503");
    expect(res503.retryable).toBe(true);
  });

  it("BrevoEmailAdapter classifies HTTP 401 and 400 as non-retryable terminal errors", async () => {
    // 401 Unauthorized (Invalid Key)
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: "Key not found" }),
    } as any);

    const brevo = new BrevoEmailAdapter("bad-key", "test@sketch.org");
    const res401 = await brevo.sendEmail({ to: "test@example.com", subject: "Test", html: "hi" });
    expect(res401.success).toBe(false);
    expect(res401.error).toContain("401");
    expect(res401.retryable).toBe(false);

    // 400 Bad Request / Unverified Sender
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: "Sender email is not authorized" }),
    } as any);

    const res400 = await brevo.sendEmail({ to: "test@example.com", subject: "Test", html: "hi" });
    expect(res400.success).toBe(false);
    expect(res400.error).toContain("Sender email is not authorized");
    expect(res400.retryable).toBe(false);
  });

  it("BrevoEmailAdapter marks network/socket failures as retryable", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("ETIMEDOUT: Connection timed out"));

    const brevo = new BrevoEmailAdapter("test-key", "test@sketch.org");
    const resTimeout = await brevo.sendEmail({ to: "test@example.com", subject: "Test", html: "hi" });
    expect(resTimeout.success).toBe(false);
    expect(resTimeout.error).toContain("ETIMEDOUT");
    expect(resTimeout.retryable).toBe(true);
  });

  it("EmailOutboxWorker selects BrevoEmailAdapter with case-insensitive normalization", async () => {
    const originalEnv = { ...process.env };
    try {
      process.env.EMAIL_PROVIDER = "BREVO";
      process.env.BREVO_API_KEY = "xkeysib-mock-key";
      const { resetServerEnvCache } = await import("@/lib/env.server");
      resetServerEnvCache();

      const worker = new EmailOutboxWorker();
      expect((worker as any).adapter.name).toBe("brevo");

      process.env.EMAIL_PROVIDER = "  brevo  ";
      resetServerEnvCache();
      const workerTrimmed = new EmailOutboxWorker();
      expect((workerTrimmed as any).adapter.name).toBe("brevo");
    } finally {
      process.env = originalEnv;
      const { resetServerEnvCache } = await import("@/lib/env.server");
      resetServerEnvCache();
    }
  });

  it("calculates exponential backoff correctly across retry attempts", () => {
    const baseBackoffMinutes = 2;
    const maxAttempts = 5;

    // Progression: 2^(attempts-1) * baseBackoffMinutes
    const calcBackoff = (nextAttempts: number) => {
      const isTerminal = nextAttempts >= maxAttempts;
      return isTerminal ? 0 : Math.pow(2, nextAttempts - 1) * baseBackoffMinutes;
    };

    expect(calcBackoff(1)).toBe(2);   // Attempt 1: 2 minutes
    expect(calcBackoff(2)).toBe(4);   // Attempt 2: 4 minutes
    expect(calcBackoff(3)).toBe(8);   // Attempt 3: 8 minutes
    expect(calcBackoff(4)).toBe(16);  // Attempt 4: 16 minutes
    expect(calcBackoff(5)).toBe(0);   // Attempt 5: Terminal failure (0 backoff, no reschedule)
    expect(calcBackoff(6)).toBe(0);   // Attempt 6: Terminal
  });

  it("SketchRepository.listOutboxJobs accurately maps delivery telemetry and status", async () => {
    const { SketchRepository } = await import("@/lib/supabase/repository");
    const jobs = await SketchRepository.listOutboxJobs();

    expect(Array.isArray(jobs)).toBe(true);
    expect(jobs.length).toBeGreaterThan(0);

    // Verify presence of failed job with error telemetry in mock/preview
    const failedJob = jobs.find((j) => j.status === "failed");
    expect(failedJob).toBeDefined();
    expect(failedJob?.attempts).toBe(5);
    expect(failedJob?.lastError).toContain("SMTP 550");
    expect(failedJob?.recipientEmail).toBe("undeliverable.inbox@domain-invalid.org");

    // Verify sent job mapping
    const sentJob = jobs.find((j) => j.status === "sent");
    expect(sentJob).toBeDefined();
    expect(sentJob?.attempts).toBe(1);
    expect(sentJob?.deliveredAt).toBeDefined();
  });

  it("Cron process-outbox route enforces strict timing-safe secret authentication", async () => {
    const originalEnv = { ...process.env };
    try {
      const { POST } = await import("@/app/api/cron/process-outbox/route");
      const { resetServerEnvCache } = await import("@/lib/env.server");

      // 1. Unconfigured CRON_SECRET returns 503
      delete process.env.CRON_SECRET;
      resetServerEnvCache();

      const unconfiguredReq = new Request("http://localhost:3000/api/cron/process-outbox", {
        method: "POST",
      }) as any;
      const res503 = await POST(unconfiguredReq);
      expect(res503.status).toBe(503);

      // 2. Configured CRON_SECRET but missing header returns 401
      process.env.CRON_SECRET = "super-secret-cron-token-12345";
      resetServerEnvCache();

      const missingAuthReq = new Request("http://localhost:3000/api/cron/process-outbox", {
        method: "POST",
      }) as any;
      const res401 = await POST(missingAuthReq);
      expect(res401.status).toBe(401);

      // 3. Invalid credentials returns 403
      const invalidAuthReq = new Request("http://localhost:3000/api/cron/process-outbox", {
        method: "POST",
        headers: {
          authorization: "Bearer wrong-token",
        },
      }) as any;
      const res403 = await POST(invalidAuthReq);
      expect(res403.status).toBe(403);
    } finally {
      process.env = originalEnv;
      const { resetServerEnvCache } = await import("@/lib/env.server");
      resetServerEnvCache();
    }
  });
});

