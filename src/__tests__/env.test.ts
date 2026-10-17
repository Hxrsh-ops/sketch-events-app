import { describe, it, expect, beforeEach } from "vitest";
import {
  getAppEnv,
  resetAppEnvCache,
  isPreviewMode,
} from "@/lib/env";
import {
  getServerEnv,
  requireServerServiceRoleKey,
  resetServerEnvCache,
} from "@/lib/env.server";

describe("Environment & Security Configuration Guard", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetAppEnvCache();
    resetServerEnvCache();
    process.env = { ...originalEnv };
  });

  it("defaults to preview mode when Supabase variables are absent", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.APP_MODE;

    const env = getAppEnv();
    expect(env.mode).toBe("preview");
    expect(isPreviewMode()).toBe(true);
  });

  it("rejects invalid APP_MODE values with an explicit configuration error", () => {
    process.env.APP_MODE = "staging";

    expect(() => getAppEnv()).toThrowError(/Invalid APP_MODE "staging"/);
  });

  it("rejects arbitrary strings as APP_MODE", () => {
    process.env.APP_MODE = "development_unsupported";

    expect(() => getAppEnv()).toThrowError(/\[SKETCH CONFIG ERROR\]/);
  });

  it("throws a security violation when configured as production without credentials", () => {
    process.env.APP_MODE = "production";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    expect(() => getAppEnv()).toThrowError(/SKETCH SECURITY VIOLATION/);
  });

  it("throws a security violation when configured with placeholder template credentials in production", () => {
    process.env.APP_MODE = "production";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://your-project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "your-anon-key-here";

    expect(() => getAppEnv()).toThrowError(/SKETCH SECURITY VIOLATION/);
  });

  it("does NOT expose SUPABASE_SERVICE_ROLE_KEY or backend secrets on getAppEnv() client interface", () => {
    process.env.APP_MODE = "production";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://sketch-actual-project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_token";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "secret_service_role_key";
    process.env.RESEND_API_KEY = "re_secret_key";

    const env: any = getAppEnv();
    expect(env.supabaseServiceRoleKey).toBeUndefined();
    expect(env.resendApiKey).toBeUndefined();
    expect(env.mode).toBe("production");
    expect(env.supabaseUrl).toBe("https://sketch-actual-project.supabase.co");
    expect(env.supabaseAnonKey).toBe("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_token");
  });

  it("allows public-client production validation without requiring SUPABASE_SERVICE_ROLE_KEY", () => {
    process.env.APP_MODE = "production";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://sketch-actual-project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "valid_anon_token";
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Public client getAppEnv should not throw if only anon key is present
    const env = getAppEnv();
    expect(env.mode).toBe("production");
    expect(env.supabaseAnonKey).toBe("valid_anon_token");
  });

  it("exposes SUPABASE_SERVICE_ROLE_KEY through getServerEnv() on the server", () => {
    process.env.APP_MODE = "production";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://sketch-actual-project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "valid_anon_token";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "secret_service_role_key";

    const serverEnv = getServerEnv();
    expect(serverEnv.supabaseServiceRoleKey).toBe("secret_service_role_key");
  });

  it("validates service-role key presence strictly in requireServerServiceRoleKey() when in production", () => {
    process.env.APP_MODE = "production";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://sketch-actual-project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "valid_anon_token";
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(() => requireServerServiceRoleKey()).toThrowError(/SUPABASE_SERVICE_ROLE_KEY is required/);
  });

  it("returns service-role key from requireServerServiceRoleKey() when valid", () => {
    process.env.APP_MODE = "production";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://sketch-actual-project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "valid_anon_token";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "valid_service_role_key_prod";

    const key = requireServerServiceRoleKey();
    expect(key).toBe("valid_service_role_key_prod");
  });
});
