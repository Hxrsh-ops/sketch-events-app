import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  validateTemporaryAdminCredentials,
  createSignedSessionToken,
  verifySignedSessionToken,
  resetRateLimits,
  isTemporaryAdminEnabled,
  getTemporaryAdminUsername,
} from "@/lib/auth/temporary-admin";
import { POST as previewLoginPost } from "@/app/api/auth/preview-login/route";
import { POST as previewLogoutPost } from "@/app/api/auth/preview-logout/route";
import { PREVIEW_SESSION_COOKIE } from "@/lib/auth/session";
import { resetAppEnvCache } from "@/lib/env";
import { AdminUser } from "@/types";

describe("Production Authentication Security: Elimination of Temporary Admin Bypass", () => {
  beforeEach(() => {
    resetRateLimits();
    resetAppEnvCache();
    delete process.env.APP_MODE;
    delete process.env.NEXT_PUBLIC_APP_MODE;
    delete process.env.TEMPORARY_ADMIN_ENABLED;
    delete process.env.TEMPORARY_ADMIN_USERNAME;
    delete process.env.TEMPORARY_ADMIN_PASSWORD;
  });

  it("1. Temporary admin authentication is permanently disabled", () => {
    expect(isTemporaryAdminEnabled()).toBe(false);

    // Setting the old opt-in flag still yields false
    process.env.TEMPORARY_ADMIN_ENABLED = "true";
    expect(isTemporaryAdminEnabled()).toBe(false);
  });

  it("2. No default hardcoded credentials exist", () => {
    expect(getTemporaryAdminUsername()).toBe("");
  });

  it("3. validateTemporaryAdminCredentials strictly rejects all inputs with DISABLED", () => {
    // Former placeholder credentials
    const res1 = validateTemporaryAdminCredentials("SKETCHADMIN", "SKETCHHUB2026", "test-ip-1");
    expect(res1.success).toBe(false);
    expect(res1.error).toBe("DISABLED");
    expect(res1.message).toContain("permanently disabled");

    // Lowercase
    const res2 = validateTemporaryAdminCredentials("sketchadmin", "any-password", "test-ip-1");
    expect(res2.success).toBe(false);
    expect(res2.error).toBe("DISABLED");

    // Random credentials
    const res3 = validateTemporaryAdminCredentials("admin@sketch.org", "Pass123!", "test-ip-2");
    expect(res3.success).toBe(false);
    expect(res3.error).toBe("DISABLED");
  });

  it("4. Cryptographic session signing and tampering resistance remains intact", () => {
    const user: AdminUser = {
      id: "3c3f407e-9c73-4b2f-9b97-22c3e0afedca",
      name: "Lead Admin",
      email: "lead@sketch.org",
      role: "master_admin",
    };

    const validToken = createSignedSessionToken(user, 3600);
    expect(validToken).toContain(".");

    // Valid token verifies successfully
    const verified = verifySignedSessionToken(validToken);
    expect(verified).not.toBeNull();
    expect(verified?.id).toBe(user.id);
    expect(verified?.role).toBe(user.role);

    // Tampered payload is rejected
    const [payload, sig] = validToken.split(".");
    const tamperedPayload = Buffer.from(
      JSON.stringify({ ...user, role: "super_attacker" })
    ).toString("base64url");
    const tamperedToken = `${tamperedPayload}.${sig}`;

    expect(verifySignedSessionToken(tamperedToken)).toBeNull();

    // Malformed token is rejected
    expect(verifySignedSessionToken("random-string-without-signature")).toBeNull();
    expect(verifySignedSessionToken("")).toBeNull();

    // Expired token is rejected
    const expiredToken = createSignedSessionToken(user, -10); // Expired 10s ago
    expect(verifySignedSessionToken(expiredToken)).toBeNull();
  });

  it("5. API route /api/auth/preview-login strictly returns HTTP 403 Forbidden without setting cookies", async () => {
    const res = await previewLoginPost();
    expect(res.status).toBe(403);

    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe("AUTH_BYPASS_DISABLED");

    const setCookie = res.cookies.get(PREVIEW_SESSION_COOKIE);
    expect(setCookie).toBeUndefined();
  });

  it("6. API route /api/auth/preview-logout terminates session and clears cookie", async () => {
    const res = await previewLogoutPost();
    expect(res.status).toBe(200);

    const setCookie = res.cookies.get(PREVIEW_SESSION_COOKIE);
    expect(setCookie).toBeDefined();
    expect(setCookie?.value).toBe("");
    expect(setCookie?.maxAge).toBe(0);
  });
});
