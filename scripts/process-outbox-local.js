/**
 * Local Outbox Cron Trigger Script
 *
 * Reads CRON_SECRET and NEXT_PUBLIC_APP_URL from .env.local (or process.env)
 * and dispatches an authenticated POST request to /api/cron/process-outbox.
 * Never prints secrets or raw authorization headers.
 */

const fs = require("fs");
const path = require("path");

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  const parsed = {};
  if (!fs.existsSync(envPath)) return parsed;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const eqIdx = trimmed.indexOf("=");
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1).trim();
    }
    parsed[key] = val;
  }
  return parsed;
}

async function main() {
  const fileEnv = loadEnvLocal();
  const cronSecret = (process.env.CRON_SECRET || fileEnv.CRON_SECRET || "").trim();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || fileEnv.NEXT_PUBLIC_APP_URL || "http://localhost:3000")
    .trim()
    .replace(/\/+$/, "");

  const batchArg = process.argv.find((a) => a.startsWith("--batch-size="));
  const batchSize = batchArg ? parseInt(batchArg.split("=")[1], 10) : 10;
  const jobIdArg = process.argv.find((a) => a.startsWith("--job-id="));
  const jobId = jobIdArg ? jobIdArg.split("=")[1].trim() : "";
  const recipientArg = process.argv.find((a) => a.startsWith("--recipient="));
  const recipient = recipientArg ? recipientArg.split("=")[1].trim() : "";

  if (!cronSecret) {
    console.error("[Outbox Trigger] Error: CRON_SECRET is missing in .env.local and environment.");
    process.exit(1);
  }

  const params = new URLSearchParams();
  if (jobId) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId)) {
      console.error("[Outbox Trigger] Error: --job-id must be a valid UUID.");
      process.exit(1);
    }
    params.set("job_id", jobId);
    if (recipient) {
      params.set("recipient", recipient);
    }
  } else {
    params.set("batch_size", String(Number.isFinite(batchSize) && batchSize > 0 ? batchSize : 10));
  }

  const targetUrl = `${appUrl}/api/cron/process-outbox?${params.toString()}`;
  console.log(`[Outbox Trigger] Sending POST ${targetUrl} ...`);

  try {
    const res = await fetch(targetUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
        Accept: "application/json",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(30000),
    });

    if (res.status >= 300 && res.status < 400) {
      console.error(
        `[Outbox Trigger] Unexpected redirect HTTP ${res.status} -> ${res.headers.get("location") || "unknown"}. ` +
          "Ensure /api/cron/ is exempted from auth middleware."
      );
      process.exit(1);
    }

    const body = await res.json().catch(() => ({}));
    console.log(`[Outbox Trigger] HTTP ${res.status}:`, JSON.stringify(body, null, 2));

    if (!res.ok || body.success === false) {
      process.exit(1);
    }
  } catch (err) {
    console.error(
      `[Outbox Trigger] Request failed: ${err instanceof Error ? err.message : String(err)}`
    );
    console.error("[Outbox Trigger] Is the local app running (`npm run dev`) at", appUrl, "?");
    process.exit(1);
  }
}

main();
