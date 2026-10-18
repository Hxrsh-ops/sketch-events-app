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
      from: vi.fn((table: string) => {
        class MockQueryBuilder {
          private filters: ((item: any) => boolean)[] = [];
          private updateData: any = null;
          private isUpdate = false;

          select(_fields?: string) {
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

          private execute() {
            const matched = outboxStore.filter((item) => this.filters.every((fn) => fn(item)));
            if (this.isUpdate && this.updateData) {
              matched.forEach((item) => Object.assign(item, this.updateData));
            }
            return Promise.resolve({ data: matched, error: null });
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
    expect(testAdapter.sentMessages[0].idempotencyKey).toBe("outbox-job-1-1");

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
});
