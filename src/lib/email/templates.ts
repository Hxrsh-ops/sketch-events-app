import { TicketPassPayload, TicketPassPayloadSchema } from "./types";

export interface RenderedEmail {
  html: string;
  text: string;
}

/**
 * Validates the job payload and renders responsive HTML and plaintext for ticket passes.
 */
export function renderTicketPassEmail(rawPayload: Record<string, unknown>, recipientName: string): RenderedEmail {
  const parseResult = TicketPassPayloadSchema.safeParse(rawPayload);
  if (!parseResult.success) {
    const errorDetails = parseResult.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
    throw new Error(`Invalid ticket pass payload: ${errorDetails}`);
  }

  const payload: TicketPassPayload = parseResult.data;
  const formattedDate = new Date(payload.start_date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const teamBadgeHtml = payload.team_name
    ? `<div style="display:inline-block;padding:4px 10px;background:#EBF5FF;color:#0066CC;border-radius:6px;font-size:12px;font-weight:700;margin-top:6px;">TEAM: ${escapeHtml(
        payload.team_name
      )}</div>`
    : "";

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Pass for ${escapeHtml(payload.event_title)}</title>
</head>
<body style="margin:0;padding:24px;background-color:#F4F5F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#17191C;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;margin:0 auto;background:#FFFFFF;border-radius:16px;border:1px solid #E5E7EA;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.04);">
    <tr>
      <td style="padding:28px 32px;background:#17191C;color:#FFFFFF;text-align:left;">
        <span style="font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#8F96A0;">SKETCH EVENTS</span>
        <h1 style="margin:6px 0 0 0;font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#FFFFFF;">${escapeHtml(
          payload.event_title
        )}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:32px;">
        <p style="margin:0 0 16px 0;font-size:15px;line-height:1.5;">Hello <strong>${escapeHtml(
          recipientName
        )}</strong>,</p>
        <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#555E68;">
          Your registration has been confirmed. Present this pass or your credentials at the verification desk when you arrive.
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border-radius:12px;border:1px solid #E5E7EA;margin-bottom:24px;">
          <tr>
            <td style="padding:20px;">
              <div style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.05em;">REGISTRATION IDENTIFIER</div>
              <div style="font-size:18px;font-weight:800;letter-spacing:0.02em;color:#111827;font-family:monospace;margin-top:2px;">${escapeHtml(
                payload.registration_id
              )}</div>
              ${teamBadgeHtml}

              <hr style="border:none;border-top:1px solid #E5E7EA;margin:16px 0;" />

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom:10px;">
                    <div style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;">Date & Time</div>
                    <div style="font-size:13px;font-weight:600;color:#17191C;">${escapeHtml(formattedDate)}</div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;">Venue</div>
                    <div style="font-size:13px;font-weight:600;color:#17191C;">${escapeHtml(payload.venue)}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <div style="background:#F3F4F6;border-radius:8px;padding:12px 16px;text-align:center;">
          <span style="font-size:11px;color:#6B7280;text-transform:uppercase;font-weight:700;letter-spacing:0.05em;">QR Credential ID:</span>
          <span style="font-family:monospace;font-size:12px;font-weight:700;color:#374151;margin-left:6px;">${escapeHtml(
            payload.qr_credential_id
          )}</span>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 32px;background:#F9FAFB;border-top:1px solid #E5E7EA;text-align:center;font-size:12px;color:#9CA3AF;">
        &copy; ${new Date().getFullYear()} SKETCH Events Platform &bull; Automated Verification Service
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `SKETCH EVENTS: PASS CONFIRMATION

Event: ${payload.event_title}
Attendee: ${recipientName}
${payload.team_name ? `Team: ${payload.team_name}\n` : ""}Registration ID: ${payload.registration_id}
QR Credential ID: ${payload.qr_credential_id}

Date: ${formattedDate}
Venue: ${payload.venue}

Please present your Registration ID or Credential at check-in.
`;

  return { html, text };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
