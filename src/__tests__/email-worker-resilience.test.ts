import { describe, it, expect, beforeEach, vi } from "vitest";
import { EmailOutboxWorker } from "@/lib/email/worker";
import { TestEmailAdapter } from "@/lib/email/adapters";
import * as serverSupabase from "@/lib/supabase/server";

describe("Email Engine: Worker Resilience & Atomic Processing", () => {
  let mockSupabase: any;
  let outboxStore: any[];
  let testAdapter: TestEmailAdapter;
  let worker: EmailOutboxWorker;

  beforeEach(() => {
    outboxStore = [
      {
        id: "job-1",
        event_id: "evt-01",
        recipient_email: "alice@example.com",
        recipient_name: "Alice Designer",
        subject: "Your Pass for Sketch Con",
        template_type: "ticket_pass",
        payload: {
          registration_id: "REG-2026-10001-A1B2C3",
          qr_credential_id: "SKETCH-TKT-001",
          event_title: "Sketch Con 2026",
          venue: "Main Hall",
          start_date: "2026-11-20T10:00:00Z",
        },
        status: "queued",
        attempts: 0,
        last_error: null,
        scheduled_at: new Date(Date.now() - 1000).toISOString(),
        delivered_at: null,
        created_at: new Date().toISOString(),
      },
    ];

    mockSupabase = {
      rpc: vi.fn(async (procName: string, args: any) => {
        if (procName === "claim_outbox_batch") {
          const eligible = outboxStore.filter(
            (j) => (j.status === "queued" || j.status === "failed") && j.attempts < (args.p_max_attempts || 5)
          ).slice(0, args.p_batch_size || 10);

          eligible.forEach((j) => {
            j.status = "processing";
          });
          return { data: eligible, error: null };
        }
        return { data: null, error: { message: "unknown rpc" } };
      }),
      from: vi.fn((_table: string) => {
        class MockQueryBuilder {
          private filters: ((item: any) => boolean)[] = [];
          private updateData: any = null;
          private insertData: any = null;
          private isUpdate = false;
          private isInsert = false;

          select(_fields?: string) {
            return this;
          }

          insert(data: any) {
            this.isInsert = true;
            this.insertData = data;
            return this;
          }

          update(data: any) {
            this.isUpdate = true;
            this.updateData = data;
            return this;
          }

          eq(field: string, val: any) {
            this.filters.push((item) => item[field] === val);
            return this;
          }

          is(field: string, val: any) {
            this.filters.push((item) => (item[field] ?? null) === val);
            return this;
          }

          ilike(field: string, val: string) {
            const target = String(val).toLowerCase();
            this.filters.push((item) => String(item[field] || "").toLowerCase() === target);
            return this;
          }

          lte(field: string, val: any) {
            this.filters.push((item) => item[field] <= val);
            return this;
          }

          lt(field: string, val: any) {
            this.filters.push((item) => item[field] < val);
            return this;
          }

          in(field: string, vals: any[]) {
            this.filters.push((item) => vals.includes(item[field]));
            return this;
          }

          order(_field?: string, _opts?: any) {
            return this;
          }

          limit(_n?: number) {
            return this;
          }

          single() {
            return this.execute().then((res) => ({
              data: res.data[0] || null,
              error: res.data[0] ? null : { message: "Not found" },
            }));
          }

          private execute() {
            if (this.isInsert) {
              return Promise.resolve({ data: [this.insertData], error: null });
            }
            const matched = outboxStore.filter((item) => this.filters.every((fn) => fn(item)));
            if (this.isUpdate && this.updateData) {
              matched.forEach((item) => Object.assign(item, this.updateData));
            }
            return Promise.resolve({ data: matched.map((m) => ({ ...m })), error: null });
          }

          then(resolve: (val: any) => any, reject?: (err: any) => any) {
            return this.execute().then(resolve, reject);
          }
        }

        return new MockQueryBuilder();
      }),
    };

    vi.spyOn(serverSupabase, "createAdminClient").mockReturnValue(mockSupabase);
    testAdapter = new TestEmailAdapter();
    worker = new EmailOutboxWorker(testAdapter);
  });

  it("claims, renders, sends, and updates job to 'sent' on success", async () => {
    const result = await worker.processBatch(10);

    expect(result.claimed).toBe(1);
    expect(result.processed).toBe(1);
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(0);

    expect(testAdapter.sentMessages.length).toBe(1);
    expect(testAdapter.sentMessages[0].to).toBe("alice@example.com");
    expect(testAdapter.sentMessages[0].idempotencyKey).toBe("outbox-job-1");

    expect(outboxStore[0].status).toBe("sent");
    expect(outboxStore[0].attempts).toBe(1);
    expect(outboxStore[0].delivered_at).toBeDefined();
  });

  it("increments attempts and schedules exponential backoff on retryable failure", async () => {
    testAdapter.shouldFail = true;
    testAdapter.failureMessage = "Rate limited by provider";
    testAdapter.failureRetryable = true;

    const result = await worker.processBatch(10);

    expect(result.claimed).toBe(1);
    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.terminalFailures).toBe(0);

    expect(outboxStore[0].status).toBe("failed");
    expect(outboxStore[0].attempts).toBe(1);
    expect(outboxStore[0].last_error).toBe("Rate limited by provider");
    // Scheduled at should be moved forward by backoff minutes
    expect(new Date(outboxStore[0].scheduled_at).getTime()).toBeGreaterThan(Date.now());
  });

  it("marks terminal failure when maximum attempts (5) are reached", async () => {
    outboxStore[0].attempts = 4; // next will be 5
    testAdapter.shouldFail = true;
    testAdapter.failureMessage = "Mailbox unavailable";
    testAdapter.failureRetryable = true;

    const result = await worker.processBatch(10);

    expect(result.claimed).toBe(1);
    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.terminalFailures).toBe(1);
    expect(outboxStore[0].attempts).toBe(5);
  });

  it("recovers abandoned jobs that were stuck in 'processing' state", async () => {
    outboxStore[0].status = "processing";
    outboxStore[0].scheduled_at = new Date(Date.now() - 15 * 60 * 1000).toISOString(); // 15 mins ago

    const recoveredCount = await worker.recoverStuckJobs(10);

    expect(recoveredCount).toBe(1);
    expect(outboxStore[0].status).toBe("queued");
    expect(outboxStore[0].last_error).toContain("RECOVERED");
  });

  it("exhausts attempts on non-retryable terminal failure so job is not re-claimed", async () => {
    testAdapter.shouldFail = true;
    testAdapter.failureMessage = "Resend API Error (403): Domain not verified";
    testAdapter.failureRetryable = false;

    const result = await worker.processBatch(10);

    expect(result.claimed).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.terminalFailures).toBe(1);
    expect(outboxStore[0].status).toBe("failed");
    expect(outboxStore[0].attempts).toBe(5);

    const secondRun = await worker.processBatch(10);
    expect(secondRun.claimed).toBe(0);
  });

  it("resets attempts to 0 and clears error when retrying a failed outbox job", async () => {
    const originalEnv = { ...process.env };
    const { resetAppEnvCache } = await import("@/lib/env");
    const { resetServerEnvCache } = await import("@/lib/env.server");
    const { SketchRepository } = await import("@/lib/supabase/repository");

    try {
      process.env.APP_MODE = "production";
      process.env.NEXT_PUBLIC_APP_MODE = "production";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fvnkhzlbvxemwlkmwhbz.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "sb_publishable_test_key";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
      resetAppEnvCache();
      resetServerEnvCache();

      outboxStore[0].status = "failed";
      outboxStore[0].attempts = 5;
      outboxStore[0].last_error = "Previous permanent failure";

      const retryRes = await SketchRepository.retryFailedCommunication("job-1");
      expect(retryRes.success).toBe(true);
      expect(outboxStore[0].status).toBe("queued");
      expect(outboxStore[0].attempts).toBe(0);
      expect(outboxStore[0].last_error).toBeNull();
    } finally {
      process.env = originalEnv;
      resetAppEnvCache();
      resetServerEnvCache();
    }
  });

  it("throws instead of falling back to preview store in production mode when service key is missing", async () => {
    const originalEnv = { ...process.env };
    const { resetAppEnvCache } = await import("@/lib/env");
    const { resetServerEnvCache } = await import("@/lib/env.server");

    try {
      vi.restoreAllMocks();
      process.env.APP_MODE = "production";
      process.env.NEXT_PUBLIC_APP_MODE = "production";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fvnkhzlbvxemwlkmwhbz.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "sb_publishable_test_key";
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      resetAppEnvCache();
      resetServerEnvCache();

      const prodWorker = new EmailOutboxWorker(testAdapter);
      await expect(prodWorker.recoverStuckJobs(10)).rejects.toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
      await expect(prodWorker.processBatch(10)).rejects.toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
      await expect(prodWorker.processSingleJob("job-1")).rejects.toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
    } finally {
      process.env = originalEnv;
      resetAppEnvCache();
      resetServerEnvCache();
    }
  });

  describe("Single-Record Isolated Processing (processSingleJob)", () => {
    beforeEach(() => {
      outboxStore = [
        {
          id: "df68a1ec-2c87-4f80-8781-a02994bc568b",
          event_id: "evt-01",
          recipient_email: "tharikadheena@gmail.com",
          recipient_name: "Tharika",
          subject: "Your Pass for Sketchathon",
          template_type: "ticket_pass",
          payload: {
            registration_id: "REG-2026-0001",
            qr_credential_id: "SKETCH-TKT-001",
            event_title: "Sketchathon",
            venue: "Main Hall",
            start_date: "2026-11-20T10:00:00Z",
          },
          status: "queued",
          attempts: 0,
          last_error: null,
          scheduled_at: new Date(Date.now() - 5000).toISOString(),
          delivered_at: null,
          created_at: new Date().toISOString(),
        },
        {
          id: "968d4453-b62d-466f-bf8d-9efa0f7084e1",
          event_id: "evt-02",
          recipient_email: "tharikadheena@gmail.com",
          recipient_name: "Tharika",
          subject: "Your Pass for Demo",
          template_type: "ticket_pass",
          payload: {
            registration_id: "REG-2026-0002",
            qr_credential_id: "SKETCH-TKT-002",
            event_title: "Demo",
            venue: "Hall B",
            start_date: "2026-11-21T10:00:00Z",
          },
          status: "queued",
          attempts: 0,
          last_error: null,
          scheduled_at: new Date(Date.now() - 5000).toISOString(),
          delivered_at: null,
          created_at: new Date().toISOString(),
        },
        {
          id: "b10f4c91-28c7-4b8d-8fe4-3bbb08b32dd0",
          event_id: "evt-02",
          recipient_email: "malarvizhidheena@gmail.com",
          recipient_name: "Malar",
          subject: "Your Pass for demo",
          template_type: "ticket_pass",
          payload: {
            registration_id: "REG-2026-0003",
            qr_credential_id: "SKETCH-TKT-003",
            event_title: "demo",
            venue: "Hall B",
            start_date: "2026-11-21T10:00:00Z",
          },
          status: "queued",
          attempts: 0,
          last_error: null,
          scheduled_at: new Date(Date.now() - 5000).toISOString(),
          delivered_at: null,
          created_at: new Date().toISOString(),
        },
      ];
    });

    it("processes ONLY the target record and leaves other queued records and recipients untouched", async () => {
      const targetId = "df68a1ec-2c87-4f80-8781-a02994bc568b";
      const res = await worker.processSingleJob(targetId, {
        expectedRecipientEmail: "tharikadheena@gmail.com",
      });

      expect(res).toEqual({
        claimed: 1,
        processed: 1,
        succeeded: 1,
        failed: 0,
        terminalFailures: 0,
      });
      expect(mockSupabase.rpc).not.toHaveBeenCalled();
      expect(testAdapter.sentMessages.length).toBe(1);
      expect(testAdapter.sentMessages[0].to).toBe("tharikadheena@gmail.com");
      expect(testAdapter.sentMessages[0].subject).toBe("Your Pass for Sketchathon");
      expect(testAdapter.sentMessages[0].idempotencyKey).toBe(`outbox-${targetId}`);

      // Target updated to sent
      expect(outboxStore[0].status).toBe("sent");
      expect(outboxStore[0].attempts).toBe(1);
      expect(outboxStore[0].delivered_at).toBeTruthy();

      // Other queued record for same recipient remains untouched
      expect(outboxStore[1].status).toBe("queued");
      expect(outboxStore[1].attempts).toBe(0);
      expect(outboxStore[1].delivered_at).toBeNull();

      // Other recipient record remains untouched
      expect(outboxStore[2].status).toBe("queued");
      expect(outboxStore[2].attempts).toBe(0);
      expect(outboxStore[2].delivered_at).toBeNull();
    });

    it("does not claim a record if expectedRecipientEmail does not match", async () => {
      const otherRecipientJobId = "b10f4c91-28c7-4b8d-8fe4-3bbb08b32dd0";
      const res = await worker.processSingleJob(otherRecipientJobId, {
        expectedRecipientEmail: "tharikadheena@gmail.com",
      });

      expect(res.claimed).toBe(0);
      expect(res.processed).toBe(0);
      expect(testAdapter.sentMessages.length).toBe(0);
      expect(outboxStore[2].status).toBe("queued");
      expect(outboxStore[2].attempts).toBe(0);
    });

    it("stops cleanly without modifying anything when no eligible record exists", async () => {
      const res = await worker.processSingleJob("00000000-0000-0000-0000-000000000000", {
        expectedRecipientEmail: "tharikadheena@gmail.com",
      });

      expect(res).toEqual({
        claimed: 0,
        processed: 0,
        succeeded: 0,
        failed: 0,
        terminalFailures: 0,
      });
      expect(testAdapter.sentMessages.length).toBe(0);
      expect(outboxStore.every((r) => r.status === "queued" && r.attempts === 0)).toBe(true);
    });

    it("does not mark email as sent when provider rejects the message", async () => {
      testAdapter.shouldFail = true;
      testAdapter.failureMessage = "Resend API Error (403): Forbidden";
      testAdapter.failureRetryable = false;

      const targetId = "df68a1ec-2c87-4f80-8781-a02994bc568b";
      const res = await worker.processSingleJob(targetId, {
        expectedRecipientEmail: "tharikadheena@gmail.com",
      });

      expect(res.claimed).toBe(1);
      expect(res.succeeded).toBe(0);
      expect(res.failed).toBe(1);
      expect(res.terminalFailures).toBe(1);

      expect(outboxStore[0].status).toBe("failed");
      expect(outboxStore[0].delivered_at).toBeNull();
      expect(outboxStore[0].last_error).toContain("403");
      expect(outboxStore[0].attempts).toBe(5);

      // Unrelated queued records remain completely untouched
      expect(outboxStore[1].status).toBe("queued");
      expect(outboxStore[2].status).toBe("queued");
    });

    it("prevents duplicate sending if invoked concurrently or a second time on the same record", async () => {
      const targetId = "df68a1ec-2c87-4f80-8781-a02994bc568b";

      const [first, second] = await Promise.all([
        worker.processSingleJob(targetId, { expectedRecipientEmail: "tharikadheena@gmail.com" }),
        worker.processSingleJob(targetId, { expectedRecipientEmail: "tharikadheena@gmail.com" }),
      ]);

      expect(first.claimed + second.claimed).toBe(1);
      expect(first.succeeded + second.succeeded).toBe(1);
      expect(testAdapter.sentMessages.length).toBe(1);

      // Third invocation after already sent must do nothing
      const third = await worker.processSingleJob(targetId, {
        expectedRecipientEmail: "tharikadheena@gmail.com",
      });
      expect(third.claimed).toBe(0);
      expect(testAdapter.sentMessages.length).toBe(1);
    });
  });
});
