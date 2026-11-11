import "server-only";

import { AppEnv, getAppEnv, sanitizeSupabaseKey, decodeJwtPayload } from "@/lib/env";

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

function sanitizeEnvValue(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  let val = raw.trim();
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    val = val.slice(1, -1).trim();
  }
  return val || undefined;
}

/**
 * Retrieves the privileged server environment configuration.
 * Protected by Next.js `server-only` build-time boundary.
 */
export function getServerEnv(): ServerAppEnv {
  if (cachedServerEnv) return cachedServerEnv;

  const base = getAppEnv();
  const rawServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseServiceRoleKey = rawServiceKey ? sanitizeSupabaseKey(rawServiceKey) : undefined;
  const emailProvider = sanitizeEnvValue(process.env.EMAIL_PROVIDER) || "resend";
  const resendApiKey = sanitizeEnvValue(process.env.RESEND_API_KEY);
  const brevoApiKey = sanitizeEnvValue(process.env.BREVO_API_KEY);
  const mailpitUrl = sanitizeEnvValue(process.env.MAILPIT_URL);
  const emailFrom = sanitizeEnvValue(process.env.EMAIL_FROM) || "SKETCH Events <events@sketchevents.org>";
  const cronSecret = sanitizeEnvValue(process.env.CRON_SECRET);

  // Validate service-role key sanity in production
  if (base.mode === "production" && supabaseServiceRoleKey) {
    const payload = decodeJwtPayload(supabaseServiceRoleKey);
    if (payload && payload.role === "anon") {
      console.warn(
        `[SKETCH CONFIG WARNING] SUPABASE_SERVICE_ROLE_KEY appears to have role "anon" instead of "service_role". Privileged database operations (outbox worker, admin checks) will fail RLS policies.`
      );
    }
    if (payload && payload.ref && base.supabaseUrl) {
      const urlMatch = base.supabaseUrl.match(/^https?:\/\/([^.]+)\.supabase\.co/);
      if (urlMatch && urlMatch[1] && urlMatch[1] !== payload.ref) {
        console.warn(
          `[SKETCH CONFIG WARNING] SUPABASE_SERVICE_ROLE_KEY belongs to project "${payload.ref}", but NEXT_PUBLIC_SUPABASE_URL points to "${urlMatch[1]}". This will cause "Invalid API key" errors.`
        );
      }
    }
  }

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
  const secret = sanitizeEnvValue(process.env.CRON_SECRET) || getServerEnv().cronSecret;
  if (
    !secret ||
    secret === "your-cron-secret-here" ||
    secret === "your-secure-random-32-byte-hex-secret-here"
  ) {
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
