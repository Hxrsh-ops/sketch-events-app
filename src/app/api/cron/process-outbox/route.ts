import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getServerCronSecret } from "@/lib/env.server";
import { EmailOutboxWorker } from "@/lib/email/worker";

const DEFAULT_BATCH_SIZE = 10;
const MAX_BATCH_SIZE = 50;
const DEFAULT_STUCK_TIMEOUT_MINUTES = 10;

/**
 * Timing-safe string comparison to protect against side-channel timing attacks.
 */
function timingSafeSecretCheck(provided: string, expected: string): boolean {
  if (!provided || !expected) {
    return false;
  }

  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}

/**
 * Extracts authorization secret from either Authorization header or x-cron-secret.
 */
function extractProvidedSecret(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    const trimmed = authHeader.trim();
    if (trimmed.toLowerCase().startsWith("bearer ")) {
      return trimmed.slice(7).trim();
    }
  }

  const cronHeader = request.headers.get("x-cron-secret");
  if (cronHeader) {
    return cronHeader.trim();
  }

  return null;
}

/**
 * Parses and bounds the requested batch size.
 */
function parseBatchSize(request: NextRequest): number {
  const rawParam =
    request.nextUrl.searchParams.get("batch_size") ||
    request.nextUrl.searchParams.get("batchSize");

  if (!rawParam) {
    return DEFAULT_BATCH_SIZE;
  }

  const parsed = parseInt(rawParam, 10);
  if (isNaN(parsed) || parsed < 1) {
    return DEFAULT_BATCH_SIZE;
  }

  return Math.min(parsed, MAX_BATCH_SIZE);
}

/**
 * POST /api/cron/process-outbox
 *
 * Secure entry point for background processing of queued email jobs.
 * Intended to be invoked periodically by a scheduled worker daemon or cron service.
 */
export async function POST(request: NextRequest) {
  const expectedSecret = getServerCronSecret();

  // 1. Fail closed if the server environment has not configured CRON_SECRET
  if (!expectedSecret) {
    return NextResponse.json(
      {
        success: false,
        error: "CRON_NOT_CONFIGURED",
        message: "Outbox background processing is not configured on this server.",
      },
      { status: 503 }
    );
  }

  // 2. Extract and authenticate incoming credentials
  const providedSecret = extractProvidedSecret(request);
  if (!providedSecret) {
    return NextResponse.json(
      {
        success: false,
        error: "UNAUTHORIZED",
        message: "Missing or invalid authorization credentials.",
      },
      { status: 401 }
    );
  }

  const isAuthorized = timingSafeSecretCheck(providedSecret, expectedSecret);
  if (!isAuthorized) {
    return NextResponse.json(
      {
        success: false,
        error: "FORBIDDEN",
        message: "Invalid authorization credentials.",
      },
      { status: 403 }
    );
  }

  // 3. Execute bounded outbox batch processing
  const batchSize = parseBatchSize(request);

  try {
    const worker = new EmailOutboxWorker();

    // Step A: Recover jobs stuck in 'processing' due to earlier worker crashes or timeouts
    const recovered = await worker.recoverStuckJobs(DEFAULT_STUCK_TIMEOUT_MINUTES);

    // Step B: Atomically claim and process scheduled batch
    const batchResult = await worker.processBatch(batchSize);

    // Return non-sensitive, aggregated execution statistics
    return NextResponse.json(
      {
        success: true,
        recovered,
        claimed: batchResult.claimed,
        processed: batchResult.processed,
        succeeded: batchResult.succeeded,
        failed: batchResult.failed,
        terminalFailures: batchResult.terminalFailures,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    // Log failure without exposing secrets or recipient PII
    const errorMessage = err instanceof Error ? err.message : "Unknown internal error";
    console.error("[Cron:ProcessOutbox] Worker execution encountered an unhandled exception:", {
      message: errorMessage,
    });

    return NextResponse.json(
      {
        success: false,
        error: "WORKER_EXECUTION_FAILED",
        message: "An internal server error occurred during outbox processing.",
      },
      { status: 500 }
    );
  }
}

/**
 * Reject GET requests to prevent accidental invocation via browser prefetching or URL crawling.
 */
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: "METHOD_NOT_ALLOWED",
      message: "Only POST requests are permitted for outbox processing.",
    },
    {
      status: 405,
      headers: {
        Allow: "POST",
      },
    }
  );
}
