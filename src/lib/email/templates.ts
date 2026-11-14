import { TicketPassPayload, TicketPassPayloadSchema } from "./types";
import { TicketDesignData } from "@/lib/validations/ticket-schemas";

export interface RenderedEmail {
  html: string;
  text: string;
}

/**
 * Validates the job payload and renders responsive HTML and plaintext for ticket passes.
 */
export function renderTicketPassEmail(
  rawPayload: Record<string, unknown>,
  recipientName: string,
  design?: TicketDesignData
): RenderedEmail {
  const parseResult = TicketPassPayloadSchema.safeParse(rawPayload);
  if (!parseResult.success) {
    const errorDetails = parseResult.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
    throw new Error(`Invalid ticket pass payload: ${errorDetails}`);
  }

  const payload: TicketPassPayload = parseResult.data;
  const bg = design?.theme?.background || "#111316";
  const accent = design?.theme?.accent || "#FBBF24";
  const borderColor = design?.theme?.borderColor || "#262A30";
  const badgeText = design?.stub?.badgeText || "CONFIRMED";

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
    ? `<span style="display:inline-block;padding:4px 10px;background:#2A2212;color:${escapeHtml(
        accent
      )};border:1px solid #523E14;border-radius:9999px;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">TEAM: ${escapeHtml(
        payload.team_name
      )}</span>`
    : `<span style="display:inline-block;padding:4px 10px;background:#1C2229;color:#D1D5DB;border:1px solid #2D343E;border-radius:9999px;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">INDIVIDUAL PASS</span>`;

  const ticketFileName = `${payload.ticket_number || payload.registration_id}_pass.svg`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Pass for ${escapeHtml(payload.event_title)}</title>
</head>
<body style="margin:0;padding:24px 12px;background-color:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#17191C;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;margin:0 auto;">
    <tr>
      <td>
        <p style="margin:0 0 12px 4px;font-size:14px;color:#374151;">
          Hello <strong>${escapeHtml(recipientName)}</strong>, your official pass is confirmed:
        </p>

        <!-- Official Event Pass Card -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background:${escapeHtml(
          bg
        )};border-radius:20px;border:1px solid ${escapeHtml(
    borderColor
  )};overflow:hidden;box-shadow:0 16px 40px rgba(0,0,0,0.22);color:#FFFFFF;">
          <!-- Top Brand + Ticket Number Strip -->
          <tr>
            <td style="padding:22px 26px 14px 26px;border-bottom:1px solid #22262C;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#9CA3AF;">
                    SKETCH <span style="color:#4B5563;margin:0 6px;">|</span> <span style="color:${escapeHtml(
                      accent
                    )};">${escapeHtml(badgeText)}</span>
                  </td>
                  <td align="right">
                    ${
                      payload.ticket_number
                        ? `<span style="display:inline-block;padding:4px 10px;background:#1C2026;border:1px solid #2E343D;border-radius:9999px;font-family:monospace;font-size:11px;font-weight:700;color:#E5E7EB;">${escapeHtml(
                            payload.ticket_number
                          )}</span>`
                        : ""
                    }
                  </td>
                </tr>
              </table>
              <h1 style="margin:14px 0 6px 0;font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#FFFFFF;">
                ${escapeHtml(payload.event_title)}
              </h1>
              <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.5;">
                ${escapeHtml(formattedDate)} &bull; ${escapeHtml(payload.venue)}
              </p>
            </td>
          </tr>

          <!-- Center QR Pass Section -->
          <tr>
            <td style="padding:26px;text-align:center;">
              ${
                payload.qr_code_data_url
                  ? `<div style="display:inline-block;padding:14px;background:#FFFFFF;border-radius:16px;">
                      <img src="${escapeHtml(
                        payload.qr_code_data_url
                      )}" alt="Entry QR Code" width="176" height="176" style="display:block;border-radius:8px;" />
                    </div>
                    <div style="font-size:10px;font-family:monospace;letter-spacing:0.14em;text-transform:uppercase;color:#9CA3AF;margin-top:12px;">
                      PRESENT AT CHECK-IN TERMINAL
                    </div>`
                  : ""
              }

              <div style="margin-top:14px;">
                <span style="display:inline-block;padding:6px 12px;background:#1A1D22;border:1px solid #2B3038;border-radius:8px;font-family:monospace;font-size:12px;font-weight:700;color:#F3F4F6;">
                  ${escapeHtml(payload.registration_id)}
                </span>
              </div>
              <div style="margin-top:8px;font-family:monospace;font-size:10px;color:#6B7280;">
                CREDENTIAL: ${escapeHtml(payload.qr_credential_id)}
              </div>
            </td>
          </tr>

          <!-- Dashed Ticket Tear Divider -->
          <tr>
            <td style="padding:0 24px;">
              <div style="border-top:1px dashed #2E343D;height:1px;"></div>
            </td>
          </tr>

          <!-- Holder & Team Footer -->
          <tr>
            <td style="padding:18px 26px 24px 26px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="top">
                    <div style="font-size:10px;font-family:monospace;text-transform:uppercase;letter-spacing:0.1em;color:#6B7280;">HOLDER</div>
                    <div style="font-size:14px;font-weight:700;color:#FFFFFF;margin-top:3px;">${escapeHtml(
                      recipientName
                    )}</div>
                  </td>
                  <td align="right" valign="middle">
                    ${teamBadgeHtml}
                  </td>
                </tr>
              </table>

              <!-- Attached SVG Pass Notice -->
              <div style="margin-top:18px;padding:10px 14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;text-align:center;">
                <p style="margin:0;font-size:11px;color:#9CA3AF;">
                  Official Pass Attached: <strong style="color:#FFFFFF;font-family:monospace;">${escapeHtml(
                    ticketFileName
                  )}</strong>
                </p>
              </div>

              ${
                payload.live_ticket_url
                  ? `<div style="text-align:center;margin-top:18px;">
                      <a href="${escapeHtml(
                        payload.live_ticket_url
                      )}" style="display:inline-block;padding:13px 26px;background:#FFFFFF;color:#111316;text-decoration:none;font-size:13px;font-weight:800;border-radius:9999px;">
                        Open Live Admission Pass &rarr;
                      </a>
                    </div>
                    <p style="margin:14px 0 0 0;font-size:11px;color:#6B7280;text-align:center;line-height:1.5;">
                      <strong>Anti-Replay Notice:</strong> Your official entry QR code rotates continuously on your live ticket page.
                    </p>`
                  : ""
              }
            </td>
          </tr>
        </table>
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
${payload.live_ticket_url ? `Live Ticket & Rotating QR: ${payload.live_ticket_url}\n` : ""}
Date: ${formattedDate}
Venue: ${payload.venue}

Please present your Registration ID or Credential at check-in.
`;

  return { html, text };
}

/**
 * Validates the job payload and renders responsive HTML and plaintext for certificates.
 */
export function renderCertificateEmail(
  rawPayload: Record<string, unknown>,
  recipientName: string,
  subject: string
): RenderedEmail {
  const certificateNumber = String(rawPayload.certificateNumber || "SKETCH-CERT-VERIFIED");
  const eventTitle = String(rawPayload.eventTitle || "SKETCH Event");
  const issuedAt = String(rawPayload.issuedAt || new Date().toISOString());
  const formattedDate = new Date(issuedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:24px;background-color:#F4F5F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#17191C;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;margin:0 auto;background:#FFFFFF;border-radius:16px;border:1px solid #E5E7EA;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.04);">
    <tr>
      <td style="padding:28px 32px;background:#17191C;color:#FFFFFF;text-align:left;">
        <span style="font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#8F96A0;">CERTIFICATE OF PARTICIPATION</span>
        <h1 style="margin:6px 0 0 0;font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#FFFFFF;">${escapeHtml(eventTitle)}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:32px;">
        <p style="margin:0 0 16px 0;font-size:15px;line-height:1.5;">Dear <strong>${escapeHtml(recipientName)}</strong>,</p>
        <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#555E68;">
          Congratulations! Your participation and verified attendance at <strong>${escapeHtml(eventTitle)}</strong> has been formally recorded and certified.
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border-radius:12px;border:1px solid #E5E7EA;margin-bottom:24px;">
          <tr>
            <td style="padding:20px;">
              <div style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.05em;">CERTIFICATE SERIAL NUMBER</div>
              <div style="font-size:18px;font-weight:800;letter-spacing:0.02em;color:#111827;font-family:monospace;margin-top:2px;">${escapeHtml(certificateNumber)}</div>

              <hr style="border:none;border-top:1px solid #E5E7EA;margin:16px 0;" />

              <div style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;">Date of Issuance</div>
              <div style="font-size:13px;font-weight:600;color:#17191C;">${escapeHtml(formattedDate)}</div>
            </td>
          </tr>
        </table>

        <p style="margin:0;font-size:13px;color:#6B7280;line-height:1.5;">
          This digital credential is authenticated on the SKETCH Event Operations Platform.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 32px;background:#F9FAFB;border-top:1px solid #E5E7EA;text-align:center;font-size:12px;color:#9CA3AF;">
        &copy; ${new Date().getFullYear()} SKETCH Events Platform &bull; Digital Credential Verification Service
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `SKETCH EVENTS: CERTIFICATE OF PARTICIPATION

Event: ${eventTitle}
Recipient: ${recipientName}
Certificate Number: ${certificateNumber}
Issued On: ${formattedDate}

Congratulations! Your attendance has been officially verified and recorded.
`;

  return { html, text };
}

/**
 * Validates the job payload and renders responsive HTML and plaintext for announcements and reminders.
 */
export function renderAnnouncementEmail(
  rawPayload: Record<string, unknown>,
  recipientName: string,
  subject: string
): RenderedEmail {
  const bodyContent = String(rawPayload.bodyContent || "");
  const sender = String(rawPayload.sender || "SKETCH Team");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:24px;background-color:#F4F5F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#17191C;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;margin:0 auto;background:#FFFFFF;border-radius:16px;border:1px solid #E5E7EA;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.04);">
    <tr>
      <td style="padding:28px 32px;background:#17191C;color:#FFFFFF;text-align:left;">
        <span style="font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#8F96A0;">EVENT ANNOUNCEMENT</span>
        <h1 style="margin:6px 0 0 0;font-size:20px;font-weight:800;letter-spacing:-0.02em;color:#FFFFFF;">${escapeHtml(subject)}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:32px;">
        <p style="margin:0 0 16px 0;font-size:15px;line-height:1.5;">Hello <strong>${escapeHtml(recipientName)}</strong>,</p>
        <div style="font-size:14px;line-height:1.6;color:#374151;white-space:pre-wrap;">
          ${escapeHtml(bodyContent)}
        </div>
        <p style="margin:24px 0 0 0;font-size:13px;color:#6B7280;line-height:1.5;">
          Sent by ${escapeHtml(sender)} &bull; SKETCH Events Operations
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 32px;background:#F9FAFB;border-top:1px solid #E5E7EA;text-align:center;font-size:12px;color:#9CA3AF;">
        &copy; ${new Date().getFullYear()} SKETCH Events Platform &bull; Operational Communications
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `SKETCH EVENTS: ANNOUNCEMENT

Subject: ${subject}
Hello ${recipientName},

${bodyContent}

Sent by ${sender}
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
