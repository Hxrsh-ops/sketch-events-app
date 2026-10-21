/**
 * Isolated Brevo Email Dispatch Verification Script
 *
 * SAFETY INVARIANTS:
 * 1. Strictly isolated: does NOT touch communications_outbox, Supabase database, or registration records.
 * 2. Does NOT invoke EmailOutboxWorker or process pending queues.
 * 3. Never prints secrets, API keys, or full authorization headers.
 * 4. Fails safely if BREVO_API_KEY is missing or placeholder.
 * 5. Dispatches exactly ONE clearly labeled test email to the specified recipient.
 */

const fs = require("fs");
const path = require("path");

async function main() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("[Brevo Test] Error: .env.local not found at project root.");
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, "utf8");
  const envLines = envContent.split(/\r?\n/);
  let apiKey = "";
  let emailFrom = "";

  for (const line of envLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const idx = trimmed.indexOf("=");
    const k = trimmed.substring(0, idx).trim();
    let v = trimmed.substring(idx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (k === "BREVO_API_KEY") apiKey = v;
    if (k === "EMAIL_FROM") emailFrom = v;
  }

  if (!apiKey || apiKey === "your-brevo-api-key-here" || apiKey.includes("your_brevo_api_key")) {
    console.error("[Brevo Test] Error: BREVO_API_KEY is not configured or is a placeholder in .env.local.");
    console.error("Please add your Brevo API key to .env.local as: BREVO_API_KEY=xkeysib-...");
    process.exit(1);
  }

  // Target recipient passed via command line argument or prompts
  const targetRecipient = process.argv[2];
  if (!targetRecipient || !targetRecipient.includes("@")) {
    console.error("[Brevo Test] Error: Target recipient email required.");
    console.error("Usage: node scripts/test-brevo-isolated.js <your-verified-recipient@domain.com>");
    process.exit(1);
  }

  const fromParts = emailFrom.match(/^(?:(.*?)<)?([^<>]+)>?$/);
  const senderName = fromParts?.[1]?.trim() || "Sketch Events";
  const senderEmail = fromParts?.[2]?.trim() || emailFrom;

  console.log("[Brevo Test] Initiating isolated single-email verification...");
  console.log("  - Provider: Brevo (api.brevo.com/v3/smtp/email)");
  console.log("  - Sender:", `${senderName} <${senderEmail}>`);
  console.log("  - Target Recipient:", targetRecipient);
  console.log("  - API Key Present: Yes (length:", apiKey.length, ", redacted)");
  console.log("  - Isolated Mode: True (0 database queries, 0 outbox jobs)");

  const payload = {
    sender: { name: senderName, email: senderEmail },
    to: [{ email: targetRecipient, name: "Sketch Administrator" }],
    subject: `[SketchHUB Test] Brevo Adapter Verification (${new Date().toLocaleTimeString()})`,
    htmlContent: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #E5E7EA; border-radius: 16px; background: #FFFFFF; color: #17191C;">
        <h2 style="margin-top: 0; font-size: 20px; font-weight: 700; color: #17191C;">SketchHUB Brevo Integration Test</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #656B73;">This is a strictly isolated test message validating the secondary transactional email delivery pipeline via Brevo.</p>
        <div style="background: #F8F9FA; border: 1px solid #E5E7EA; border-radius: 10px; padding: 14px; margin: 18px 0; font-size: 12px; font-family: monospace;">
          <div><strong>Timestamp:</strong> ${new Date().toISOString()}</div>
          <div><strong>Target:</strong> ${targetRecipient}</div>
          <div><strong>Sender:</strong> ${senderEmail}</div>
        </div>
        <p style="font-size: 11px; color: #8A9098; margin-bottom: 0;">SketchHUB Operations Engineering • Verified Provider Integration</p>
      </div>
    `,
    textContent: `SketchHUB Brevo Integration Test\nTimestamp: ${new Date().toISOString()}\nTarget: ${targetRecipient}`,
    headers: {
      "X-Idempotency-Key": `brevo-manual-test-${Date.now()}`,
    },
    tags: ["sketchhub-isolated-test"],
  };

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Idempotency-Key": payload.headers["X-Idempotency-Key"],
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const statusCode = response.status;
    const msg = data?.message || `HTTP ${statusCode}`;
    console.error(`[Brevo Test] Failed: API responded with status ${statusCode}: ${msg}`);
    if (statusCode === 400 && msg.includes("Sender")) {
      console.error("[Brevo Test] Hint: Ensure sender email is verified in your Brevo account (Senders & IPs -> Senders).");
    }
    process.exit(1);
  }

  console.log("\n[Brevo Test] SUCCESS: Brevo accepted the message!");
  console.log("  - Status: HTTP 201 Created / 200 OK");
  console.log("  - Provider Message ID:", data.messageId || "(accepted)");
  console.log("  - Please check the inbox of:", targetRecipient);
}

main().catch((err) => {
  console.error("[Brevo Test] Fatal error:", err.message);
  process.exit(1);
});
