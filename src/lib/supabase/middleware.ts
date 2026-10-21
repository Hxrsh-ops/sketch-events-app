import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getAppEnv } from "@/lib/env";
import { PREVIEW_SESSION_COOKIE } from "@/lib/auth/constants";

/**
 * Validates that redirect destination is a relative path to prevent open redirects.
 */
function sanitizeRedirect(dest: string | null): string {
  if (!dest) return "/";
  // Must start with '/' and must not start with '//' (protocol-relative URLs)
  if (dest.startsWith("/") && !dest.startsWith("//")) {
    return dest;
  }
  return "/";
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isLoginPage = pathname === "/login";
  const isPublicRoute =
    pathname.startsWith("/e/") ||
    pathname.startsWith("/api/public") ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/sketch-logo.png") ||
    pathname.startsWith("/assets/") ||
    pathname.includes(".");

  const env = getAppEnv();

  // ----------------------------------------------------------------------------
  // 1. PREVIEW MODE INTERCEPTION
  // ----------------------------------------------------------------------------
  if (env.mode === "preview" || !env.supabaseUrl || !env.supabaseAnonKey) {
    const previewCookie = request.cookies.get(PREVIEW_SESSION_COOKIE);
    const hasPreviewSession = Boolean(previewCookie && previewCookie.value);

    // If unauthenticated in preview and trying to access an admin route, redirect to login
    if (!hasPreviewSession && !isLoginPage && !isPublicRoute) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("redirect", pathname);
      const redirectResponse = NextResponse.redirect(loginUrl);
      redirectResponse.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
      return redirectResponse;
    }

    // If already authenticated in preview and visiting login page, redirect to dashboard
    if (hasPreviewSession && isLoginPage) {
      const redirectParam = sanitizeRedirect(request.nextUrl.searchParams.get("redirect"));
      const dashUrl = request.nextUrl.clone();
      dashUrl.pathname = redirectParam;
      dashUrl.searchParams.delete("redirect");
      return NextResponse.redirect(dashUrl);
    }

    const response = NextResponse.next();
    if (!isPublicRoute && !isLoginPage) {
      // Sensitive admin pages must never be cached by browser history / bfcache
      response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      response.headers.set("Pragma", "no-cache");
      response.headers.set("Expires", "0");
    }
    return response;
  }

  // ----------------------------------------------------------------------------
  // 2. PRODUCTION MODE (SUPABASE AUTH) INTERCEPTION
  // ----------------------------------------------------------------------------
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Always re-validate the auth token cryptographically on server
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If unauthenticated in production and accessing admin route, redirect to login
  if (!user && !isLoginPage && !isPublicRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", pathname);
    const redirectResponse = NextResponse.redirect(loginUrl);
    redirectResponse.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
    return redirectResponse;
  }

  // If already authenticated and visiting login page, redirect to dashboard
  if (user && isLoginPage) {
    const redirectParam = sanitizeRedirect(request.nextUrl.searchParams.get("redirect"));
    const dashUrl = request.nextUrl.clone();
    dashUrl.pathname = redirectParam;
    dashUrl.searchParams.delete("redirect");
    return NextResponse.redirect(dashUrl);
  }

  // For protected admin routes, add no-store cache controls
  if (!isPublicRoute && !isLoginPage) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }

  return response;
}
