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
    if (!this.apiKey || this.apiKey === "your-resend-api-key-here") {
      return {
        success: false,
        error: "RESEND_API_KEY_UNCONFIGURED: Cannot dispatch live email without valid Resend credentials.",
        retryable: false,
      };
    }

    try {
      const payload: Record<string, unknown> = {
        from: this.fromAddress,
        to: options.toName ? `${options.toName} <${options.to}>` : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

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
      return {
        success: false,
        error: `Network/Transport failure: ${err instanceof Error ? err.message : "Unknown error"}`,
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
    if (!this.apiKey) {
      return {
        success: false,
        error: "BREVO_API_KEY_UNCONFIGURED: Cannot dispatch live email without valid Brevo credentials.",
        retryable: false,
      };
    }

    try {
      const fromParts = this.fromAddress.match(/^(?:(.*?)<)?([^<>]+)>?$/);
      const senderName = fromParts?.[1]?.trim() || "SKETCH Events";
      const senderEmail = fromParts?.[2]?.trim() || this.fromAddress;

      const payload = {
        sender: { name: senderName, email: senderEmail },
        to: [{ email: options.to, name: options.toName || options.to }],
        subject: options.subject,
        htmlContent: options.html,
        textContent: options.text,
      };

      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": this.apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const statusCode = res.status;
        const errorMessage = (data as any)?.message || `HTTP ${statusCode}`;
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
      return {
        success: false,
        error: `Transport failure: ${err instanceof Error ? err.message : "Unknown error"}`,
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
