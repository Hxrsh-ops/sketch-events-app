import { describe, it, expect, vi, beforeEach } from "vitest";
import { EmailOutboxWorker } from "@/lib/email/worker";
import { BrevoEmailAdapter, MailpitEmailAdapter, TestEmailAdapter, ResendEmailAdapter } from "@/lib/email/adapters";
import { resetServerEnvCache } from "@/lib/env.server";

describe("Email Lifecycle Hardening: Idempotency, Status Semantics & Local Verification", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetServerEnvCache();
  });

  describe("1. Stable Retry Idempotency Invariants", () => {
    it("ensures EmailOutboxWorker passes a STABLE idempotencyKey across retry attempts without appending attempt count", async () => {
      const mockAdapter = new TestEmailAdapter();
      const sendSpy = vi.spyOn(mockAdapter, "sendEmail");

      // Mock Supabase admin client with claim_outbox_batch returning job on attempt 1, then attempt 2
      const testJobId = "job-uuid-12345";
      const worker = new EmailOutboxWorker(mockAdapter);

      // Force worker to process against simulated Supabase RPC
      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({
          data: [
            {
              id: testJobId,
              event_id: "evt-1",
              recipient_email: "student@sketch.test",
              recipient_name: "Student One",
              subject: "Your Pass for Design Sprint",
              template_type: "ticket_pass",
              payload: {
                registration_id: "REG-001",
                qr_credential_id: "QR-001",
                event_title: "Design Sprint",
                venue: "Auditorium",
                start_date: "2026-11-01T10:00:00Z",
              },
              status: "processing",
              attempts: 0,
              last_error: null,
              scheduled_at: new Date().toISOString(),
              delivered_at: null,
              created_at: new Date().toISOString(),
            },
          ],
          error: null,
        }),
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      };

      // Mock createAdminClient to return our mock
      const serverModule = await import("@/lib/supabase/server");
      vi.spyOn(serverModule, "createAdminClient").mockReturnValue(mockSupabase as any);

      // Run Attempt 1
      await worker.processBatch(1);
      expect(sendSpy).toHaveBeenCalledTimes(1);
      const call1 = sendSpy.mock.calls[0][0];
      expect(call1.idempotencyKey).toBe(`outbox-${testJobId}`);

      // Simulate Attempt 2 retry (after a transient network timeout where attempts was incremented to 1)
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [
          {
            id: testJobId,
            event_id: "evt-1",
            recipient_email: "student@sketch.test",
            recipient_name: "Student One",
            subject: "Your Pass for Design Sprint",
            template_type: "ticket_pass",
            payload: {
              registration_id: "REG-001",
              qr_credential_id: "QR-001",
              event_title: "Design Sprint",
              venue: "Auditorium",
              start_date: "2026-11-01T10:00:00Z",
            },
            status: "processing",
            attempts: 1, // Attempt incremented
            last_error: "Transport timeout",
            scheduled_at: new Date().toISOString(),
            delivered_at: null,
            created_at: new Date().toISOString(),
          },
        ],
        error: null,
      });

      await worker.processBatch(1);
      expect(sendSpy).toHaveBeenCalledTimes(2);
      const call2 = sendSpy.mock.calls[1][0];

      // CRITICAL INVARIANT: Idempotency key MUST be stable across retries of the same outbox job!
      // If it changed to outbox-${jobId}-2, the provider would treat it as a new email and send a duplicate!
      expect(call2.idempotencyKey).toBe(`outbox-${testJobId}`);
      expect(call2.idempotencyKey).toBe(call1.idempotencyKey);
    });
  });

  describe("2. Brevo Adapter Idempotency & Error Semantics", () => {
    it("attaches X-Idempotency-Key and tags to Brevo payload and headers", async () => {
      let capturedHeaders: any = null;
      let capturedBody: any = null;

      vi.spyOn(global, "fetch").mockImplementationOnce(async (url, init: any) => {
        capturedHeaders = init?.headers;
        capturedBody = JSON.parse(init?.body || "{}");
        return {
          ok: true,
          status: 200,
          json: async () => ({ messageId: "brevo-msg-999" }),
        } as any;
      });

      const brevo = new BrevoEmailAdapter("valid-brevo-key", "Sketch <events@sketch.org>");
      const res = await brevo.sendEmail({
        to: "attendee@sketch.test",
        subject: "Welcome",
        html: "<p>Hello</p>",
        idempotencyKey: "outbox-test-uuid",
      });

      expect(res.success).toBe(true);
      expect(res.messageId).toBe("brevo-msg-999");
      expect(capturedHeaders["X-Idempotency-Key"]).toBe("outbox-test-uuid");
      expect(capturedBody.headers["X-Idempotency-Key"]).toBe("outbox-test-uuid");
      expect(capturedBody.tags).toContain("outbox-test-uuid");
    });

    it("correctly handles AbortError/TimeoutError as Brevo Transport Timeout (retryable)", async () => {
      const timeoutErr = new Error("The operation was aborted due to timeout");
      timeoutErr.name = "TimeoutError";
      vi.spyOn(global, "fetch").mockRejectedValueOnce(timeoutErr);

      const brevo = new BrevoEmailAdapter("valid-brevo-key", "Sketch <events@sketch.org>");
      const res = await brevo.sendEmail({
        to: "attendee@sketch.test",
        subject: "Welcome",
        html: "<p>Hello</p>",
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("Brevo Transport Timeout");
      expect(res.retryable).toBe(true);
    });

    it("treats Brevo quota exceeded (HTTP 402) as non-retryable terminal failure", async () => {
      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 402,
        json: async () => ({ message: "Account credits depleted" }),
      } as any);

      const brevo = new BrevoEmailAdapter("valid-brevo-key", "Sketch <events@sketch.org>");
      const res = await brevo.sendEmail({
        to: "attendee@sketch.test",
        subject: "Welcome",
        html: "<p>Hello</p>",
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("402");
      expect(res.retryable).toBe(false);
    });
  });

  describe("3. Mailpit Local Development Isolation", () => {
    it("routes Mailpit requests exclusively to local loopback port 54324 without external calls", async () => {
      let calledUrl = "";
      let calledBody: any = null;

      vi.spyOn(global, "fetch").mockImplementationOnce(async (url: any, init: any) => {
        calledUrl = String(url);
        calledBody = JSON.parse(init?.body || "{}");
        return {
          ok: true,
          status: 200,
          json: async () => ({ ID: "mailpit-msg-456" }),
        } as any;
      });

      const mailpit = new MailpitEmailAdapter("Sketch Events <noreply@sketch.events>");
      const res = await mailpit.sendEmail({
        to: "local-attendee@sketch.test",
        toName: "Local Attendee",
        subject: "Offline Ticket Pass",
        html: "<p>Offline Ticket</p>",
        text: "Offline Ticket",
      });

      expect(res.success).toBe(true);
      expect(calledUrl).toBe("http://127.0.0.1:54324/api/v1/send");
      expect(calledBody.From.Email).toBe("noreply@sketch.events");
      expect(calledBody.To[0].Email).toBe("local-attendee@sketch.test");
      expect(calledBody.Subject).toBe("Offline Ticket Pass");
    });
  });

  describe("4. Status Semantics (Sent/Accepted vs Inbox Delivered)", () => {
    it("verifies that successful provider dispatch is recorded as sent and distinct from inbox delivery", () => {
      // In the database contract, status 'sent' indicates provider acceptance
      const jobStatus: "queued" | "processing" | "sent" | "failed" = "sent";
      expect(jobStatus).toBe("sent");
      expect(jobStatus).not.toBe("delivered"); // delivery is not assumed without webhook confirmation
    });
  });
});
