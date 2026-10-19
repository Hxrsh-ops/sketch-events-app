import { createAdminClient } from "@/lib/supabase/server";
import { getServerEnv } from "@/lib/env.server";
import { EmailDeliveryJob, EmailProviderAdapter } from "./types";
import { ResendEmailAdapter, BrevoEmailAdapter, TestEmailAdapter, MailpitEmailAdapter } from "./adapters";
import { renderTicketPassEmail, renderCertificateEmail, renderAnnouncementEmail } from "./templates";

export interface ProcessBatchResult {
  claimed: number;
  processed: number;
  succeeded: number;
  failed: number;
  terminalFailures: number;
}

export class EmailOutboxWorker {
  private adapter: EmailProviderAdapter;
  private maxAttempts: number = 5;
  private baseBackoffMinutes: number = 2;

  constructor(customAdapter?: EmailProviderAdapter) {
    if (customAdapter) {
      this.adapter = customAdapter;
    } else {
      const serverEnv = getServerEnv();
      if (serverEnv.emailProvider === "brevo") {
        this.adapter = new BrevoEmailAdapter(process.env.BREVO_API_KEY || "", serverEnv.emailFrom);
      } else if (serverEnv.emailProvider === "test") {
        this.adapter = new TestEmailAdapter();
      } else if (serverEnv.emailProvider === "mailpit" || serverEnv.emailProvider === "local") {
        this.adapter = new MailpitEmailAdapter(serverEnv.emailFrom, process.env.MAILPIT_URL);
      } else {
        this.adapter = new ResendEmailAdapter(serverEnv.resendApiKey || "", serverEnv.emailFrom);
      }
    }
  }

  /**
   * Recovers jobs that were marked 'processing' but abandoned due to worker crash/timeout.
   * Resets jobs stuck in 'processing' for longer than timeoutMinutes back to 'queued'.
   */
  async recoverStuckJobs(timeoutMinutes: number = 10): Promise<number> {
    const supabase = createAdminClient();
    if (!supabase) return 0;

    const thresholdIso = new Date(Date.now() - timeoutMinutes * 60 * 1000).toISOString();

    const { data, error } = await (supabase as any)
      .from("communications_outbox")
      .update({
        status: "queued",
        last_error: "RECOVERED: Previous delivery worker timed out or crashed during processing.",
      })
      .eq("status", "processing")
      .lte("scheduled_at", thresholdIso)
      .select("id");

    if (error) {
      console.error("[EmailOutboxWorker] Failed to recover stuck jobs:", error.message);
      return 0;
    }

    return (data || []).length;
  }

  /**
   * Processes a single batch of scheduled outbox jobs.
   * Atomically claims rows by transitioning 'queued'/'failed' -> 'processing'.
   */
  async processBatch(batchSize: number = 10): Promise<ProcessBatchResult> {
    const supabase = createAdminClient();
    const result: ProcessBatchResult = {
      claimed: 0,
      processed: 0,
      succeeded: 0,
      failed: 0,
      terminalFailures: 0,
    };

    if (!supabase) {
      return result;
    }

    const nowIso = new Date().toISOString();
    let claimedJobs: any[] = [];

    // Attempt atomic claiming via database RPC (with FOR UPDATE SKIP LOCKED)
    const { data: rpcData, error: rpcErr } = await (supabase as any).rpc("claim_outbox_batch", {
      p_batch_size: batchSize,
      p_max_attempts: this.maxAttempts,
    });

    if (!rpcErr && Array.isArray(rpcData)) {
      claimedJobs = rpcData;
    } else {
      // Fallback for preview or environments where migration 00003 is not yet applied
      const { data: eligibleJobs, error: selectErr } = await (supabase as any)
        .from("communications_outbox")
        .select("*")
        .in("status", ["queued", "failed"])
        .lt("attempts", this.maxAttempts)
        .lte("scheduled_at", nowIso)
        .order("scheduled_at", { ascending: true })
        .limit(batchSize);

      if (selectErr || !eligibleJobs || eligibleJobs.length === 0) {
        return result;
      }

      const jobIds = eligibleJobs.map((j: any) => j.id);

      const { data: updatedJobs, error: claimErr } = await (supabase as any)
        .from("communications_outbox")
        .update({
          status: "processing",
          scheduled_at: nowIso,
        })
        .in("id", jobIds)
        .in("status", ["queued", "failed"])
        .select("*");

      if (claimErr || !updatedJobs || updatedJobs.length === 0) {
        return result;
      }

      claimedJobs = updatedJobs;
    }

    result.claimed = claimedJobs.length;

    // 3. Process each claimed job independently
    for (const rawJob of claimedJobs) {
      result.processed++;
      const job: EmailDeliveryJob = {
        id: rawJob.id,
        eventId: rawJob.event_id,
        recipientEmail: rawJob.recipient_email,
        recipientName: rawJob.recipient_name,
        subject: rawJob.subject,
        templateType: rawJob.template_type,
        payload: rawJob.payload,
        status: rawJob.status,
        attempts: rawJob.attempts,
        lastError: rawJob.last_error,
        scheduledAt: rawJob.scheduled_at,
        deliveredAt: rawJob.delivered_at,
        createdAt: rawJob.created_at,
      };

      try {
        let rendered: { html: string; text: string };

        if (job.templateType === "ticket_pass") {
          rendered = renderTicketPassEmail(job.payload, job.recipientName);
        } else if (job.templateType === "certificate") {
          rendered = renderCertificateEmail(job.payload, job.recipientName, job.subject);
        } else if (job.templateType === "announcement" || job.templateType === "reminder") {
          rendered = renderAnnouncementEmail(job.payload, job.recipientName, job.subject);
        } else {
          throw new Error(`Unsupported email template type: "${job.templateType}"`);
        }

        const sendRes = await this.adapter.sendEmail({
          to: job.recipientEmail,
          toName: job.recipientName,
          subject: job.subject,
          html: rendered.html,
          text: rendered.text,
          idempotencyKey: `outbox-${job.id}-${job.attempts + 1}`,
        });

        if (sendRes.success) {
          result.succeeded++;
          await (supabase as any)
            .from("communications_outbox")
            .update({
              status: "sent",
              attempts: job.attempts + 1,
              delivered_at: new Date().toISOString(),
              last_error: null,
            })
            .eq("id", job.id);
        } else {
          result.failed++;
          const nextAttempts = job.attempts + 1;
          const isTerminal = nextAttempts >= this.maxAttempts || sendRes.retryable === false;

          if (isTerminal) {
            result.terminalFailures++;
          }

          // Compute exponential backoff: scheduled_at = now + (2^attempts * baseBackoff)
          const backoffMinutes = isTerminal
            ? 0
            : Math.pow(2, nextAttempts - 1) * this.baseBackoffMinutes;
          const nextSchedule = new Date(Date.now() + backoffMinutes * 60 * 1000).toISOString();

          await (supabase as any)
            .from("communications_outbox")
            .update({
              status: isTerminal ? "failed" : "failed",
              attempts: nextAttempts,
              last_error: sendRes.error || "Delivery failed",
              scheduled_at: isTerminal ? job.scheduledAt : nextSchedule,
            })
            .eq("id", job.id);
        }
      } catch (renderOrInternalErr: any) {
        result.failed++;
        result.terminalFailures++;
        const errorMessage =
          renderOrInternalErr instanceof Error ? renderOrInternalErr.message : "Unknown worker error";

        await (supabase as any)
          .from("communications_outbox")
          .update({
            status: "failed",
            attempts: job.attempts + 1,
            last_error: `TEMPLATE_OR_WORKER_ERROR: ${errorMessage}`,
          })
          .eq("id", job.id);
      }
    }

    return result;
  }
}
