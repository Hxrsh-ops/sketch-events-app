import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as googleInitiateHandler } from "@/app/api/auth/google/route";
import { GET as oauthCallbackHandler } from "@/app/api/auth/callback/route";
import * as serverModule from "@/lib/supabase/server";
import { resetAppEnvCache } from "@/lib/env";
import {
  GOOGLE_OAUTH_TX_COOKIE,
  createGoogleOAuthTxToken,
  sha256Hex,
  verifyGoogleOAuthTxToken,
} from "@/lib/auth/google-oauth";

describe("Direct Google OAuth Flow (No *.supabase.co Consent Redirect)", () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    resetAppEnvCache();
    process.env = {
      ...originalEnv,
      APP_MODE: "production",
      NEXT_PUBLIC_APP_MODE: "production",
      NEXT_PUBLIC_SUPABASE_URL: "https://fvnkhzlbvxemwlkmwhbz.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
      GOOGLE_CLIENT_ID: "794333775225-test.apps.googleusercontent.com",
      GOOGLE_CLIENT_SECRET: "GOCSPX-test-google-secret-value",
    };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
    resetAppEnvCache();
  });

  it("creates, verifies, and rejects tampered or expired transaction cookies", () => {
    const token = createGoogleOAuthTxToken({
      state: "state-123",
      rawNonce: "raw-nonce-xyz",
      redirectTarget: "/events",
    });

    const verified = verifyGoogleOAuthTxToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.state).toBe("state-123");
    expect(verified?.rawNonce).toBe("raw-nonce-xyz");
    expect(verified?.redirectTarget).toBe("/events");

    // Tampered payload must fail HMAC verification
    const [payload, sig] = token.split(".");
    expect(verifyGoogleOAuthTxToken(`${payload}x.${sig}`)).toBeNull();

    // Expired token must fail
    const expiredToken = createGoogleOAuthTxToken({
      state: "state-expired",
      rawNonce: "nonce-expired",
      redirectTarget: "/",
      ttlSeconds: -10,
    });
    expect(verifyGoogleOAuthTxToken(expiredToken)).toBeNull();
  });

  it("initiates direct Google OAuth pointing to /api/auth/callback without bouncing through supabase.co", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/google?redirect=/events", {
      method: "GET",
    });

    const res = await googleInitiateHandler(req);
    expect(res.status).toBe(307);

    const location = res.headers.get("location") || "";
    const authUrl = new URL(location);
    expect(authUrl.origin).toBe("https://accounts.google.com");
    expect(authUrl.pathname).toBe("/o/oauth2/v2/auth");
    expect(authUrl.searchParams.get("client_id")).toBe("794333775225-test.apps.googleusercontent.com");
    expect(authUrl.searchParams.get("redirect_uri")).toBe("http://localhost:3000/api/auth/callback");
    expect(location).not.toContain("supabase.co");

    // Must set HttpOnly transaction cookie containing rawNonce matching hashed nonce sent to Google
    const setCookie = res.headers.get("set-cookie") || "";
    expect(setCookie).toContain(`${GOOGLE_OAUTH_TX_COOKIE}=`);
    expect(setCookie.toLowerCase()).toContain("httponly");

    const cookieMatch = setCookie.match(new RegExp(`${GOOGLE_OAUTH_TX_COOKIE}=([^;]+)`));
    expect(cookieMatch).not.toBeNull();
    const tx = verifyGoogleOAuthTxToken(decodeURIComponent(cookieMatch![1]));
    expect(tx).not.toBeNull();
    expect(tx?.redirectTarget).toBe("/events");
    expect(authUrl.searchParams.get("state")).toBe(tx?.state);
    expect(authUrl.searchParams.get("nonce")).toBe(sha256Hex(tx!.rawNonce));
  });

  it("falls back to Supabase signInWithOAuth when direct Google credentials are not configured", async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET;

    const signInWithOAuthMock = vi.fn().mockResolvedValue({
      data: { url: "https://fvnkhzlbvxemwlkmwhbz.supabase.co/auth/v1/authorize?provider=google" },
      error: null,
    });
    vi.spyOn(serverModule, "createClient").mockResolvedValue({
      auth: { signInWithOAuth: signInWithOAuthMock },
    } as any);

    const req = new NextRequest("http://localhost:3000/api/auth/google?redirect=/studio", {
      method: "GET",
    });

    const res = await googleInitiateHandler(req);
    expect(res.status).toBe(307);
    expect(signInWithOAuthMock).toHaveBeenCalledTimes(1);
    expect(res.headers.get("location")).toContain("supabase.co/auth/v1/authorize");
  });

  it("exchanges Google code directly, signs in via Supabase signInWithIdToken with rawNonce, and redirects authorized admin", async () => {
    const state = "csrf-state-valid";
    const rawNonce = "raw-nonce-valid";
    const txToken = createGoogleOAuthTxToken({
      state,
      rawNonce,
      redirectTarget: "/events",
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id_token: "google-signed-jwt-id-token" }),
    });
    global.fetch = fetchMock as any;

    const signInWithIdTokenMock = vi.fn().mockResolvedValue({
      data: {
        user: { id: "praga-google-uuid", email: "praga104656@gmail.com" },
      },
      error: null,
    });

    const mockSupabase = {
      auth: {
        signInWithIdToken: signInWithIdTokenMock,
        signOut: vi.fn(),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: "praga-google-uuid",
                email: "praga104656@gmail.com",
                full_name: "Pragadeesh",
                role: "master_admin",
              },
              error: null,
            }),
          }),
        }),
      }),
    };

    vi.spyOn(serverModule, "createClient").mockResolvedValue(mockSupabase as any);

    const req = new NextRequest(
      `http://localhost:3000/api/auth/callback?code=google_auth_code_123&state=${state}`,
      {
        method: "GET",
        headers: {
          cookie: `${GOOGLE_OAUTH_TX_COOKIE}=${encodeURIComponent(txToken)}`,
        },
      }
    );

    const res = await oauthCallbackHandler(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/events");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("https://oauth2.googleapis.com/token");

    expect(signInWithIdTokenMock).toHaveBeenCalledWith({
      provider: "google",
      token: "google-signed-jwt-id-token",
      nonce: rawNonce,
    });

    // Transaction cookie must be cleared after completion
    const setCookie = res.headers.get("set-cookie") || "";
    expect(setCookie).toContain(GOOGLE_OAUTH_TX_COOKIE);
    expect(setCookie).toMatch(/Max-Age=0|expires=/i);
  });

  it("rejects mismatched OAuth state in callback and clears transaction cookie", async () => {
    const txToken = createGoogleOAuthTxToken({
      state: "expected-state",
      rawNonce: "raw-nonce",
      redirectTarget: "/events",
    });

    vi.spyOn(serverModule, "createClient").mockResolvedValue({
      auth: { signInWithIdToken: vi.fn(), signOut: vi.fn() },
    } as any);

    const req = new NextRequest(
      "http://localhost:3000/api/auth/callback?code=google_auth_code_123&state=attacker-state",
      {
        method: "GET",
        headers: {
          cookie: `${GOOGLE_OAUTH_TX_COOKIE}=${encodeURIComponent(txToken)}`,
        },
      }
    );

    const res = await oauthCallbackHandler(req);
    expect(res.status).toBe(307);
    const location = res.headers.get("location") || "";
    expect(location).toContain("/login");
    expect(location).toContain("error=auth_exchange_failed");

    const setCookie = res.headers.get("set-cookie") || "";
    expect(setCookie).toContain(GOOGLE_OAUTH_TX_COOKIE);
    expect(setCookie).toMatch(/Max-Age=0|expires=/i);
  });

  it("revokes session and clears all cookies when direct Google user is not in admin_profiles", async () => {
    const state = "csrf-state-unauth";
    const rawNonce = "raw-nonce-unauth";
    const txToken = createGoogleOAuthTxToken({
      state,
      rawNonce,
      redirectTarget: "/",
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id_token: "google-jwt-non-admin" }),
    }) as any;

    const signOutMock = vi.fn().mockResolvedValue({ error: null });
    const mockSupabase = {
      auth: {
        signInWithIdToken: vi.fn().mockResolvedValue({
          data: {
            user: { id: "random-google-uuid", email: "stranger@gmail.com" },
          },
          error: null,
        }),
        signOut: signOutMock,
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116", message: "No rows" } }),
          }),
        }),
      }),
    };

    vi.spyOn(serverModule, "createClient").mockResolvedValue(mockSupabase as any);
    vi.spyOn(serverModule, "createAdminClient").mockReturnValue(null);

    const req = new NextRequest(
      `http://localhost:3000/api/auth/callback?code=google_code&state=${state}`,
      {
        method: "GET",
        headers: {
          cookie: `${GOOGLE_OAUTH_TX_COOKIE}=${encodeURIComponent(txToken)}; sb-fvnkhzlbvxemwlkmwhbz-auth-token=tok`,
        },
      }
    );

    const res = await oauthCallbackHandler(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login?error=not_an_admin");
    expect(signOutMock).toHaveBeenCalledTimes(1);

    const setCookie = res.headers.get("set-cookie") || "";
    expect(setCookie).toContain("sb-fvnkhzlbvxemwlkmwhbz-auth-token");
    expect(setCookie).toContain(GOOGLE_OAUTH_TX_COOKIE);
  });
});
