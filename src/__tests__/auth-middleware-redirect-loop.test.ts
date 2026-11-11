import { describe, it, expect, beforeEach, vi } from "vitest";
import { updateSession } from "@/lib/supabase/middleware";
import { NextRequest } from "next/server";
import { resetAppEnvCache } from "@/lib/env";
import { PREVIEW_SESSION_COOKIE } from "@/lib/auth/constants";

describe("Middleware Authentication & Redirect Loop Invariants", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetAppEnvCache();
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe("Preview Mode", () => {
    beforeEach(() => {
      process.env.APP_MODE = "preview";
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    });

    it("does NOT auto-redirect to dashboard when visiting /login with an error parameter", async () => {
      const req = new NextRequest("http://localhost:3000/login?error=not_an_admin", {
        headers: {
          cookie: `${PREVIEW_SESSION_COOKIE}=mock-preview-session-token`,
        },
      });

      const res = await updateSession(req);
      // Status must not be a 307/308 redirect to /
      expect(res.status).not.toBe(307);
      expect(res.status).not.toBe(308);
      expect(res.headers.get("location")).toBeNull();
    });

    it("auto-redirects to dashboard when visiting /login without errors if session exists", async () => {
      const req = new NextRequest("http://localhost:3000/login", {
        headers: {
          cookie: `${PREVIEW_SESSION_COOKIE}=mock-preview-session-token`,
        },
      });

      const res = await updateSession(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe("http://localhost:3000/");
    });

    it("redirects unauthenticated user accessing protected route to /login", async () => {
      const req = new NextRequest("http://localhost:3000/events", {
        headers: {},
      });

      const res = await updateSession(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/login?redirect=%2Fevents");
    });
  });

  describe("Production Mode", () => {
    beforeEach(() => {
      process.env.APP_MODE = "production";
      process.env.NEXT_PUBLIC_APP_MODE = "production";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fvnkhzlbvxemwlkmwhbz.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    });

    it("strictly prevents redirect loop when navigating to /login?error=not_an_admin", async () => {
      const req = new NextRequest("http://localhost:3000/login?error=not_an_admin", {
        headers: {
          cookie: "sb-auth-token=active-token",
        },
      });

      const res = await updateSession(req);
      // Never redirect to / when error is present on login page
      expect(res.headers.get("location")).not.toBe("http://localhost:3000/");
    });

    it("exempts /api/cron/process-outbox from /login redirects so CRON_SECRET auth handles it", async () => {
      const postReq = new NextRequest("http://localhost:3000/api/cron/process-outbox", {
        method: "POST",
        headers: {
          authorization: "Bearer some-cron-secret",
        },
      });

      const postRes = await updateSession(postReq);
      expect(postRes.status).toBe(200);
      expect(postRes.headers.get("location")).toBeNull();

      const getReq = new NextRequest("http://localhost:3000/api/cron/process-outbox", {
        method: "GET",
      });

      const getRes = await updateSession(getReq);
      expect(getRes.status).toBe(200);
      expect(getRes.headers.get("location")).toBeNull();
    });
  });
});
