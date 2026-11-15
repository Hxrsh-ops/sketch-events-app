import { getServerEnv } from "@/lib/env.server";
import { BrevoEmailAdapter, ResendEmailAdapter, TestEmailAdapter, MailpitEmailAdapter } from "@/lib/email/adapters";
import { EmailProviderAdapter } from "@/lib/email/types";

export type AdminAlertCategory =
  | "EMAIL_PROVIDER_LIMIT"
  | "EMAIL_DISPATCH_FAILURE"
  | "EVENT_CAPACITY_FULL"
  | "REGISTRATION_DEADLINE_EXPIRED"
  | "REGISTRATION_SYSTEM_ERROR"
  | "DATABASE_ANOMALY";

export interface AdminAlertPayload {
  category: AdminAlertCategory;
  title: string;
  details: string;
  metadata?: Record<string, unknown>;
  severity?: "critical" | "warning" | "info";
  dedupKey?: string;
  cooldownMinutes?: number;
}

export const ADMIN_ALERT_RECIPIENTS = [
  "kmharshanth6@gmail.com",
  "d.mirudull@gmail.com",
];

// In-memory cooldown ledger to prevent alert floods
const cooldownLedger = new Map<string, number>();

/**
 * Resets the in-memory cooldown ledger (useful for testing)
 */
export function resetAdminAlertCooldowns(): void {
  cooldownLedger.clear();
}

/**
 * Creates an authoritative email adapter instance based on server environment.
 */
function getActiveEmailAdapter(): EmailProviderAdapter {
  const serverEnv = getServerEnv();
  const provider = (serverEnv.emailProvider || "brevo").toLowerCase().trim();

  if (provider === "brevo") {
    return new BrevoEmailAdapter(serverEnv.brevoApiKey || "", serverEnv.emailFrom);
  }
  if (provider === "test") {
    return new TestEmailAdapter();
  }
  if (provider === "mailpit" || provider === "local") {
    return new MailpitEmailAdapter(serverEnv.emailFrom, serverEnv.mailpitUrl);
  }
  return new ResendEmailAdapter(serverEnv.resendApiKey || "", serverEnv.emailFrom);
}

/**
 * Formats a clean, high-priority alert HTML template for administrator inboxes.
 */
function renderAdminAlertHtml(payload: AdminAlertPayload, recipient: string): string {
  const timestamp = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Kolkata",
    dateStyle: "full",
    timeStyle: "medium",
  });

  const severityColor =
    payload.severity === "critical"
      ? "#EF4444"
      : payload.severity === "warning"
      ? "#F59E0B"
      : "#3B82F6";

  const severityLabel = (payload.severity || "warning").toUpperCase();

  const metadataHtml = payload.metadata
    ? Object.entries(payload.metadata)
        .map(
          ([k, v]) =>
            `<tr>
              <td style="padding:6px 12px;font-family:monospace;font-size:11px;color:#9CA3AF;border-bottom:1px solid #23272C;">${k}</td>
              <td style="padding:6px 12px;font-family:monospace;font-size:11px;color:#F3F4F6;border-bottom:1px solid #23272C;">${typeof v === "object" ? JSON.stringify(v) : String(v)}</td>
            </tr>`
        )
        .join("")
    : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${payload.title}</title>
</head>
<body style="margin:0;padding:24px;background:#0A0B0D;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#F3F4F6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#14171A;border-radius:16px;border:1px solid #2C3136;overflow:hidden;">
    <tr>
      <td style="padding:24px;border-bottom:1px solid #23272C;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <span style="display:inline-block;padding:4px 10px;background:#1E2228;color:${severityColor};border:1px solid ${severityColor}40;border-radius:9999px;font-size:10px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;">
                ${severityLabel} ALERT
              </span>
              <span style="font-size:11px;color:#9CA3AF;margin-left:8px;font-family:monospace;">
                ${payload.category}
              </span>
            </td>
            <td align="right" style="font-size:11px;color:#6B7280;font-family:monospace;">
              SKETCH OPS
            </td>
          </tr>
        </table>
        <h1 style="margin:16px 0 0 0;font-size:20px;font-weight:800;color:#FFFFFF;line-height:1.3;">
          ${payload.title}
        </h1>
      </td>
    </tr>
    <tr>
      <td style="padding:24px;">
        <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#D1D5DB;">
          ${payload.details}
        </p>

        ${
          metadataHtml
            ? `<div style="margin:20px 0;border:1px solid #23272C;border-radius:10px;overflow:hidden;background:#0E1012;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr style="background:#17191C;">
                    <th align="left" style="padding:8px 12px;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#6B7280;">Parameter</th>
                    <th align="left" style="padding:8px 12px;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#6B7280;">Value</th>
                  </tr>
                  ${metadataHtml}
                </table>
              </div>`
            : ""
        }

        <div style="margin-top:24px;padding:16px;background:#17191C;border-radius:12px;border:1px solid #23272C;">
          <p style="margin:0 0 8px 0;font-size:11px;color:#9CA3AF;">
            <strong>Incident Logged:</strong> ${timestamp} (IST)
          </p>
          <p style="margin:0;font-size:11px;color:#6B7280;">
            This incident notification was dispatched to verified administrators: <code>${recipient}</code>.
          </p>
        </div>

        <div style="margin-top:24px;text-align:center;">
          <a href="https://sketchhub-liard.vercel.app/ops/gateway" style="display:inline-block;padding:12px 28px;background:#E2B857;color:#0A0B0D;font-size:12px;font-weight:800;letter-spacing:0.04em;text-decoration:none;border-radius:8px;">
            Open Operations Gateway &rarr;
          </a>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 24px;background:#0E1012;border-top:1px solid #23272C;text-align:center;font-size:10px;color:#6B7280;">
        SKETCH Campus Operations Platform &bull; Authoritative Incident Monitoring
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Dispatches an automated incident notification to all primary administrator emails.
 * Enforces cooldown debouncing to prevent flood storms during system events.
 */
export async function dispatchAdminAlert(
  payload: AdminAlertPayload,
  customAdapter?: EmailProviderAdapter
): Promise<{ sent: boolean; reason?: string }> {
  try {
    const dedupKey = payload.dedupKey || `${payload.category}:${payload.title}`;
    const cooldownMinutes = payload.cooldownMinutes ?? 15;
    const cooldownMs = cooldownMinutes * 60 * 1000;
    const now = Date.now();

    const existingCooldown = cooldownLedger.get(dedupKey);
    if (existingCooldown && existingCooldown > now) {
      const remainingSec = Math.round((existingCooldown - now) / 1000);
      console.warn(
        `[AdminAlert] Cooldown active for "${dedupKey}". Suppressing duplicate alert for next ${remainingSec}s.`
      );
      return { sent: false, reason: "COOLDOWN_ACTIVE" };
    }

    // Set cooldown timestamp
    cooldownLedger.set(dedupKey, now + cooldownMs);

    const adapter = customAdapter || getActiveEmailAdapter();
    const subject = `[SKETCH ${(payload.severity || "warning").toUpperCase()}] ${payload.title}`;

    const sendPromises = ADMIN_ALERT_RECIPIENTS.map(async (recipient) => {
      const html = renderAdminAlertHtml(payload, recipient);
      const text = `SKETCH OPS INCIDENT ALERT [${(payload.severity || "warning").toUpperCase()}]
Category: ${payload.category}
Title: ${payload.title}
Details: ${payload.details}

Logged: ${new Date().toISOString()}
Gateway: https://sketchhub-liard.vercel.app/ops/gateway
`;
      return adapter.sendEmail({
        to: recipient,
        toName: "SKETCH Administrator",
        subject,
        html,
        text,
      });
    });

    const results = await Promise.allSettled(sendPromises);
    const anySucceeded = results.some(
      (r) => r.status === "fulfilled" && r.value.success
    );

    if (anySucceeded) {
      console.log(`[AdminAlert] Successfully notified admin recipients: ${ADMIN_ALERT_RECIPIENTS.join(", ")}`);
      return { sent: true };
    }

    console.error("[AdminAlert] Delivery failed for all admin recipients:", results);
    return { sent: false, reason: "ALL_DELIVERIES_FAILED" };
  } catch (err: any) {
    console.error("[AdminAlert] Unexpected exception while dispatching alert:", err?.message || err);
    return { sent: false, reason: err?.message || "INTERNAL_ERROR" };
  }
}
