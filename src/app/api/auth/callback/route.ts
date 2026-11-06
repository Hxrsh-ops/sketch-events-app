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

  try {
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
      const errorMsg = exchangeError?.message || "User object missing from session";
      const status = (exchangeError as any)?.status;
      const isBackendDown =
        status === 502 ||
        status === 503 ||
        status === 504 ||
        errorMsg.toLowerCase().includes("fetch failed") ||
        errorMsg.toLowerCase().includes("enotfound") ||
        errorMsg.toLowerCase().includes("paused") ||
        errorMsg.toLowerCase().includes("network");

      console.error("[OAuth Callback] Session exchange failed:", {
        status,
        code: (exchangeError as any)?.code,
        message: errorMsg,
        endpoint: env.supabaseUrl ? new URL(env.supabaseUrl).origin : "missing",
        keyPrefix: env.supabaseAnonKey ? env.supabaseAnonKey.slice(0, 15) : "missing",
      });

      const errorUrl = new URL("/login", origin);
      errorUrl.searchParams.set("error", isBackendDown ? "backend_unavailable" : "auth_exchange_failed");
      errorUrl.searchParams.set("details", errorMsg);
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

    // Distinguish PostgreSQL connection failure/downtime from a missing profile record
    const isProfileConnectionError =
      profileError &&
      (profileError.code === "PGRST000" ||
        profileError.code === "08000" ||
        profileError.code === "08003" ||
        profileError.code === "08006" ||
        profileError.code === "503" ||
        profileError.message?.toLowerCase().includes("fetch failed") ||
        profileError.message?.toLowerCase().includes("network") ||
        profileError.message?.toLowerCase().includes("connection") ||
        profileError.message?.toLowerCase().includes("timeout") ||
        profileError.message?.toLowerCase().includes("paused"));

    if (isProfileConnectionError) {
      console.error("[OAuth Callback] Database connection error looking up admin profile:", {
        code: profileError.code,
        message: profileError.message,
      });
      // Do not mistake backend downtime for invalid credentials
      const errorUrl = new URL("/login", origin);
      errorUrl.searchParams.set("error", "backend_unavailable");
      errorUrl.searchParams.set("details", "Database error verifying administrator profile.");
      return NextResponse.redirect(errorUrl);
    }

    // 2. Identity Mapping: If not found by ID, but verified Google email matches an existing admin profile
    // Securely update the admin profile ID to match the newly authenticated Supabase Auth UUID.
    // STRICT INVARIANT: Only permitted using server-verified email from exchangeData (never client input).
    if (!profile && verifiedEmail) {
      const adminClient = createAdminClient();
      if (adminClient) {
        try {
          const { data: existingProfile, error: existingErr } = await (adminClient as any)
            .from("admin_profiles")
            .select("id, role, full_name, email")
            .ilike("email", verifiedEmail)
            .single();

          if (existingErr && existingErr.code !== "PGRST116") {
            console.warn("[OAuth Callback] Error during admin profile email lookup:", existingErr.message);
          }

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
            } else if (linkError) {
              console.error("[OAuth Callback] Failed to map authenticated UUID to admin profile:", linkError.message);
            }
          }
        } catch (adminClientErr) {
          console.warn("[OAuth Callback] Exception during identity mapping:", adminClientErr);
        }
      } else {
        console.warn(
          "[OAuth Callback] SUPABASE_SERVICE_ROLE_KEY is not configured on server. Skipping automatic email-to-auth ID mapping."
        );
      }
    }

    // 3. Strict Authorization Verification: Profile must exist and possess an active admin role
    if (
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
  } catch (err: any) {
    const errMessage = err?.message || String(err);
    const isNetworkOrDns =
      errMessage.toLowerCase().includes("fetch failed") ||
      errMessage.toLowerCase().includes("enotfound") ||
      errMessage.toLowerCase().includes("econnrefused") ||
      errMessage.toLowerCase().includes("etimedout") ||
      errMessage.toLowerCase().includes("network");

    console.error("[OAuth Callback] Unhandled callback exception:", {
      message: errMessage,
      isNetworkOrDns,
    });

    const errorUrl = new URL("/login", origin);
    errorUrl.searchParams.set(
      "error",
      isNetworkOrDns ? "backend_unavailable" : "auth_exchange_failed"
    );
    errorUrl.searchParams.set("details", errMessage);
    return NextResponse.redirect(errorUrl);
  }
}
