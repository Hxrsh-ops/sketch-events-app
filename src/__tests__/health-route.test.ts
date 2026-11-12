import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as healthHandler } from "@/app/api/health/route";
import { updateSession } from "@/lib/supabase/middleware";
import { resetAppEnvCache } from "@/lib/env";

describe("Production Health Endpoint (/api/health)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetAppEnvCache();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetAppEnvCache();
  });

  it("returns HTTP 200 with non-sensitive configuration flags and never exposes secrets", async () => {
    process.env.APP_MODE = "production";
    process.env.NEXT_PUBLIC_APP_MODE = "production";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fvnkhzlbvxemwlkmwhbz.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "super-secret-anon-token";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "super-secret-service-role";
    process.env.GOOGLE_CLIENT_ID = "794333775225-test.apps.googleusercontent.com";
    process.env.GOOGLE_CLIENT_SECRET = "GOCSPX-secret-value";
    process.env.CRON_SECRET = "prod-cron-secret-value";

    const res = await healthHandler();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");

    const rawText = await res.text();
    const json = JSON.parse(rawText);

    expect(json.status).toBe("ok");
    expect(json.mode).toBe("production");
    expect(json.supabaseConfigured).toBe(true);
    expect(json.googleOAuthMode).toBe("direct");
    expect(json.cronConfigured).toBe(true);

    // Must never leak URLs, keys, or secrets
    expect(rawText).not.toContain("fvnkhzlbvxemwlkmwhbz");
    expect(rawText).not.toContain("super-secret");
    expect(rawText).not.toContain("GOCSPX");
    expect(rawText).not.toContain("prod-cron-secret");
  });

  it("bypasses auth redirects in middleware even when unauthenticated", async () => {
    process.env.APP_MODE = "production";
    process.env.NEXT_PUBLIC_APP_MODE = "production";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fvnkhzlbvxemwlkmwhbz.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

    const req = new NextRequest("http://localhost:3000/api/health", { method: "GET" });
    const res = await updateSession(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });
});
