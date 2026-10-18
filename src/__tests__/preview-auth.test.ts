import { describe, it, expect, beforeEach } from "vitest";
import { POST as previewLoginHandler } from "@/app/api/auth/preview-login/route";
import { POST as previewLogoutHandler } from "@/app/api/auth/preview-logout/route";
import { PREVIEW_SESSION_COOKIE } from "@/lib/auth/session";
import { resetAppEnvCache } from "@/lib/env";
import { NextRequest } from "next/server";

describe("Slice 2.1: Preview Authentication Lifecycle & Security Gate", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetAppEnvCache();
    process.env = { ...originalEnv };
  });

  it("establishes an HTTP-only preview session cookie on preview login", async () => {
    process.env.APP_MODE = "preview";

    const req = new NextRequest("http://localhost:3000/api/auth/preview-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@sketch.org", role: "master_admin" }),
    });

    const response = await previewLoginHandler(req);
    expect(response.status).toBe(200);

    const setCookieHeader = response.headers.get("set-cookie");
    expect(setCookieHeader).toBeDefined();
    expect(setCookieHeader).toContain(PREVIEW_SESSION_COOKIE);
    expect(setCookieHeader).toContain("HttpOnly");
  });

  it("strictly forbids preview login when APP_MODE=production (returns 403)", async () => {
    process.env.APP_MODE = "production";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://sketch-actual-project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_token";

    const req = new NextRequest("http://localhost:3000/api/auth/preview-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "attacker@sketch.org" }),
    });

    const response = await previewLoginHandler(req);
    expect(response.status).toBe(403);

    const json = await response.json();
    expect(json.error).toBe("PREVIEW_AUTH_FORBIDDEN");
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
