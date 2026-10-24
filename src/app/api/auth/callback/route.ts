import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getAppEnv } from "@/lib/env";
import { sanitizeInternalRedirect } from "@/lib/auth/redirect";
import { AdminRole } from "@/types";

const ALLOWED_ADMIN_ROLES: AdminRole[] = [
  "master_admin",
  "event_manager",
  "attendance_staff",
  "analyst",
];

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

  // Safe diagnostic: log endpoint origin, key prefix and presence of code (NO secrets/tokens logged)
  if (process.env.NODE_ENV !== "production" || process.env.DEBUG_AUTH) {
    console.info("[OAuth Callback] Exchanging code for session...", {
      endpoint: env.supabaseUrl ? new URL(env.supabaseUrl).origin : "missing",
      hasCode: !!code,
      keyPrefix: env.supabaseAnonKey ? env.supabaseAnonKey.slice(0, 15) : "missing",
      keyLength: env.supabaseAnonKey?.length ?? 0,
    });
  }

  // Exchange auth code for session
  const { data: exchangeData, error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !exchangeData?.user) {
    console.error("[OAuth Callback] Session exchange failed:", {
      status: (exchangeError as any)?.status,
      code: (exchangeError as any)?.code,
      message: exchangeError?.message || "User object missing from session",
      endpoint: env.supabaseUrl ? new URL(env.supabaseUrl).origin : "missing",
      keyPrefix: env.supabaseAnonKey ? env.supabaseAnonKey.slice(0, 15) : "missing",
    });

    const errorUrl = new URL("/login", origin);
    errorUrl.searchParams.set("error", "auth_exchange_failed");
    errorUrl.searchParams.set("details", exchangeError?.message || "Exchange failed");
    return NextResponse.redirect(errorUrl);
  }

  const userId = exchangeData.user.id;
  const verifiedEmail = exchangeData.user.email?.trim().toLowerCase();

  // 1. Primary Check: Lookup admin profile by authenticated user UUID
  let { data: profile, error: profileError } = await (supabase as any)
    .from("admin_profiles")
    .select("id, role, full_name, email")
    .eq("id", userId)
    .single();

  // 2. Identity Mapping: If not found by ID, but verified Google email matches an existing admin profile
  // Securely update the admin profile ID to match the newly authenticated Supabase Auth UUID.
  // STRICT INVARIANT: Only permitted using server-verified email from exchangeData (never client input).
  if ((profileError || !profile) && verifiedEmail) {
    const adminClient = createAdminClient();
    if (adminClient) {
      const { data: existingProfile } = await (adminClient as any)
        .from("admin_profiles")
        .select("id, role, full_name, email")
        .ilike("email", verifiedEmail)
        .single();

      if (existingProfile) {
        const { data: updatedProfile, error: linkError } = await (adminClient as any)
          .from("admin_profiles")
          .update({ id: userId, updated_at: new Date().toISOString() })
          .eq("id", existingProfile.id)
          .select("id, role, full_name, email")
          .single();

        if (!linkError && updatedProfile) {
          profile = updatedProfile;
          profileError = null;
        }
      }
    }
  }

  // 3. Strict Authorization Verification: Profile must exist and possess an active admin role
  if (
    profileError ||
    !profile ||
    !ALLOWED_ADMIN_ROLES.includes(profile.role as AdminRole)
  ) {
    // Revoke the session immediately — authenticated user is NOT an authorized administrator
    await supabase.auth.signOut();
    const errorUrl = new URL("/login", origin);
    errorUrl.searchParams.set("error", "not_an_admin");
    const redirectRes = NextResponse.redirect(errorUrl);

    // Delete Supabase Auth cookies from response so unauthorized sessions are completely cleared
    const cookiesToClear = request.cookies.getAll();
    cookiesToClear.forEach((cookie) => {
      if (
        cookie.name.startsWith("sb-") ||
        cookie.name.includes("auth-token") ||
        cookie.name.includes("supabase")
      ) {
        redirectRes.cookies.delete(cookie.name);
      }
    });

    return redirectRes;
  }

  // 4. Authorized Administrator Confirmed. Redirect to destination!
  const successUrl = new URL(redirectTarget, origin);
  return NextResponse.redirect(successUrl);
}
