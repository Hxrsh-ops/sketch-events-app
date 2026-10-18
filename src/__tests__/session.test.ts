import { describe, it, expect, beforeEach } from "vitest";
import { verifyAdminSession } from "@/lib/auth/session";
import { resetAppEnvCache } from "@/lib/env";
import { MOCK_ADMIN_USER } from "@/lib/mock-data";

describe("Slice 2: Session & Identity Verification Boundaries", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetAppEnvCache();
    process.env = { ...originalEnv };
  });

  it("requires explicit preview session cookie when application is running in preview mode", async () => {
    process.env.APP_MODE = "preview";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    // Without cookie present, verifyAdminSession returns unauthenticated
    const unauthedResult = await verifyAdminSession();
    expect(unauthedResult.isAuthenticated).toBe(false);
    expect(unauthedResult.isAdmin).toBe(false);
    expect(unauthedResult.user).toBeNull();
  });

  it("strictly fails unauthenticated requests in production mode when no session is present", async () => {
    process.env.APP_MODE = "production";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://sketch-actual-project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_token";

    // In a test environment without valid active cookies/session headers, it must report unauthenticated
    const result = await verifyAdminSession();
    expect(result.isAuthenticated).toBe(false);
    expect(result.isAdmin).toBe(false);
    expect(result.user).toBeNull();
  });
});
