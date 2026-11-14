import { createAdminClient } from "@/lib/supabase/server";
import { getServerEnv } from "@/lib/env.server";
import { EmailDeliveryJob, EmailProviderAdapter, EmailAttachment } from "./types";
import { ResendEmailAdapter, BrevoEmailAdapter, TestEmailAdapter, MailpitEmailAdapter } from "./adapters";
import { renderTicketPassEmail, renderCertificateEmail, renderAnnouncementEmail } from "./templates";
import { getStoredCommunications, updateStoredCommunication } from "@/lib/registration-store";
import { generateUnifiedTicketSvg, DEFAULT_UNIFIED_TICKET_DESIGN } from "@/lib/ticket/ticket-renderer";
import { TicketDesignData } from "@/lib/validations/ticket-schemas";

export interface ProcessBatchResult {
  claimed: number;
  processed: number;
  succeeded: number;
  failed: number;
  terminalFailures: number;
}

export interface ProcessSingleJobOptions {
  expectedRecipientEmail?: string;
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
      const provider = (serverEnv.emailProvider || "resend").toLowerCase().trim();
      if (serverEnv.mode === "production" && provider === "test") {
        throw new Error(
          "[EmailOutboxWorker] EMAIL_PROVIDER='test' is disallowed in production mode. Configure 'resend', 'brevo', or 'mailpit'."
        );
      }
      if (provider === "brevo") {
        this.adapter = new BrevoEmailAdapter(serverEnv.brevoApiKey || "", serverEnv.emailFrom);
      } else if (provider === "test") {
        this.adapter = new TestEmailAdapter();
      } else if (provider === "mailpit" || provider === "local") {
        this.adapter = new MailpitEmailAdapter(serverEnv.emailFrom, serverEnv.mailpitUrl);
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
    if (!supabase) {
      const serverEnv = getServerEnv();
      if (serverEnv.mode === "production") {
        throw new Error(
          "[EmailOutboxWorker] SUPABASE_SERVICE_ROLE_KEY is required for outbox recovery in production mode."
        );
      }
      return 0;
    }

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
   * Renders, dispatches, and records the outcome for a single already-claimed outbox row.
   */
  private async deliverClaimedJob(
    supabase: any,
    rawJob: any,
    result: ProcessBatchResult
  ): Promise<void> {
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
      let attachments: EmailAttachment[] | undefined;

      if (job.templateType === "ticket_pass") {
        // Retrieve custom ticket template design if assigned to this event
        let design: TicketDesignData = DEFAULT_UNIFIED_TICKET_DESIGN;
        if ((job.payload as any)?.template_design) {
          design = (job.payload as any).template_design;
        } else if (job.eventId && supabase) {
          try {
            const { data: eventRow } = await (supabase as any)
              .from("events")
              .select("ticket_template_version_id, ticket_template_versions:ticket_template_version_id(design_data)")
              .eq("id", job.eventId)
              .maybeSingle();

            if (eventRow?.ticket_template_versions?.design_data) {
              design = eventRow.ticket_template_versions.design_data as TicketDesignData;
            }
          } catch {
            // Graceful fallback to default design
          }
        }

        rendered = renderTicketPassEmail(job.payload, job.recipientName, design);

        // Generate matching vector ticket pass SVG attachment using canonical ticket renderer
        try {
          const ticketNum =
            (job.payload as any)?.ticket_number || (job.payload as any)?.registration_id || "ticket";
          const qrPayload =
            (job.payload as any)?.qr_credential_id ||
            (job.payload as any)?.live_ticket_url ||
            ticketNum;

          const ticketSvg = await generateUnifiedTicketSvg({
            design,
            event: {
              title: (job.payload as any)?.event_title || job.subject,
              venue: (job.payload as any)?.venue || "Campus Venue",
              startDate: (job.payload as any)?.start_date,
              organizerName: "SKETCH",
            },
            attendee: {
              name: job.recipientName,
              ticketNumber: ticketNum,
              teamName: (job.payload as any)?.team_name || null,
            },
            qrPayload,
          });

          const attachmentName = `${ticketNum}_pass.svg`;
          attachments = [
            {
              filename: attachmentName,
              name: attachmentName,
              content: Buffer.from(ticketSvg, "utf-8").toString("base64"),
              contentType: "image/svg+xml",
            },
          ];
        } catch (svgErr) {
          console.error("[EmailOutboxWorker] Could not generate ticket pass attachment:", svgErr);
        }
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
        attachments,
        idempotencyKey: `outbox-${job.id}`,
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
          .eq("id", job.id)
          .eq("status", "processing");
      } else {
        result.failed++;
        const nextAttempts = job.attempts + 1;
        const isTerminal = nextAttempts >= this.maxAttempts || sendRes.retryable === false;

        if (isTerminal) {
          result.terminalFailures++;
        }

        // Compute exponential backoff: scheduled_at = now + (2^(attempts-1) * baseBackoff)
        const backoffMinutes = isTerminal
          ? 0
          : Math.pow(2, nextAttempts - 1) * this.baseBackoffMinutes;
        const nextSchedule = new Date(Date.now() + backoffMinutes * 60 * 1000).toISOString();

        await (supabase as any)
          .from("communications_outbox")
          .update({
            status: "failed",
            // Exhaust attempts on terminal non-retryable failures so claim_outbox_batch does not re-claim them
            attempts: isTerminal ? this.maxAttempts : nextAttempts,
            last_error: sendRes.error || "Delivery failed",
            scheduled_at: isTerminal ? job.scheduledAt : nextSchedule,
          })
          .eq("id", job.id)
          .eq("status", "processing");
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
          attempts: this.maxAttempts,
          last_error: `TEMPLATE_OR_WORKER_ERROR: ${errorMessage}`,
        })
        .eq("id", job.id)
        .eq("status", "processing");
    }
  }

  /**
   * Atomically claims and processes ONLY a single specific outbox job by ID.
   * Optionally enforces an expected recipient email so unrelated records can never be claimed.
   */
  async processSingleJob(
    jobId: string,
    options?: ProcessSingleJobOptions
  ): Promise<ProcessBatchResult> {
    const cleanJobId = typeof jobId === "string" ? jobId.trim() : "";
    if (!cleanJobId) {
      throw new Error("[EmailOutboxWorker] A valid jobId is required for single-job processing.");
    }

    const supabase = createAdminClient();
    const result: ProcessBatchResult = {
      claimed: 0,
      processed: 0,
      succeeded: 0,
      failed: 0,
      terminalFailures: 0,
    };

    if (!supabase) {
      const serverEnv = getServerEnv();
      if (serverEnv.mode === "production") {
        throw new Error(
          "[EmailOutboxWorker] SUPABASE_SERVICE_ROLE_KEY is required for outbox processing in production mode."
        );
      }
      return result;
    }

    const nowIso = new Date().toISOString();
    const buildClaimQuery = (filterArchived: boolean) => {
      let q = (supabase as any)
        .from("communications_outbox")
        .update({
          status: "processing",
          scheduled_at: nowIso,
        })
        .eq("id", cleanJobId)
        .in("status", ["queued", "failed"])
        .lt("attempts", this.maxAttempts)
        .lte("scheduled_at", nowIso);

      if (filterArchived) {
        q = q.is("archived_at", null);
      }

      if (options?.expectedRecipientEmail) {
        const normalizedRecipient = options.expectedRecipientEmail.trim().toLowerCase();
        if (!normalizedRecipient) {
          throw new Error("[EmailOutboxWorker] expectedRecipientEmail cannot be blank.");
        }
        q = q.ilike("recipient_email", normalizedRecipient);
      }

      return q.select("*");
    };

    let { data: claimedRows, error: claimErr } = await buildClaimQuery(true);
    if (claimErr && (claimErr.code === "42703" || String(claimErr.message || "").includes("archived_at"))) {
      const fallback = await buildClaimQuery(false);
      claimedRows = fallback.data;
      claimErr = fallback.error;
    }

    if (claimErr) {
      console.error("[EmailOutboxWorker] Single-job claim failed:", claimErr.message);
      return result;
    }

    if (!Array.isArray(claimedRows) || claimedRows.length === 0) {
      return result;
    }

    result.claimed = 1;
    await this.deliverClaimedJob(supabase, claimedRows[0], result);
    return result;
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
      const serverEnv = getServerEnv();
      if (serverEnv.mode === "production") {
        throw new Error(
          "[EmailOutboxWorker] SUPABASE_SERVICE_ROLE_KEY is required for outbox processing in production mode."
        );
      }

      // In preview mode without Supabase connection, process queued communications from preview store
      const allJobs = getStoredCommunications();
      const eligible = allJobs
        .filter((j) => (j.status === "queued" || j.status === "failed") && !j.archivedAt)
        .slice(0, batchSize);

      if (eligible.length === 0) {
        return result;
      }

      result.claimed = eligible.length;

      for (const rawJob of eligible) {
        result.processed++;
        updateStoredCommunication({ ...rawJob, status: "processing" });

        try {
          const rendered = renderAnnouncementEmail(
            { bodyContent: `Digital notification dispatched for ${rawJob.subject}` },
            "Participant",
            rawJob.subject
          );

          const sendRes = await this.adapter.sendEmail({
            to: "attendee@sketch.events",
            toName: "Participant",
            subject: rawJob.subject,
            html: rendered.html,
            text: rendered.text,
            idempotencyKey: `preview-outbox-${rawJob.id}`,
          });

          if (sendRes.success) {
            result.succeeded++;
            updateStoredCommunication({
              ...rawJob,
              status: "sent",
              deliveredAt: new Date().toISOString(),
            });
          } else {
            result.failed++;
            updateStoredCommunication({
              ...rawJob,
              status: "failed",
            });
          }
        } catch {
          result.failed++;
          result.terminalFailures++;
          updateStoredCommunication({
            ...rawJob,
            status: "failed",
          });
        }
      }

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
      if (rpcErr) {
        console.warn("[EmailOutboxWorker] claim_outbox_batch RPC failed, using guarded fallback:", rpcErr.message);
      }
      // Fallback for environments where migration 00003 is not yet applied
      let usedArchivedFilter = true;
      const buildFallbackSelect = (filterArchived: boolean) => {
        let q = (supabase as any)
          .from("communications_outbox")
          .select("*")
          .in("status", ["queued", "failed"])
          .lt("attempts", this.maxAttempts)
          .lte("scheduled_at", nowIso);
        if (filterArchived) {
          q = q.is("archived_at", null);
        }
        return q.order("scheduled_at", { ascending: true }).limit(batchSize);
      };

      let { data: eligibleJobs, error: selectErr } = await buildFallbackSelect(true);
      if (selectErr && (selectErr.code === "42703" || String(selectErr.message || "").includes("archived_at"))) {
        usedArchivedFilter = false;
        const fb = await buildFallbackSelect(false);
        eligibleJobs = fb.data;
        selectErr = fb.error;
      }

      if (selectErr || !eligibleJobs || eligibleJobs.length === 0) {
        return result;
      }

      const jobIds = eligibleJobs.map((j: any) => j.id);

      let claimUpdate = (supabase as any)
        .from("communications_outbox")
        .update({
          status: "processing",
          scheduled_at: nowIso,
        })
        .in("id", jobIds)
        .in("status", ["queued", "failed"])
        .lt("attempts", this.maxAttempts);

      if (usedArchivedFilter) {
        claimUpdate = claimUpdate.is("archived_at", null);
      }

      const { data: updatedJobs, error: claimErr } = await claimUpdate.select("*");

      if (claimErr || !updatedJobs || updatedJobs.length === 0) {
        return result;
      }

      claimedJobs = updatedJobs;
    }

    result.claimed = claimedJobs.length;

    // 3. Process each claimed job independently
    for (const rawJob of claimedJobs) {
      await this.deliverClaimedJob(supabase, rawJob, result);
    }

    return result;
  }
}
