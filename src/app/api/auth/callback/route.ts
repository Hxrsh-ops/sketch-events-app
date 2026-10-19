import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAppEnv } from "@/lib/env";
import { sanitizeInternalRedirect } from "@/lib/auth/redirect";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const rawRedirect = searchParams.get("redirect");
  const redirectTarget = sanitizeInternalRedirect(rawRedirect, "/");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Handle OAuth provider errors / cancellation directly
  if (error) {
    const errorUrl = new URL("/login", origin);
    errorUrl.searchParams.set("error", "oauth_provider_error");
    errorUrl.searchParams.set("details", errorDescription || error);
    return NextResponse.redirect(errorUrl);
  }

  if (!code) {
    const errorUrl = new URL("/login", origin);
    errorUrl.searchParams.set("error", "missing_auth_code");
    return NextResponse.redirect(errorUrl);
  }

  const env = getAppEnv();

  // If invoked in preview mode where Supabase is not active
  if (env.mode === "preview" || !env.supabaseUrl) {
    const errorUrl = new URL("/login", origin);
    errorUrl.searchParams.set("error", "preview_oauth_unsupported");
    return NextResponse.redirect(errorUrl);
  }

  const supabase = await createClient();
  if (!supabase) {
    const errorUrl = new URL("/login", origin);
    errorUrl.searchParams.set("error", "auth_client_unavailable");
    return NextResponse.redirect(errorUrl);
  }

  // Exchange auth code for session
  const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !exchangeData.user) {
    const errorUrl = new URL("/login", origin);
    errorUrl.searchParams.set("error", "auth_exchange_failed");
    errorUrl.searchParams.set("details", exchangeError?.message || "Exchange failed");
    return NextResponse.redirect(errorUrl);
  }

  const userId = exchangeData.user.id;

  // Verify that the authenticated user actually has an authorized admin profile in PostgreSQL
  const { data: profile, error: profileError } = await (supabase as any)
    .from("admin_profiles")
    .select("id, role, full_name, email")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    // Revoke the session immediately — authenticated user is NOT an admin
    await supabase.auth.signOut();
    const errorUrl = new URL("/login", origin);
    errorUrl.searchParams.set("error", "not_an_admin");
    return NextResponse.redirect(errorUrl);
  }

  // User is a valid admin with verified profile. Redirect to destination!
  const successUrl = new URL(redirectTarget, origin);
  return NextResponse.redirect(successUrl);
}
