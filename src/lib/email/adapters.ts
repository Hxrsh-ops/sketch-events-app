import { EmailProviderAdapter, SendEmailOptions, SendEmailResult } from "./types";

/**
 * Resend Email Adapter
 * Dispatches transactional email via the Resend REST API v1.
 */
export class ResendEmailAdapter implements EmailProviderAdapter {
  name = "resend";
  private apiKey: string;
  private fromAddress: string;

  constructor(apiKey: string, fromAddress: string) {
    this.apiKey = apiKey;
    this.fromAddress = fromAddress;
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    if (
      !this.apiKey ||
      this.apiKey === "your-resend-api-key-here" ||
      this.apiKey.includes("your_resend_api_key")
    ) {
      return {
        success: false,
        error: "RESEND_API_KEY_UNCONFIGURED: Cannot dispatch live email without valid Resend credentials.",
        retryable: false,
      };
    }

    if (!this.fromAddress || !this.fromAddress.includes("@")) {
      return {
        success: false,
        error: "EMAIL_FROM_UNCONFIGURED: Cannot dispatch live email without a valid sender address.",
        retryable: false,
      };
    }

    try {
      const sanitizedToName = options.toName
        ? options.toName.replace(/[\r\n<>"]/g, "").trim()
        : "";
      const toField = sanitizedToName ? `${sanitizedToName} <${options.to}>` : options.to;

      const payload: Record<string, unknown> = {
        from: this.fromAddress,
        to: toField,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      if (options.attachments && options.attachments.length > 0) {
        payload.attachments = options.attachments.map((att) => ({
          filename: att.filename || att.name || "attachment",
          content: att.content,
        }));
      }

      if (options.replyTo) {
        payload.reply_to = options.replyTo;
      }

      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      };

      if (options.idempotencyKey) {
        headers["Idempotency-Key"] = options.idempotencyKey;
      }

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const statusCode = res.status;
        const errorMessage = (data as any)?.message || `HTTP ${statusCode}`;
        // 429 (rate limit) or 5xx server errors are retryable
        const retryable = statusCode === 429 || statusCode >= 500;

        return {
          success: false,
          error: `Resend API Error (${statusCode}): ${errorMessage}`,
          retryable,
        };
      }

      return {
        success: true,
        messageId: (data as any)?.id,
      };
    } catch (err: any) {
      const isTimeout = err?.name === "TimeoutError" || err?.name === "AbortError";
      return {
        success: false,
        error: isTimeout
          ? "Resend Transport Timeout: Connection timed out after 10000ms"
          : `Network/Transport failure: ${err instanceof Error ? err.message : "Unknown error"}`,
        retryable: true,
      };
    }
  }
}

/**
 * Brevo (Sendinblue) Email Adapter
 * Configurable alternative provider via Brevo REST API v3.
 */
export class BrevoEmailAdapter implements EmailProviderAdapter {
  name = "brevo";
  private apiKey: string;
  private fromAddress: string;

  constructor(apiKey: string, fromAddress: string) {
    this.apiKey = apiKey;
    this.fromAddress = fromAddress;
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    if (
      !this.apiKey ||
      this.apiKey === "your-brevo-api-key-here" ||
      this.apiKey.includes("your_brevo_api_key")
    ) {
      return {
        success: false,
        error: "BREVO_API_KEY_UNCONFIGURED: Cannot dispatch live email without valid Brevo credentials.",
        retryable: false,
      };
    }

    if (!this.fromAddress || !this.fromAddress.includes("@")) {
      return {
        success: false,
        error: "EMAIL_FROM_UNCONFIGURED: Cannot dispatch live email without a valid sender address.",
        retryable: false,
      };
    }

    try {
      const fromParts = this.fromAddress.match(/^(?:(.*?)<)?([^<>]+)>?$/);
      const senderName = fromParts?.[1]?.trim() || "SKETCH Events";
      const senderEmail = fromParts?.[2]?.trim() || this.fromAddress;

      let htmlContent = options.html;
      const attachments: Array<{ name: string; content: string }> = [];

      // Include explicit file attachments
      if (options.attachments && options.attachments.length > 0) {
        for (const att of options.attachments) {
          attachments.push({
            name: att.filename || att.name || "attachment",
            content: att.content,
          });
        }
      }

      // Gmail strips inline `data:image/...;base64,...` URLs. Convert embedded QR data URLs
      // into a CID inline attachment so Gmail renders the QR code cleanly and also attaches it.
      const dataUrlMatch = htmlContent.match(
        /src="(data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+))"/i
      );
      if (dataUrlMatch) {
        const ext = dataUrlMatch[2].toLowerCase() === "jpeg" ? "jpg" : dataUrlMatch[2].toLowerCase();
        const fileName = `entry-qr.${ext}`;
        attachments.push({
          name: fileName,
          content: dataUrlMatch[3],
        });
        htmlContent = htmlContent.replace(dataUrlMatch[1], `cid:${fileName}`);
      }

      const payload: Record<string, unknown> = {
        sender: { name: senderName, email: senderEmail },
        to: [{ email: options.to, name: options.toName || options.to }],
        subject: options.subject,
        htmlContent,
        textContent: options.text,
      };

      if (attachments.length > 0) {
        payload.attachment = attachments;
      }

      if (options.replyTo) {
        payload.replyTo = { email: options.replyTo };
      }

      if (options.idempotencyKey) {
        payload.headers = {
          "X-Idempotency-Key": options.idempotencyKey,
          "X-Mailin-Custom": options.idempotencyKey,
        };
        payload.tags = [options.idempotencyKey];
      }

      const reqHeaders: Record<string, string> = {
        "api-key": this.apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      if (options.idempotencyKey) {
        reqHeaders["X-Idempotency-Key"] = options.idempotencyKey;
      }

      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: reqHeaders,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const statusCode = res.status;
        const errorMessage = (data as any)?.message || `HTTP ${statusCode}`;
        // 429 (rate limit) and 5xx (server error) are retryable; 400 (unverified sender), 401 (bad key), 402 (quota exceeded) are terminal
        const retryable = statusCode === 429 || statusCode >= 500;

        return {
          success: false,
          error: `Brevo API Error (${statusCode}): ${errorMessage}`,
          retryable,
        };
      }

      return {
        success: true,
        messageId: (data as any)?.messageId,
      };
    } catch (err: any) {
      const isTimeout = err?.name === "TimeoutError" || err?.name === "AbortError";
      return {
        success: false,
        error: isTimeout
          ? "Brevo Transport Timeout: Connection timed out after 10000ms"
          : `Transport failure: ${err instanceof Error ? err.message : "Unknown error"}`,
        retryable: true,
      };
    }
  }
}

/**
 * Isolated Test / Mock Adapter
 * Records all outgoing emails in-memory for testing and local verification without external network calls.
 */
export class TestEmailAdapter implements EmailProviderAdapter {
  name = "test";
  public sentMessages: Array<SendEmailOptions & { messageId: string; timestamp: string }> = [];
  public shouldFail: boolean = false;
  public failureMessage: string = "Simulated delivery failure";
  public failureRetryable: boolean = true;

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    if (this.shouldFail) {
      return {
        success: false,
        error: this.failureMessage,
        retryable: this.failureRetryable,
      };
    }

    const messageId = `test-msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this.sentMessages.push({
      ...options,
      messageId,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      messageId,
    };
  }

  clear(): void {
    this.sentMessages = [];
    this.shouldFail = false;
  }
}

/**
 * Mailpit (Local Development) Email Adapter
 * Dispatches emails to the local Supabase/Mailpit service running on port 54324.
 * Enables live in-browser inspection of outgoing ticket passes without sending external emails.
 */
export class MailpitEmailAdapter implements EmailProviderAdapter {
  name = "mailpit";
  private baseUrl: string;
  private fromAddress: string;

  constructor(fromAddress: string = "Sketch Events <noreply@sketch.events>", baseUrl?: string) {
    this.fromAddress = fromAddress;
    this.baseUrl = baseUrl || process.env.MAILPIT_URL || "http://127.0.0.1:54324";
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    try {
      let fromName = "Sketch Events";
      let fromEmail = "noreply@sketch.events";
      const fromMatch = this.fromAddress.match(/^(.*?)\s*<(.+?)>$/);
      if (fromMatch) {
        fromName = fromMatch[1].trim();
        fromEmail = fromMatch[2].trim();
      } else if (this.fromAddress.includes("@")) {
        fromEmail = this.fromAddress.trim();
        fromName = fromEmail;
      }

      const payload: Record<string, unknown> = {
        From: {
          Email: fromEmail,
          Name: fromName,
        },
        To: [
          {
            Email: options.to,
            Name: options.toName || options.to,
          },
        ],
        Subject: options.subject,
        HTML: options.html,
        Text: options.text || "",
      };

      if (options.attachments && options.attachments.length > 0) {
        payload.Attachments = options.attachments.map((att) => ({
          Filename: att.filename || att.name || "attachment",
          Data: att.content,
        }));
      }

      const res = await fetch(`${this.baseUrl.replace(/\/+$/, "")}/api/v1/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return {
          success: false,
          error: `Mailpit HTTP ${res.status}: ${text || "Failed to deliver to Mailpit"}`,
          retryable: true,
        };
      }

      const data = await res.json().catch(() => ({}));

      return {
        success: true,
        messageId: (data as any)?.ID || `mailpit-${Date.now()}`,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Mailpit transport failure: ${err instanceof Error ? err.message : "Connection error"}`,
        retryable: true,
      };
    }
  }
}
