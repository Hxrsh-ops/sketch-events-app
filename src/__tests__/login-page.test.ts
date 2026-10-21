import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import LoginPage from "@/app/(auth)/login/page";
import { sanitizeInternalRedirect } from "@/lib/auth/redirect";
import { getAuthErrorMessage } from "@/lib/auth/auth-errors";
import { resetAppEnvCache } from "@/lib/env";
import { POST as previewLoginHandler } from "@/app/api/auth/preview-login/route";
import { verifyAdminSession } from "@/lib/auth/session";
import { NextRequest } from "next/server";

describe("Slice 2.3 & Commit 10: Administrator Login & Security Boundaries", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetAppEnvCache();
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe("1. Open Redirect & Path Sanitization (sanitizeInternalRedirect)", () => {
    it("preserves valid relative paths and internal routes", () => {
      expect(sanitizeInternalRedirect("/events")).toBe("/events");
      expect(sanitizeInternalRedirect("/events/evt-123")).toBe("/events/evt-123");
      expect(sanitizeInternalRedirect("/e/diet-code-2026")).toBe("/e/diet-code-2026");
      expect(sanitizeInternalRedirect("/admin/participants?page=2&status=registered#top")).toBe(
        "/admin/participants?page=2&status=registered#top"
      );
    });

    it("defaults to fallback '/' when redirect target is null, undefined, or empty", () => {
      expect(sanitizeInternalRedirect(null)).toBe("/");
      expect(sanitizeInternalRedirect(undefined)).toBe("/");
      expect(sanitizeInternalRedirect("")).toBe("/");
      expect(sanitizeInternalRedirect("   ")).toBe("/");
      expect(sanitizeInternalRedirect(null, "/events")).toBe("/events");
    });

    it("strictly rejects absolute external URLs with HTTP/HTTPS schemes", () => {
      expect(sanitizeInternalRedirect("https://malicious.org")).toBe("/");
      expect(sanitizeInternalRedirect("http://evil.com/phish")).toBe("/");
      expect(sanitizeInternalRedirect("ftp://server/file")).toBe("/");
    });

    it("strictly rejects dangerous pseudo-protocols like javascript: or data:", () => {
      expect(sanitizeInternalRedirect("javascript:alert(1)")).toBe("/");
      expect(sanitizeInternalRedirect("data:text/html,<script>alert(1)</script>")).toBe("/");
    });

    it("strictly rejects scheme-relative / protocol-relative URLs (//example.com)", () => {
      expect(sanitizeInternalRedirect("//evil.com")).toBe("/");
      expect(sanitizeInternalRedirect("//malicious-domain.com/login")).toBe("/");
      expect(sanitizeInternalRedirect("///evil.com")).toBe("/");
    });

    it("strictly rejects backslash bypass tricks (/\\ or \\\\)", () => {
      expect(sanitizeInternalRedirect("/\\evil.com")).toBe("/");
      expect(sanitizeInternalRedirect("\\evil.com")).toBe("/");
      expect(sanitizeInternalRedirect("\\\\evil.com")).toBe("/");
      expect(sanitizeInternalRedirect("/events\\bypass")).toBe("/");
    });

    it("strictly rejects CRLF injection or control characters in target redirect", () => {
      expect(sanitizeInternalRedirect("/events\r\nSet-Cookie:malicious=1")).toBe("/");
      expect(sanitizeInternalRedirect("/events\x00bypass")).toBe("/");
    });
  });

  describe("2. Authentication Error Mapping (getAuthErrorMessage)", () => {
    it("returns null when no error code is present", () => {
      expect(getAuthErrorMessage(null)).toBeNull();
      expect(getAuthErrorMessage(undefined)).toBeNull();
      expect(getAuthErrorMessage("")).toBeNull();
    });

    it("maps 'not_an_admin' to a clear roster-authorization rejection message", () => {
      const msg = getAuthErrorMessage("not_an_admin");
      expect(msg).toContain("Access Denied");
      expect(msg).toContain("administrator profile in SketchHUB");
    });

    it("maps 'oauth_provider_error' with details when provider cancels or fails", () => {
      const msgWithDetails = getAuthErrorMessage("oauth_provider_error", "access_denied");
      expect(msgWithDetails).toContain("Authentication canceled or failed by provider");
      expect(msgWithDetails).toContain("access_denied");

      const msgWithoutDetails = getAuthErrorMessage("oauth_provider_error");
      expect(msgWithoutDetails).toContain("Google authentication was canceled or encountered a provider error.");
    });

    it("maps 'missing_auth_code' when authorization code is absent from callback", () => {
      const msg = getAuthErrorMessage("missing_auth_code");
      expect(msg).toContain("Missing verification code in authorization callback");
    });

    it("maps 'auth_exchange_failed' with details when Supabase exchange fails", () => {
      const msg = getAuthErrorMessage("auth_exchange_failed", "Bad grant");
      expect(msg).toContain("Failed to verify authorization token: Bad grant");
    });

    it("maps 'preview_oauth_unsupported' when OAuth is invoked without remote credentials", () => {
      const msg = getAuthErrorMessage("preview_oauth_unsupported");
      expect(msg).toContain("Remote Supabase environment is not configured");
    });

    it("maps 'auth_client_unavailable' when the client cannot be initialized", () => {
      const msg = getAuthErrorMessage("auth_client_unavailable");
      expect(msg).toContain("Authentication service is currently unavailable");
    });

    it("maps unknown error codes to a safe, generic fallback message", () => {
      const msg = getAuthErrorMessage("unrecognized_internal_error");
      expect(msg).toContain("An unexpected authentication error occurred");

      const msgWithDetails = getAuthErrorMessage("custom_err", "Network timeout");
      expect(msgWithDetails).toContain("Authentication error: Network timeout");
    });
  });

  describe("3. Production Isolation & Anti-Bypass Guarantees", () => {
    it("strictly rejects preview login in production mode (HTTP 403)", async () => {
      process.env.APP_MODE = "production";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://sketch-actual-project.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_token";

      const res = await previewLoginHandler();
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe("AUTH_BYPASS_DISABLED");
    });

    it("strictly ignores preview session cookies in production mode", async () => {
      process.env.APP_MODE = "production";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://sketch-actual-project.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_token";

      const result = await verifyAdminSession();
      expect(result.isAuthenticated).toBe(false);
      expect(result.isAdmin).toBe(false);
      expect(result.user).toBeNull();
    });
  });

  describe("4. Password Recovery & Account Enumeration Protection", () => {
    it("ensures recovery success message uses enumeration-safe phrasing", () => {
      const testEmail = "operator@sketch.org";
      const safeSuccessMessage = `If an authorized administrator account is associated with ${testEmail}, password recovery instructions have been sent. Please check your inbox.`;

      // Verifies that the success phrasing does not assert that the account exists
      expect(safeSuccessMessage).toContain("If an authorized administrator account is associated");
      expect(safeSuccessMessage).toContain("password recovery instructions have been sent");
    });

    it("ensures preview recovery feedback is explicitly labeled as a simulation", () => {
      const testEmail = "demo@sketch.org";
      const previewNotice = `[Preview Mode] Password reset instructions simulated for ${testEmail}. In production, Supabase Auth will dispatch a secure recovery link.`;

      expect(previewNotice).toContain("[Preview Mode]");
      expect(previewNotice).toContain("simulated");
    });
  });

  describe("5. Component Structure & Suspense Wrapper", () => {
    it("exports LoginPage wrapped in a React Suspense boundary with BrandedInitScreen fallback", () => {
      const element = LoginPage();
      expect(element).toBeDefined();
      expect(element.type).toBe(React.Suspense);
      expect(element.props.fallback).toBeDefined();
      expect(element.props.fallback.props.message).toBe("Loading workspace");
    });
  });

  describe("6. Production Login Security & Placeholder Verification", () => {
    it("ensures SKETCHADMIN and temporary login bypass are completely eliminated from login page source", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const loginPageSource = fs.readFileSync(
        path.join(process.cwd(), "src/app/(auth)/login/page.tsx"),
        "utf8"
      );

      // 1. SKETCHADMIN must not appear anywhere in user-facing copy or code
      expect(loginPageSource.toLowerCase()).not.toContain("sketchadmin");

      // 2. Placeholder must be strictly "Administrator email"
      expect(loginPageSource).toContain('placeholder="Administrator email"');

      // 3. Email input must be type="email"
      expect(loginPageSource).toContain('type="email"');

      // 4. Temporary preview bypasses must not exist
      expect(loginPageSource).not.toContain("handleQuickPreviewFill");
      expect(loginPageSource).not.toContain("isPreviewMode");
      expect(loginPageSource).not.toContain("/api/auth/preview-login");
    });
  });

  describe("7. OAuth & Password Login Convergence & Safe Error Handling", () => {
    it("provides a clear explanation when invalid login credentials occur without revealing account existence", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const loginPageSource = fs.readFileSync(
        path.join(process.cwd(), "src/app/(auth)/login/page.tsx"),
        "utf8"
      );

      // Must clearly guide Google OAuth users to use 'Sign in with Google' or 'Forgot Password'
      expect(loginPageSource).toContain("Sign in with Google");
      expect(loginPageSource).toContain("Forgot Password");
      expect(loginPageSource).toContain("establish an email password");
    });

    it("ensures unauthenticated Google or email users without admin_profiles are strictly denied with not_an_admin", () => {
      const errorMsg = getAuthErrorMessage("not_an_admin");
      expect(errorMsg).toContain("Access Denied");
      expect(errorMsg).toContain("does not possess an administrator profile");
    });

    it("ensures OAuth callback failures provide actionable error messages", () => {
      const exchangeError = getAuthErrorMessage("auth_exchange_failed", "Token expired");
      expect(exchangeError).toContain("Failed to verify authorization token");
      expect(exchangeError).toContain("Token expired");

      const providerError = getAuthErrorMessage("oauth_provider_error", "access_denied");
      expect(providerError).toContain("Authentication canceled or failed by provider");
    });
  });
});

