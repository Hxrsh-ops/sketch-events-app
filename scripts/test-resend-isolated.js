/**
 * Isolated Resend Email Dispatch Verification Script
 *
 * SAFETY INVARIANTS:
 * 1. Strictly isolated: does NOT touch communications_outbox, Supabase database, or registration records.
 * 2. Does NOT invoke EmailOutboxWorker or process pending queues.
 * 3. Never prints secrets, API keys, or full authorization headers.
 * 4. Fails safely if RESEND_API_KEY or EMAIL_FROM is missing or placeholder.
 * 5. Dispatches exactly ONE clearly labeled test email to the specified recipient.
 */

const fs = require("fs");
const path = require("path");

async function main() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("[Resend Test] Error: .env.local not found at project root.");
    process.exit(1);
  }

  const envLines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  let apiKey = "";
  let emailFrom = "";

  for (const line of envLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const idx = trimmed.indexOf("=");
    const k = trimmed.substring(0, idx).trim();
    let v = trimmed.substring(idx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1).trim();
    }
    if (k === "RESEND_API_KEY") apiKey = v;
    if (k === "EMAIL_FROM") emailFrom = v;
  }

  if (!apiKey || apiKey === "your-resend-api-key-here" || apiKey.includes("your_resend_api_key")) {
    console.error("[Resend Test] Error: RESEND_API_KEY is not configured or is a placeholder in .env.local.");
    process.exit(1);
  }

  if (!emailFrom || !emailFrom.includes("@")) {
    console.error("[Resend Test] Error: EMAIL_FROM is missing or invalid in .env.local.");
    process.exit(1);
  }

  const targetRecipient = process.argv[2];
  if (!targetRecipient || !targetRecipient.includes("@")) {
    console.error("[Resend Test] Error: Target recipient email required.");
    console.error("Usage: node scripts/test-resend-isolated.js <recipient@domain.com>");
    process.exit(1);
  }

  const idempotencyKey = `resend-isolated-test-${Date.now()}`;
  const nowIso = new Date().toISOString();

  console.log("[Resend Test] Initiating isolated single-email verification...");
  console.log("  - Provider: Resend (https://api.resend.com/emails)");
  console.log("  - Sender (EMAIL_FROM):", emailFrom);
  console.log("  - Target Recipient:", targetRecipient);
  console.log("  - API Key Present: Yes (length:", apiKey.length, ", redacted)");
  console.log("  - Isolated Mode: True (0 database queries, 0 outbox jobs)");

  const payload = {
    from: emailFrom,
    to: targetRecipient,
    subject: `[SketchHUB Test] Isolated Resend Verification (${nowIso})`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #E5E7EA; border-radius: 16px; background: #FFFFFF; color: #17191C;">
        <h2 style="margin-top: 0; font-size: 20px; font-weight: 700; color: #17191C;">SketchHUB Resend Integration Test</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #555E68;">
          This is an isolated single-email verification test sent directly via Resend without modifying or processing the queued <code>communications_outbox</code> records.
        </p>
        <div style="background: #F8F9FA; border: 1px solid #E5E7EA; border-radius: 10px; padding: 14px; margin: 18px 0; font-size: 12px; font-family: monospace;">
          <div><strong>Timestamp:</strong> ${nowIso}</div>
          <div><strong>Recipient:</strong> ${targetRecipient}</div>
          <div><strong>Sender:</strong> ${emailFrom.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
        </div>
        <p style="font-size: 11px; color: #8A9098; margin-bottom: 0;">SketchHUB Operations Engineering • Isolated Provider Verification</p>
      </div>
    `,
    text: `SketchHUB Resend Integration Test\nTimestamp: ${nowIso}\nRecipient: ${targetRecipient}\nSender: ${emailFrom}`,
  };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const statusCode = response.status;
    const msg = data?.message || `HTTP ${statusCode}`;
    console.error(`[Resend Test] Failed: Resend API responded with HTTP ${statusCode}: ${msg}`);
    process.exit(1);
  }

  console.log("\n[Resend Test] ACCEPTED by Resend API:");
  console.log("  - HTTP Status:", response.status);
  console.log("  - Resend Email ID:", data.id || "(none)");

  if (data.id) {
    await new Promise((r) => setTimeout(r, 3000));
    const statusRes = await fetch(`https://api.resend.com/emails/${data.id}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(8000),
    });
    const statusData = await statusRes.json().catch(() => ({}));
    if (statusRes.ok) {
      console.log("  - Resend Delivery Status (last_event):", statusData.last_event || "unknown");
    } else {
      console.log(
        `  - Resend Delivery Status Lookup: HTTP ${statusRes.status} (${statusData.message || "unavailable"})`
      );
    }
  }
}

main().catch((err) => {
  console.error("[Resend Test] Fatal error:", err.message);
  process.exit(1);
});
