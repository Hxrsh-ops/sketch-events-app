import "server-only";

import { AppEnv, getAppEnv } from "@/lib/env";

/**
 * Server-only environment contract.
 * Contains privileged backend secrets and provider configurations.
 * Enforced at compile-time by Next.js via the `server-only` package.
 */
export interface ServerAppEnv extends AppEnv {
  supabaseServiceRoleKey?: string;
  emailProvider: string;
  resendApiKey?: string;
  brevoApiKey?: string;
  mailpitUrl?: string;
  emailFrom: string;
  cronSecret?: string;
}

let cachedServerEnv: ServerAppEnv | null = null;

/**
 * Retrieves the privileged server environment configuration.
 * Protected by Next.js `server-only` build-time boundary.
 */
export function getServerEnv(): ServerAppEnv {
  if (cachedServerEnv) return cachedServerEnv;

  const base = getAppEnv();
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const emailProvider = process.env.EMAIL_PROVIDER || "resend";
  const resendApiKey = process.env.RESEND_API_KEY;
  const brevoApiKey = process.env.BREVO_API_KEY;
  const mailpitUrl = process.env.MAILPIT_URL;
  const emailFrom = process.env.EMAIL_FROM || "SKETCH Events <events@sketchevents.org>";
  const cronSecret = process.env.CRON_SECRET;

  cachedServerEnv = {
    ...base,
    supabaseServiceRoleKey,
    emailProvider,
    resendApiKey,
    brevoApiKey,
    mailpitUrl,
    emailFrom,
    cronSecret,
  };

  return cachedServerEnv;
}

/**
 * Retrieves the server-only CRON_SECRET for outbox worker invocation.
 * Returns null if unset, blank, or placeholder.
 */
export function getServerCronSecret(): string | null {
  const secret = (process.env.CRON_SECRET || getServerEnv().cronSecret)?.trim();
  if (!secret || secret === "your-cron-secret-here") {
    return null;
  }
  return secret;
}

/**
 * Validates and returns the service role key for privileged backend operations.
 * Throws an explicit error if absent or placeholder in production mode.
 */
export function requireServerServiceRoleKey(): string {
  const serverEnv = getServerEnv();

  if (serverEnv.mode === "production") {
    if (
      !serverEnv.supabaseServiceRoleKey ||
      serverEnv.supabaseServiceRoleKey === "your-service-role-key-here"
    ) {
      throw new Error(
        "[SKETCH SECURITY VIOLATION] SUPABASE_SERVICE_ROLE_KEY is required for privileged server operations in production mode."
      );
    }
  }

  return serverEnv.supabaseServiceRoleKey || "";
}

/**
 * Resets the server environment cache (for tests)
 */
export function resetServerEnvCache(): void {
  cachedServerEnv = null;
}
