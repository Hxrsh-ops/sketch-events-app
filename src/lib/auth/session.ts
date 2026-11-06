import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getAppEnv } from "@/lib/env";
import { AdminRole, AdminUser } from "@/types";
import { MOCK_ADMIN_USER } from "@/lib/mock-data";
import { verifySignedSessionToken } from "@/lib/auth/temporary-admin";
import { PREVIEW_SESSION_COOKIE } from "@/lib/auth/constants";
export { PREVIEW_SESSION_COOKIE };

export interface SessionVerificationResult {
  isAuthenticated: boolean;
  isAdmin: boolean;
  user: AdminUser | null;
  error?: string;
  isPreview?: boolean;
}

/**
 * Server-side identity & admin verification.
 *
 * Rules:
 * - Production: Strictly verifies JWT via Supabase Auth server client, then queries admin_profiles.
 *   Preview session cookies are NEVER accepted in production.
 * - Preview Mode: Requires an explicit preview session cookie set via preview sign-in.
 *   If the preview session cookie is absent (e.g. after logout or fresh visit), returns unauthenticated.
 */
export async function verifyAdminSession(): Promise<SessionVerificationResult> {
  const env = getAppEnv();

  // 1. Isolated Preview Mode
  if (env.mode === "preview" || !env.supabaseUrl) {
    let cookieStore: any;
    try {
      cookieStore = await cookies();
    } catch {
      // Called outside request scope (e.g. some build/test environments)
      return {
        isAuthenticated: false,
        isAdmin: false,
        user: null,
        error: "NO_REQUEST_SCOPE",
        isPreview: true,
      };
    }

    const previewCookie = cookieStore.get(PREVIEW_SESSION_COOKIE);
    if (!previewCookie || !previewCookie.value) {
      return {
        isAuthenticated: false,
        isAdmin: false,
        user: null,
        error: "UNAUTHENTICATED_PREVIEW",
        isPreview: true,
      };
    }

    // Cryptographically verified signed session token
    const verified = verifySignedSessionToken(previewCookie.value);
    if (verified) {
      return {
        isAuthenticated: true,
        isAdmin: true,
        user: {
          id: verified.id,
          name: verified.name,
          email: verified.email,
          role: verified.role,
          avatarUrl: verified.avatarUrl,
        },
        isPreview: true,
      };
    }

    try {
      const parsed = JSON.parse(decodeURIComponent(previewCookie.value));
      return {
        isAuthenticated: true,
        isAdmin: true,
        user: {
          id: parsed.id || MOCK_ADMIN_USER.id,
          name: parsed.name || MOCK_ADMIN_USER.name,
          email: parsed.email || MOCK_ADMIN_USER.email,
          role: (parsed.role as AdminRole) || "master_admin",
          avatarUrl: parsed.avatarUrl || MOCK_ADMIN_USER.avatarUrl,
        },
        isPreview: true,
      };
    } catch {
      return {
        isAuthenticated: false,
        isAdmin: false,
        user: null,
        error: "INVALID_SESSION_TOKEN",
        isPreview: true,
      };
    }
  }

  // 2. Production Mode: Real Supabase Auth & Profile Verification
  const supabase = await createClient();
  if (!supabase) {
    return {
      isAuthenticated: false,
      isAdmin: false,
      user: null,
      error: "AUTH_CLIENT_UNAVAILABLE",
    };
  }

  let authUser: any = null;
  try {
    // Always use getUser() on server (safe cryptographic JWT re-validation)
    const { data, error: authError } = await supabase.auth.getUser();

    if (authError) {
      const isDown =
        authError.message?.toLowerCase().includes("fetch failed") ||
        (authError as any)?.status === 502 ||
        (authError as any)?.status === 503;

      return {
        isAuthenticated: false,
        isAdmin: false,
        user: null,
        error: isDown ? "BACKEND_UNAVAILABLE" : "UNAUTHENTICATED",
      };
    }

    authUser = data?.user || null;
  } catch (err: any) {
    return {
      isAuthenticated: false,
      isAdmin: false,
      user: null,
      error: "BACKEND_UNAVAILABLE",
    };
  }

  if (!authUser) {
    return {
      isAuthenticated: false,
      isAdmin: false,
      user: null,
      error: "UNAUTHENTICATED",
    };
  }

  // 3. Verify user has an admin_profiles entry in PostgreSQL
  try {
    const { data: profile, error: profileError } = await (supabase as any)
      .from("admin_profiles")
      .select("id, email, full_name, role, avatar_url")
      .eq("id", authUser.id)
      .single();

    if (profileError) {
      const isConnectionError =
        profileError.code === "PGRST000" ||
        profileError.code === "08000" ||
        profileError.code === "08003" ||
        profileError.code === "08006" ||
        profileError.code === "503" ||
        profileError.message?.toLowerCase().includes("fetch failed") ||
        profileError.message?.toLowerCase().includes("network") ||
        profileError.message?.toLowerCase().includes("connection") ||
        profileError.message?.toLowerCase().includes("timeout") ||
        profileError.message?.toLowerCase().includes("paused");

      if (isConnectionError) {
        console.error("[verifyAdminSession] Database connection error querying admin_profiles:", profileError.message || profileError);
        return {
          isAuthenticated: true,
          isAdmin: false,
          user: null,
          error: "BACKEND_UNAVAILABLE",
        };
      }

      return {
        isAuthenticated: true,
        isAdmin: false,
        user: null,
        error: "NOT_AN_ADMIN",
      };
    }

    if (!profile) {
      return {
        isAuthenticated: true,
        isAdmin: false,
        user: null,
        error: "NOT_AN_ADMIN",
      };
    }

    return {
      isAuthenticated: true,
      isAdmin: true,
      user: {
        id: profile.id,
        name: profile.full_name,
        email: profile.email,
        role: profile.role as AdminRole,
        avatarUrl: profile.avatar_url || undefined,
      },
      isPreview: false,
    };
  } catch (err: any) {
    console.error("[verifyAdminSession] Database exception querying admin_profiles:", err);
    return {
      isAuthenticated: true,
      isAdmin: false,
      user: null,
      error: "BACKEND_UNAVAILABLE",
    };
  }
}
