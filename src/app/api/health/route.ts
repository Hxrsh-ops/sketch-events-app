import { NextResponse } from "next/server";
import { getAppEnv } from "@/lib/env";
import { getGoogleOAuthConfig } from "@/lib/auth/google-oauth";

/**
 * Lightweight unauthenticated health check for uptime monitors and post-deploy smoke verification.
 * Exposes ONLY non-sensitive operational flags (never prints URLs, keys, or secrets).
 */
export async function GET() {
  const env = getAppEnv();
  const googleOAuth = getGoogleOAuthConfig();

  return NextResponse.json(
    {
      status: "ok",
      mode: env.mode,
      supabaseConfigured: Boolean(env.supabaseUrl && env.supabaseAnonKey),
      googleOAuthMode: googleOAuth.isConfigured ? "direct" : "supabase_fallback",
      cronConfigured: Boolean(
        process.env.CRON_SECRET &&
          process.env.CRON_SECRET.trim() !== "" &&
          process.env.CRON_SECRET.trim() !== "your-cron-secret-here"
      ),
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
