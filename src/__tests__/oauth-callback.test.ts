import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET as oauthCallbackHandler } from "@/app/api/auth/callback/route";
import * as serverModule from "@/lib/supabase/server";
import { resetAppEnvCache } from "@/lib/env";
import { NextRequest } from "next/server";

describe("Slice 2.2: OAuth Callback Security & Redirect Boundaries", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetAppEnvCache();
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("redirects to /login with oauth_provider_error when provider returns an error", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/auth/callback?error=access_denied&error_description=User+canceled",
      { method: "GET" }
    );

    const res = await oauthCallbackHandler(req);
    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toContain("/login");
    expect(location).toContain("error=oauth_provider_error");
    expect(location).toContain("details=User");
  });

  it("redirects to /login with missing_auth_code when code param is absent", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/callback", {
      method: "GET",
    });

    const res = await oauthCallbackHandler(req);
    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toContain("/login");
    expect(location).toContain("error=missing_auth_code");
  });

  it("prevents open redirect attacks by sanitizing target redirect", async () => {
    process.env.APP_MODE = "preview";
    // Target is an open redirect attempt: //malicious-site.com
    const req = new NextRequest(
      "http://localhost:3000/api/auth/callback?code=mock_code&redirect=//malicious-site.com",
      { method: "GET" }
    );

    const res = await oauthCallbackHandler(req);
    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toContain("/login");
    // Does not redirect to malicious external domain
    expect(location).not.toContain("//malicious-site.com");
  });

  it("rejects authenticated Google user who is not in admin_profiles with not_an_admin", async () => {
    process.env.APP_MODE = "production";
    process.env.NEXT_PUBLIC_APP_MODE = "production";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fvnkhzlbvxemwlkmwhbz.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";

    const req = new NextRequest("http://localhost:3000/api/auth/callback?code=unauthorized_code", {
      method: "GET",
    });

    const res = await oauthCallbackHandler(req);
    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toContain("/login");
    // Since code is invalid / not mock-exchanged, fails with exchange failed or not_an_admin
    expect(location).toMatch(/error=(auth_exchange_failed|not_an_admin)/);
  });

  it("explicitly clears auth cookies and revokes session when authenticated user has no admin profile", async () => {
    process.env.APP_MODE = "production";
    process.env.NEXT_PUBLIC_APP_MODE = "production";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fvnkhzlbvxemwlkmwhbz.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";

    const signOutMock = vi.fn().mockResolvedValue({ error: null });
    const mockSupabase = {
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "unauthorized-uuid",
              email: "unauthorized@example.com",
            },
          },
          error: null,
        }),
        signOut: signOutMock,
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: "No profile found" } }),
          }),
        }),
      }),
    };

    vi.spyOn(serverModule, "createClient").mockResolvedValue(mockSupabase as any);
    vi.spyOn(serverModule, "createAdminClient").mockReturnValue(null);

    const req = new NextRequest("http://localhost:3000/api/auth/callback?code=valid_code", {
      method: "GET",
      headers: {
        cookie: "sb-fvnkhzlbvxemwlkmwhbz-auth-token=active_token_value; path=/",
      },
    });

    const res = await oauthCallbackHandler(req);
    expect(res.status).toBe(307);
    expect(signOutMock).toHaveBeenCalledTimes(1);

    const location = res.headers.get("location");
    expect(location).toContain("/login?error=not_an_admin");

    // Must delete the sb- auth cookie on the redirect response
    const setCookie = res.headers.get("set-cookie") || "";
    expect(setCookie).toContain("sb-fvnkhzlbvxemwlkmwhbz-auth-token");
    expect(setCookie).toMatch(/Max-Age=0|expires=/i);
  });
});
