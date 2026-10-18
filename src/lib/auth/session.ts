import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getAppEnv } from "@/lib/env";
import { AdminRole, AdminUser } from "@/types";
import { MOCK_ADMIN_USER } from "@/lib/mock-data";

export const PREVIEW_SESSION_COOKIE = "sketch_preview_session";

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
        isAuthenticated: true,
        isAdmin: true,
        user: { ...MOCK_ADMIN_USER },
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

  // Always use getUser() on server (safe cryptographic JWT re-validation)
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return {
      isAuthenticated: false,
      isAdmin: false,
      user: null,
      error: "UNAUTHENTICATED",
    };
  }

  // 3. Verify user has an admin_profiles entry in PostgreSQL
  const { data: profile, error: profileError } = await (supabase as any)
    .from("admin_profiles")
    .select("id, email, full_name, role, avatar_url")
    .eq("id", authUser.id)
    .single();

  if (profileError || !profile) {
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
}
