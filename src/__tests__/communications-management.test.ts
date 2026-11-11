import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import * as sessionModule from "@/lib/auth/session";
import * as serverSupabase from "@/lib/supabase/server";
import { resetAppEnvCache } from "@/lib/env";
import { resetServerEnvCache } from "@/lib/env.server";
import {
  cancelOutboxJobsAction,
  deleteOutboxJobsAction,
  archiveOutboxJobsAction,
  retryFailedDispatchAction,
} from "@/app/actions/communication-actions";
import { EmailOutboxWorker } from "@/lib/email/worker";
import { TestEmailAdapter } from "@/lib/email/adapters";
import { saveCommunication, getStoredCommunications, getStoredAuditLogs } from "@/lib/registration-store";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Communications & Outbox Management (Actions, Concurrency, Audit & Lifecycle)", () => {
  const originalEnv = { ...process.env };
  let outboxRows: any[];
  let auditRows: any[];
  let beforeUpdateHook: (() => void) | null;
  let beforeDeleteHook: (() => void) | null;
  let beforeFallbackSelectHook: (() => void) | null;
  let simulateAuditInsertError: boolean;
  let simulateMissingDeleteRpc: boolean;
  let mockSupabase: any;

  const adminSession = {
    isAuthenticated: true,
    isAdmin: true,
    user: {
      id: "admin-uuid-001",
      name: "Master Admin",
      email: "admin@sketch.org",
      role: "master_admin" as const,
    },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    resetAppEnvCache();
    resetServerEnvCache();
    process.env = {
      ...originalEnv,
      APP_MODE: "production",
      NEXT_PUBLIC_APP_MODE: "production",
      NEXT_PUBLIC_SUPABASE_URL: "https://fvnkhzlbvxemwlkmwhbz.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_test_key",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
    };

    beforeUpdateHook = null;
    beforeDeleteHook = null;
    beforeFallbackSelectHook = null;
    simulateAuditInsertError = false;
    simulateMissingDeleteRpc = false;
    auditRows = [];
    outboxRows = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        event_id: "evt-1",
        recipient_email: "queued1@sketch.test",
        recipient_name: "Queued One",
        subject: "Queued Pass 1",
        template_type: "ticket_pass",
        payload: {
          registration_id: "REG-001",
          qr_credential_id: "QR-001",
          event_title: "Sketchathon",
          venue: "Hall A",
          start_date: "2026-11-20T10:00:00Z",
        },
        status: "queued",
        attempts: 0,
        last_error: null,
        scheduled_at: new Date(Date.now() - 10000).toISOString(),
        delivered_at: null,
        archived_at: null,
        archived_by: null,
        cancelled_at: null,
        cancelled_by: null,
        created_at: new Date().toISOString(),
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        event_id: "evt-1",
        recipient_email: "failed1@sketch.test",
        recipient_name: "Failed One",
        subject: "Failed Pass 1",
        template_type: "ticket_pass",
        payload: {
          registration_id: "REG-002",
          qr_credential_id: "QR-002",
          event_title: "Sketchathon",
          venue: "Hall A",
          start_date: "2026-11-20T10:00:00Z",
        },
        status: "failed",
        attempts: 5,
        last_error: "Resend API Error (403): Forbidden",
        scheduled_at: new Date(Date.now() - 10000).toISOString(),
        delivered_at: null,
        archived_at: null,
        archived_by: null,
        cancelled_at: null,
        cancelled_by: null,
        created_at: new Date().toISOString(),
      },
      {
        id: "33333333-3333-4333-8333-333333333333",
        event_id: "evt-1",
        recipient_email: "sent1@sketch.test",
        recipient_name: "Sent One",
        subject: "Sent Pass 1",
        template_type: "ticket_pass",
        payload: {
          registration_id: "REG-003",
          qr_credential_id: "QR-003",
          event_title: "Sketchathon",
          venue: "Hall A",
          start_date: "2026-11-20T10:00:00Z",
        },
        status: "sent",
        attempts: 1,
        last_error: null,
        scheduled_at: new Date(Date.now() - 20000).toISOString(),
        delivered_at: "2026-11-11T09:00:00.000Z",
        archived_at: null,
        archived_by: null,
        cancelled_at: null,
        cancelled_by: null,
        created_at: new Date().toISOString(),
      },
      {
        id: "44444444-4444-4444-8444-444444444444",
        event_id: "evt-1",
        recipient_email: "proc1@sketch.test",
        recipient_name: "Processing One",
        subject: "Processing Pass 1",
        template_type: "ticket_pass",
        payload: {
          registration_id: "REG-004",
          qr_credential_id: "QR-004",
          event_title: "Sketchathon",
          venue: "Hall A",
          start_date: "2026-11-20T10:00:00Z",
        },
        status: "processing",
        attempts: 0,
        last_error: null,
        scheduled_at: new Date().toISOString(),
        delivered_at: null,
        archived_at: null,
        archived_by: null,
        cancelled_at: null,
        cancelled_by: null,
        created_at: new Date().toISOString(),
      },
    ];

    mockSupabase = {
      rpc: vi.fn(async (procName: string, args: any) => {
        if (procName === "delete_outbox_jobs_with_audit") {
          if (simulateMissingDeleteRpc) {
            return {
              data: null,
              error: {
                code: "PGRST202",
                message: "Could not find the function public.delete_outbox_jobs_with_audit",
              },
            };
          }

          if (beforeDeleteHook) {
            beforeDeleteHook();
          }

          const ids: string[] = Array.isArray(args?.p_job_ids) ? args.p_job_ids : [];
          const eligible = outboxRows.filter(
            (r) => ids.includes(r.id) && (r.status === "queued" || r.status === "failed")
          );
          const processedIds = eligible.map((r) => r.id);
          const deletedRecords = eligible.map((d) => ({
            id: d.id,
            eventId: d.event_id,
            recipientEmail: d.recipient_email,
            recipientName: d.recipient_name,
            subject: d.subject,
            templateType: d.template_type,
            status: d.status,
            attempts: d.attempts,
            lastError: d.last_error,
          }));

          if (processedIds.length > 0) {
            if (simulateAuditInsertError) {
              // Transaction rollback: outboxRows & auditRows remain untouched
              return {
                data: null,
                error: { message: "audit_logs insert failed: simulated DB constraint error" },
              };
            }

            const processedSet = new Set(processedIds);
            for (let i = outboxRows.length - 1; i >= 0; i--) {
              if (processedSet.has(outboxRows[i].id)) {
                outboxRows.splice(i, 1);
              }
            }

            auditRows.push({
              actor_id: args?.p_actor_id ?? null,
              actor_name: args?.p_actor_name || "Administrator",
              actor_email: args?.p_actor_email || "admin@sketch.org",
              action: "Deleted Outbox Dispatch",
              target: processedIds.length === 1 ? processedIds[0] : `${processedIds.length} dispatches`,
              details: {
                processedIds,
                deletedRecords,
                deletedCount: processedIds.length,
                timestamp: new Date().toISOString(),
              },
            });
          }

          return {
            data: {
              processed_ids: processedIds,
              deleted_records: deletedRecords,
              deleted_count: processedIds.length,
            },
            error: null,
          };
        }

        return { data: null, error: { message: "force fallback" } };
      }),
      from: vi.fn((table: string) => {
        const rowsRef = table === "audit_logs" ? auditRows : outboxRows;

        class QueryBuilder {
          private filters: Array<(row: any) => boolean> = [];
          private op: "select" | "update" | "delete" | "insert" = "select";
          private payload: any = null;
          private expectSingle = false;

          select(_cols?: string) {
            return this;
          }
          insert(data: any) {
            this.op = "insert";
            this.payload = data;
            return this;
          }
          update(data: any) {
            this.op = "update";
            this.payload = data;
            return this;
          }
          delete() {
            this.op = "delete";
            return this;
          }
          eq(field: string, val: any) {
            this.filters.push((r) => r[field] === val);
            return this;
          }
          in(field: string, vals: any[]) {
            this.filters.push((r) => vals.includes(r[field]));
            return this;
          }
          ilike(field: string, val: string) {
            const target = String(val).toLowerCase();
            this.filters.push((r) => String(r[field] || "").toLowerCase() === target);
            return this;
          }
          lt(field: string, val: any) {
            this.filters.push((r) => r[field] < val);
            return this;
          }
          lte(field: string, val: any) {
            this.filters.push((r) => r[field] <= val);
            return this;
          }
          is(field: string, val: any) {
            this.filters.push((r) => r[field] === val);
            return this;
          }
          not(field: string, op: string, val: any) {
            if (op === "is" && val === null) {
              this.filters.push((r) => r[field] !== null && r[field] !== undefined);
            }
            return this;
          }
          order() {
            return this;
          }
          limit() {
            return this;
          }
          single() {
            this.expectSingle = true;
            return this.execute();
          }

          private async execute() {
            if (this.op === "insert") {
              const items = Array.isArray(this.payload) ? this.payload : [this.payload];
              items.forEach((item) => rowsRef.push({ ...item }));
              return { data: items, error: null };
            }

            if (this.op === "select" && table === "communications_outbox" && beforeFallbackSelectHook) {
              const hook = beforeFallbackSelectHook;
              beforeFallbackSelectHook = null;
              const matchedPre = rowsRef.filter((r) => this.filters.every((fn) => fn(r)));
              const snapshot = matchedPre.map((m) => ({ ...m }));
              hook();
              return { data: snapshot, error: null };
            }

            if (this.op === "update" && beforeUpdateHook) {
              beforeUpdateHook();
            }
            if (this.op === "delete" && beforeDeleteHook) {
              beforeDeleteHook();
            }

            const matched = rowsRef.filter((r) => this.filters.every((fn) => fn(r)));

            if (this.op === "update") {
              matched.forEach((r) => Object.assign(r, this.payload));
            } else if (this.op === "delete") {
              const matchedSet = new Set(matched);
              for (let i = rowsRef.length - 1; i >= 0; i--) {
                if (matchedSet.has(rowsRef[i])) {
                  rowsRef.splice(i, 1);
                }
              }
            }

            if (this.expectSingle) {
              return {
                data: matched[0] ? { ...matched[0] } : null,
                error: matched[0] ? null : { message: "No matching row" },
              };
            }
            return { data: matched.map((m) => ({ ...m })), error: null };
          }

          then(resolve: (val: any) => any, reject?: (err: any) => any) {
            return this.execute().then(resolve, reject);
          }
        }

        return new QueryBuilder();
      }),
    };

    vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValue(adminSession);
    vi.spyOn(serverSupabase, "createAdminClient").mockReturnValue(mockSupabase);
  });

  it("cancels a queued record, records audit log, and prevents worker pickup", async () => {
    const queuedId = "11111111-1111-4111-8111-111111111111";
    const res = await cancelOutboxJobsAction({ jobIds: [queuedId] });

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.processedIds).toEqual([queuedId]);
    }
    expect(outboxRows[0].status).toBe("cancelled");
    expect(outboxRows[0].cancelled_at).toBeTruthy();
    expect(outboxRows[0].cancelled_by).toBe(adminSession.user.id);

    // Audit entry created
    expect(auditRows.length).toBe(1);
    expect(auditRows[0].action).toBe("Cancelled Outbox Dispatch");
    expect(auditRows[0].actor_email).toBe("admin@sketch.org");
    expect(auditRows[0].actor_id).toBe("admin-uuid-001");

    // Worker must never claim cancelled rows
    const testAdapter = new TestEmailAdapter();
    const worker = new EmailOutboxWorker(testAdapter);
    const singleRes = await worker.processSingleJob(queuedId);
    const batchRes = await worker.processBatch(10);
    expect(singleRes.claimed).toBe(0);
    expect(batchRes.claimed).toBe(0);
    expect(testAdapter.sentMessages.length).toBe(0);
  });

  it("deletes eligible queued and failed records and records audit log", async () => {
    const queuedId = "11111111-1111-4111-8111-111111111111";
    const failedId = "22222222-2222-4222-8222-222222222222";

    const res = await deleteOutboxJobsAction({ jobIds: [queuedId, failedId] });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.processedIds).toEqual([queuedId, failedId]);
    }
    expect(outboxRows.map((r) => r.id)).toEqual([
      "33333333-3333-4333-8333-333333333333",
      "44444444-4444-4444-8444-444444444444",
    ]);

    expect(auditRows.length).toBe(1);
    expect(auditRows[0].action).toBe("Deleted Outbox Dispatch");
  });

  it("rejects deletion of sent and processing records", async () => {
    const sentId = "33333333-3333-4333-8333-333333333333";
    const procId = "44444444-4444-4444-8444-444444444444";

    const sentRes = await deleteOutboxJobsAction({ jobIds: [sentId] });
    expect(sentRes.success).toBe(false);
    if (!sentRes.success) {
      expect(sentRes.message).toContain('"sent"');
    }

    const procRes = await deleteOutboxJobsAction({ jobIds: [procId] });
    expect(procRes.success).toBe(false);
    if (!procRes.success) {
      expect(procRes.message).toContain('"processing"');
    }

    expect(outboxRows.length).toBe(4);
    expect(auditRows.length).toBe(0);
  });

  it("retries failed record, resets counters, preserves idempotency, and never marks sent on failure", async () => {
    const failedId = "22222222-2222-4222-8222-222222222222";
    const retryRes = await retryFailedDispatchAction(failedId);

    expect(retryRes.success).toBe(true);
    expect(outboxRows[1].status).toBe("queued");
    expect(outboxRows[1].attempts).toBe(0);
    expect(outboxRows[1].last_error).toBeNull();
    expect(auditRows.some((a) => a.action === "Retried Failed Outbox Dispatch")).toBe(true);

    // Simulate provider rejection after retry -> must NOT mark as sent
    const adapter = new TestEmailAdapter();
    adapter.shouldFail = true;
    adapter.failureMessage = "Resend API Error (500): Upstream failure";
    adapter.failureRetryable = true;

    const worker = new EmailOutboxWorker(adapter);
    const run1 = await worker.processSingleJob(failedId);
    expect(run1.failed).toBe(1);
    expect(run1.succeeded).toBe(0);
    expect(outboxRows[1].status).toBe("failed");
    expect(outboxRows[1].delivered_at).toBeNull();

    // Simulate recovery & successful retry preserving stable idempotencyKey
    adapter.shouldFail = false;
    outboxRows[1].scheduled_at = new Date(Date.now() - 1000).toISOString();
    const run2 = await worker.processSingleJob(failedId);
    expect(run2.succeeded).toBe(1);
    expect(outboxRows[1].status).toBe("sent");
    expect(adapter.sentMessages[0].idempotencyKey).toBe(`outbox-${failedId}`);
  });

  it("archives and unarchives sent/failed records preserving timestamps & errors, and excludes archived from worker", async () => {
    const failedId = "22222222-2222-4222-8222-222222222222";
    const sentId = "33333333-3333-4333-8333-333333333333";

    // Make failed row have attempts < 5 to prove worker skips archived rows
    outboxRows[1].attempts = 1;

    const archiveRes = await archiveOutboxJobsAction({
      jobIds: [failedId, sentId],
      archive: true,
    });
    expect(archiveRes.success).toBe(true);
    if (archiveRes.success) {
      expect(archiveRes.data.processedIds).toEqual([failedId, sentId]);
    }
    expect(outboxRows[1].archived_at).toBeTruthy();
    expect(outboxRows[1].last_error).toBe("Resend API Error (403): Forbidden");
    expect(outboxRows[2].archived_at).toBeTruthy();
    expect(outboxRows[2].delivered_at).toBe("2026-11-11T09:00:00.000Z");

    // Worker must not claim archived failed row
    const adapter = new TestEmailAdapter();
    const worker = new EmailOutboxWorker(adapter);
    const singleArchived = await worker.processSingleJob(failedId);
    expect(singleArchived.claimed).toBe(0);

    // Unarchive restores cleanly without losing history
    const unarchiveRes = await archiveOutboxJobsAction({
      jobIds: [sentId],
      archive: false,
    });
    expect(unarchiveRes.success).toBe(true);
    expect(outboxRows[2].archived_at).toBeNull();
    expect(outboxRows[2].status).toBe("sent");
    expect(outboxRows[2].delivered_at).toBe("2026-11-11T09:00:00.000Z");

    expect(auditRows.filter((a) => a.action.includes("Archived") || a.action.includes("Unarchived")).length).toBe(2);
  });

  it("rejects unauthorized and forbidden users from all outbox management actions", async () => {
    // 1. Unauthenticated
    vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValue({
      isAuthenticated: false,
      isAdmin: false,
      user: null,
    });

    const unauthCancel = await cancelOutboxJobsAction({ jobIds: [outboxRows[0].id] });
    const unauthDelete = await deleteOutboxJobsAction({ jobIds: [outboxRows[0].id] });
    const unauthArchive = await archiveOutboxJobsAction({ jobIds: [outboxRows[2].id], archive: true });
    const unauthRetry = await retryFailedDispatchAction(outboxRows[1].id);
    expect(!unauthCancel.success && unauthCancel.error).toBe("UNAUTHORIZED");
    expect(!unauthDelete.success && unauthDelete.error).toBe("UNAUTHORIZED");
    expect(!unauthArchive.success && unauthArchive.error).toBe("UNAUTHORIZED");
    expect(!unauthRetry.success && unauthRetry.error).toBe("UNAUTHORIZED");

    // 2. Analyst / attendance_staff (no communications:send permission)
    for (const role of ["analyst", "attendance_staff"] as const) {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValue({
        isAuthenticated: true,
        isAdmin: true,
        user: { id: "u-2", name: "Staff", email: "staff@sketch.org", role },
      });

      const forbCancel = await cancelOutboxJobsAction({ jobIds: [outboxRows[0].id] });
      const forbDelete = await deleteOutboxJobsAction({ jobIds: [outboxRows[0].id] });
      const forbArchive = await archiveOutboxJobsAction({ jobIds: [outboxRows[2].id], archive: true });
      const forbRetry = await retryFailedDispatchAction(outboxRows[1].id);
      expect(!forbCancel.success && forbCancel.error).toBe("FORBIDDEN");
      expect(!forbDelete.success && forbDelete.error).toBe("FORBIDDEN");
      expect(!forbArchive.success && forbArchive.error).toBe("FORBIDDEN");
      expect(!forbRetry.success && forbRetry.error).toBe("FORBIDDEN");
    }

    expect(auditRows.length).toBe(0);
  });

  it("isolates bulk operations so ineligible records are safely skipped", async () => {
    const allIds = outboxRows.map((r) => r.id);

    // Bulk delete across queued, failed, sent, processing -> deletes ONLY queued & failed
    const delRes = await deleteOutboxJobsAction({ jobIds: allIds });
    expect(delRes.success).toBe(true);
    if (delRes.success) {
      expect(delRes.data.processedIds).toEqual([
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
      ]);
      expect(delRes.data.skipped.map((s) => s.id)).toEqual([
        "33333333-3333-4333-8333-333333333333",
        "44444444-4444-4444-8444-444444444444",
      ]);
    }
    // Sent & processing records remain intact
    expect(outboxRows.length).toBe(2);
  });

  it("prevents concurrent admin cancel or delete if worker claims the queued row first", async () => {
    const queuedId = "11111111-1111-4111-8111-111111111111";

    // Simulate worker claiming the queued row just before admin UPDATE runs
    beforeUpdateHook = () => {
      outboxRows[0].status = "processing";
    };
    const cancelRes = await cancelOutboxJobsAction({ jobIds: [queuedId] });
    expect(cancelRes.success).toBe(false);
    if (!cancelRes.success) {
      expect(cancelRes.message).toContain("claimed by delivery worker");
    }
    expect(outboxRows[0].status).toBe("processing");

    // Reset to queued and simulate worker claiming just before admin DELETE runs
    beforeUpdateHook = null;
    outboxRows[0].status = "queued";
    beforeDeleteHook = () => {
      outboxRows[0].status = "processing";
    };
    const deleteRes = await deleteOutboxJobsAction({ jobIds: [queuedId] });
    expect(deleteRes.success).toBe(false);
    expect(outboxRows.length).toBe(4);
    expect(outboxRows[0].status).toBe("processing");
  });

  it("Priority 1 (SQL Migration): enforces REVOKE, removes broad UPDATE policy, guards DELETE via trigger, and avoids 55P04", () => {
    const sqlPath = path.join(
      process.cwd(),
      "supabase",
      "migrations",
      "00010_communications_outbox_management.sql"
    );
    const sql = fs.readFileSync(sqlPath, "utf8");

    expect(sql).toContain(
      "REVOKE INSERT, UPDATE, DELETE ON public.communications_outbox FROM PUBLIC, anon, authenticated;"
    );
    expect(sql).not.toContain('CREATE POLICY "Admins can update communications"');
    expect(sql).toContain('DROP POLICY IF EXISTS "Admins can update communications"');
    expect(sql).toContain("CREATE TRIGGER trg_prevent_protected_outbox_delete");
    expect(sql).toContain("IF OLD.status NOT IN ('queued', 'failed') THEN");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.delete_outbox_jobs_with_audit(");
    expect(sql).toContain(
      "REVOKE ALL ON FUNCTION public.delete_outbox_jobs_with_audit(UUID[], UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;"
    );
    expect(sql).toContain(
      "GRANT EXECUTE ON FUNCTION public.delete_outbox_jobs_with_audit(UUID[], UUID, TEXT, TEXT) TO service_role;"
    );

    // Verify 'cancelled' enum value is never referenced in subsequent statements in the same migration transaction (avoids Postgres 55P04)
    const afterAddValue = sql.split("ADD VALUE IF NOT EXISTS 'cancelled';")[1] || "";
    expect(afterAddValue).not.toContain("'cancelled'");
  });

  it("Priority 2 (Atomic Audit): captures full snapshot on delete and rolls back cleanly if audit fails", async () => {
    const failedId = "22222222-2222-4222-8222-222222222222";

    // 1. Audit failure inside transaction -> must rollback & surface error (never swallow)
    simulateAuditInsertError = true;
    const rollbackRes = await deleteOutboxJobsAction({ jobIds: [failedId] });
    expect(rollbackRes.success).toBe(false);
    if (!rollbackRes.success) {
      expect(rollbackRes.message).toContain("audit_logs insert failed");
    }
    expect(outboxRows.some((r) => r.id === failedId)).toBe(true);
    expect(auditRows.length).toBe(0);

    // 2. Missing RPC (unapplied 00010) -> must refuse non-atomic deletion without audit trail
    simulateAuditInsertError = false;
    simulateMissingDeleteRpc = true;
    const unappliedRes = await deleteOutboxJobsAction({ jobIds: [failedId] });
    expect(unappliedRes.success).toBe(false);
    if (!unappliedRes.success) {
      expect(unappliedRes.message).toContain("00010_communications_outbox_management.sql");
    }
    expect(outboxRows.some((r) => r.id === failedId)).toBe(true);

    // 3. Successful atomic deletion -> captures complete snapshot in audit_logs.details.deletedRecords
    simulateMissingDeleteRpc = false;
    const okRes = await deleteOutboxJobsAction({ jobIds: [failedId] });
    expect(okRes.success).toBe(true);
    expect(outboxRows.some((r) => r.id === failedId)).toBe(false);
    expect(auditRows.length).toBe(1);
    expect(auditRows[0].details.deletedRecords).toEqual([
      {
        id: failedId,
        eventId: "evt-1",
        recipientEmail: "failed1@sketch.test",
        recipientName: "Failed One",
        subject: "Failed Pass 1",
        templateType: "ticket_pass",
        status: "failed",
        attempts: 5,
        lastError: "Resend API Error (403): Forbidden",
      },
    ]);
  });

  it("Priority 3 (Worker Safety): fallback claim respects archived_at IS NULL and delivery updates guard status = processing", async () => {
    const queuedId = "11111111-1111-4111-8111-111111111111";
    const failedId = "22222222-2222-4222-8222-222222222222";

    // Make only failedId eligible (retried with 1 attempt), remove queuedId
    outboxRows.splice(0, 1);
    outboxRows[0].attempts = 1; // failedId

    // Simulate admin archiving failedId in the narrow race window between fallback SELECT and fallback UPDATE
    beforeFallbackSelectHook = () => {
      outboxRows[0].archived_at = new Date().toISOString();
    };

    const adapter = new TestEmailAdapter();
    const worker = new EmailOutboxWorker(adapter);
    const raceBatchRes = await worker.processBatch(10);
    expect(raceBatchRes.claimed).toBe(0);
    expect(adapter.sentMessages.length).toBe(0);
    expect(outboxRows[0].status).toBe("failed");

    // Verify completion update guards on status = 'processing' (does not overwrite concurrent external cancel/recovery)
    outboxRows.unshift({
      id: queuedId,
      event_id: "evt-1",
      recipient_email: "queued1@sketch.test",
      recipient_name: "Queued One",
      subject: "Queued Pass 1",
      template_type: "ticket_pass",
      payload: {
        registration_id: "REG-001",
        qr_credential_id: "QR-001",
        event_title: "Sketchathon",
        venue: "Hall A",
        start_date: "2026-11-20T10:00:00Z",
      },
      status: "queued",
      attempts: 0,
      last_error: null,
      scheduled_at: new Date(Date.now() - 10000).toISOString(),
      delivered_at: null,
      archived_at: null,
      archived_by: null,
      cancelled_at: null,
      cancelled_by: null,
      created_at: new Date().toISOString(),
    });
    // Reset failedId out of eligibility so only queuedId runs
    outboxRows[1].attempts = 5;

    const concurrentAdapter = new TestEmailAdapter();
    const originalSend = concurrentAdapter.sendEmail.bind(concurrentAdapter);
    concurrentAdapter.sendEmail = async (opts) => {
      // Simulate concurrent external recovery/cancellation while provider send was in-flight
      outboxRows[0].status = "cancelled";
      return originalSend(opts);
    };

    const guardedWorker = new EmailOutboxWorker(concurrentAdapter);
    await guardedWorker.processSingleJob(queuedId);
    // Final UPDATE had .eq("status", "processing"), so cancelled state was NOT overwritten with "sent"
    expect(outboxRows[0].status).toBe("cancelled");
  });

  it("Priority 4 (Bulk Validation): skips invalid UUIDs in DB mode without aborting valid IDs, and preserves preview-mode IDs", async () => {
    const queuedId = "11111111-1111-4111-8111-111111111111";
    const sentId = "33333333-3333-4333-8333-333333333333";

    // 1. Production mode: mixed invalid UUID + valid UUID in cancel, archive, delete
    const cancelMixed = await cancelOutboxJobsAction({ jobIds: ["not-a-uuid", queuedId] });
    expect(cancelMixed.success).toBe(true);
    if (cancelMixed.success) {
      expect(cancelMixed.data.processedIds).toEqual([queuedId]);
      expect(cancelMixed.data.skipped).toEqual([
        { id: "not-a-uuid", reason: "Invalid dispatch ID format (expected UUID)" },
      ]);
    }

    const archiveMixed = await archiveOutboxJobsAction({
      jobIds: ["bad-id-2", sentId],
      archive: true,
    });
    expect(archiveMixed.success).toBe(true);
    if (archiveMixed.success) {
      expect(archiveMixed.data.processedIds).toEqual([sentId]);
      expect(archiveMixed.data.skipped[0]?.id).toBe("bad-id-2");
    }

    // All invalid IDs -> fails cleanly without DB query
    const deleteAllInvalid = await deleteOutboxJobsAction({ jobIds: ["invalid-only"] });
    expect(deleteAllInvalid.success).toBe(false);
    if (!deleteAllInvalid.success) {
      expect(deleteAllInvalid.details?.skipped?.[0]).toContain("Invalid dispatch ID format");
    }

    // 2. Preview mode: non-UUID IDs like "comm-preview-1" continue to work cleanly
    process.env.APP_MODE = "preview";
    process.env.NEXT_PUBLIC_APP_MODE = "preview";
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    resetAppEnvCache();
    resetServerEnvCache();

    saveCommunication({
      id: "comm-preview-1",
      eventId: "evt-preview",
      eventTitle: "Preview Event",
      subject: "Preview Pass",
      type: "confirmation",
      recipientCount: 1,
      recipientEmail: "preview@sketch.test",
      recipientName: "Preview User",
      status: "queued",
      attempts: 0,
      scheduledAt: new Date().toISOString(),
    });

    const previewDel = await deleteOutboxJobsAction({ jobIds: ["comm-preview-1"] });
    expect(previewDel.success).toBe(true);
    if (previewDel.success) {
      expect(previewDel.data.processedIds).toEqual(["comm-preview-1"]);
    }
    expect(getStoredCommunications().some((c) => c.id === "comm-preview-1")).toBe(false);
    const previewAudit = getStoredAuditLogs().find((a) => a.action === "Deleted Outbox Dispatch");
    expect(previewAudit?.details).toContain("comm-preview-1");
  });
});
