import { NextRequest, NextResponse } from "next/server";
import { getAppEnv } from "@/lib/env";
import { sanitizeInternalRedirect } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";
import {
  GOOGLE_OAUTH_TX_COOKIE,
  GOOGLE_OAUTH_TX_TTL_SECONDS,
  buildGoogleAuthorizationUrl,
  createGoogleOAuthTxToken,
  generateGoogleOAuthSecrets,
  getGoogleOAuthConfig,
} from "@/lib/auth/google-oauth";

/**
 * Initiates Google OAuth directly from the application's own origin when
 * GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET (or SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET)
 * are configured, ensuring Google's consent screen displays the app's own domain
 * rather than `<project-ref>.supabase.co`.
 *
 * Falls back cleanly to standard Supabase OAuth if direct client credentials are absent.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const rawRedirect = searchParams.get("redirect");
  const redirectTarget = sanitizeInternalRedirect(rawRedirect, "/");

  const env = getAppEnv();
  if (env.mode === "preview" || !env.supabaseUrl || !env.supabaseAnonKey) {
    const errorUrl = new URL("/login", origin);
    errorUrl.searchParams.set("error", "preview_oauth_unsupported");
    return NextResponse.redirect(errorUrl);
  }

  const callbackUrl = new URL("/api/auth/callback", origin);
  const googleConfig = getGoogleOAuthConfig();

  // Preferred Path (Option B): Direct Google OAuth -> /api/auth/callback -> Supabase signInWithIdToken
  if (googleConfig.isConfigured && googleConfig.clientId) {
    const { state, rawNonce, hashedNonce } = generateGoogleOAuthSecrets();
    const txToken = createGoogleOAuthTxToken({
      state,
      rawNonce,
      redirectTarget,
    });

    const authUrl = buildGoogleAuthorizationUrl({
      clientId: googleConfig.clientId,
      redirectUri: callbackUrl.toString(),
      state,
      hashedNonce,
    });

    const response = NextResponse.redirect(authUrl);
    response.cookies.set(GOOGLE_OAUTH_TX_COOKIE, txToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: origin.startsWith("https://"),
      path: "/",
      maxAge: GOOGLE_OAUTH_TX_TTL_SECONDS,
    });
    return response;
  }

  // Fallback Path: Standard Supabase PKCE OAuth when direct Google credentials are not configured
  try {
    const supabase = await createClient();
    if (!supabase) {
      const errorUrl = new URL("/login", origin);
      errorUrl.searchParams.set("error", "auth_client_unavailable");
      return NextResponse.redirect(errorUrl);
    }

    if (redirectTarget !== "/") {
      callbackUrl.searchParams.set("redirect", redirectTarget);
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl.toString(),
        queryParams: {
          access_type: "offline",
          prompt: "select_account",
        },
      },
    });

    if (error || !data?.url) {
      const errorMsg = error?.message || "Failed to initialize Google OAuth.";
      const isBackendDown =
        errorMsg.toLowerCase().includes("fetch failed") ||
        errorMsg.toLowerCase().includes("paused") ||
        errorMsg.toLowerCase().includes("network") ||
        errorMsg.toLowerCase().includes("503");

      const errorUrl = new URL("/login", origin);
      errorUrl.searchParams.set("error", isBackendDown ? "backend_unavailable" : "oauth_provider_error");
      errorUrl.searchParams.set("details", errorMsg);
      return NextResponse.redirect(errorUrl);
    }

    return NextResponse.redirect(data.url);
  } catch (err: any) {
    const errorUrl = new URL("/login", origin);
    errorUrl.searchParams.set("error", "oauth_provider_error");
    errorUrl.searchParams.set("details", err?.message || "Google OAuth initialization failed.");
    return NextResponse.redirect(errorUrl);
  }
}
