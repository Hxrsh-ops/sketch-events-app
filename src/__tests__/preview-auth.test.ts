import { describe, it, expect, beforeEach } from "vitest";
import { POST as previewLoginHandler } from "@/app/api/auth/preview-login/route";
import { POST as previewLogoutHandler } from "@/app/api/auth/preview-logout/route";
import { PREVIEW_SESSION_COOKIE } from "@/lib/auth/session";
import { resetAppEnvCache } from "@/lib/env";
import { NextRequest } from "next/server";

describe("Slice 2.1 & Production Hardening: Preview Authentication Deprecation & Security Gate", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetAppEnvCache();
    process.env = { ...originalEnv };
  });

  it("strictly rejects any preview login attempt with HTTP 403 Forbidden (no cookies set)", async () => {
    process.env.APP_MODE = "preview";

    const req = new NextRequest("http://localhost:3000/api/auth/preview-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@sketch.org", role: "master_admin" }),
    });

    const response = await previewLoginHandler();
    expect(response.status).toBe(403);

    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe("AUTH_BYPASS_DISABLED");

    const setCookieHeader = response.headers.get("set-cookie");
    expect(setCookieHeader).toBeNull();
  });

  it("strictly forbids preview login in production mode (returns 403)", async () => {
    process.env.APP_MODE = "production";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fvnkhzlbvxemwlkmwhbz.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "dummy-anon-key";

    const response = await previewLoginHandler();
    expect(response.status).toBe(403);

    const json = await response.json();
    expect(json.error).toBe("AUTH_BYPASS_DISABLED");
  });

  it("destroys preview session cookie with maxAge=0 on preview logout", async () => {
    const response = await previewLogoutHandler();
    expect(response.status).toBe(200);

    const setCookieHeader = response.headers.get("set-cookie");
    expect(setCookieHeader).toBeDefined();
    expect(setCookieHeader).toContain(PREVIEW_SESSION_COOKIE);
    expect(setCookieHeader).toContain("Max-Age=0");
  });
});
