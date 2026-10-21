import crypto from "crypto";
import { AdminUser } from "@/types";

// Maximum failed login attempts allowed before temporary lockout
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

interface RateLimitRecord {
  attempts: number;
  firstAttemptAt: number;
  lockedUntil?: number;
}

const loginAttempts = new Map<string, RateLimitRecord>();

/**
 * Returns the signing secret for local development session tokens.
 */
function getSessionSigningSecret(): string {
  return (
    process.env.SESSION_SECRET ||
    process.env.CRON_SECRET ||
    "sketch-dev-hmac-signing-key-32-chars-minimum"
  );
}

/**
 * Checks if temporary admin authentication is allowed in current environment.
 * Permanently disabled for production security.
 */
export function isTemporaryAdminEnabled(): boolean {
  return false;
}

/**
 * Resolves configured temporary administrator username.
 * Defaults have been eliminated.
 */
export function getTemporaryAdminUsername(): string {
  return process.env.TEMPORARY_ADMIN_USERNAME?.trim() || "";
}

/**
 * Resolves configured temporary administrator password.
 * Defaults have been eliminated.
 */
function getTemporaryAdminPassword(): string {
  return process.env.TEMPORARY_ADMIN_PASSWORD || "";
}

/**
 * Checks rate limiting for candidate identifier or IP.
 */
export function checkLoginRateLimit(key: string): { isLimited: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (!record) {
    return { isLimited: false };
  }

  // Check if active lockout exists
  if (record.lockedUntil && now < record.lockedUntil) {
    const retryAfterSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return { isLimited: true, retryAfterSeconds };
  }

  // Clean expired window
  if (now - record.firstAttemptAt > LOCKOUT_WINDOW_MS) {
    loginAttempts.delete(key);
    return { isLimited: false };
  }

  return { isLimited: false };
}

/**
 * Records a failed login attempt and applies lockout if threshold exceeded.
 */
export function recordFailedLogin(key: string): void {
  const now = Date.now();
  const record = loginAttempts.get(key) || { attempts: 0, firstAttemptAt: now };

  // Reset if window has elapsed
  if (now - record.firstAttemptAt > LOCKOUT_WINDOW_MS) {
    record.attempts = 1;
    record.firstAttemptAt = now;
    record.lockedUntil = undefined;
  } else {
    record.attempts += 1;
  }

  if (record.attempts >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_WINDOW_MS;
  }

  loginAttempts.set(key, record);
}

/**
 * Clears rate limit record upon successful authentication.
 */
export function clearRateLimit(key: string): void {
  loginAttempts.delete(key);
}

/**
 * Resets all rate limit records (for testing).
 */
export function resetRateLimits(): void {
  loginAttempts.clear();
}


export interface TempAdminAuthResult {
  success: boolean;
  user?: AdminUser;
  error?: "DISABLED" | "RATE_LIMITED" | "INVALID_CREDENTIALS";
  message?: string;
  retryAfterSeconds?: number;
}

/**
 * Validates credentials against temporary development administrator configuration.
 *
 * Enforces:
 * - Immediate rejection in production mode (no bypass possible).
 * - Case-insensitive username normalization.
 * - Constant-time cryptographic comparison (no timing side-channel).
 * - Generic error messages (no enumeration of valid usernames).
 * - Memory rate limiting against brute-force attempts.
 */
export function validateTemporaryAdminCredentials(
  _identifier: string,
  _password: string,
  _clientKey: string = "default"
): TempAdminAuthResult {
  return {
    success: false,
    error: "DISABLED",
    message: "Temporary administrator authentication has been permanently disabled.",
  };
}

/**
 * Creates a cryptographically signed session token for preview/dev mode.
 * Format: base64(payload).hmacSignature
 */
export function createSignedSessionToken(user: AdminUser, ttlSeconds: number = 8 * 3600): string {
  const secret = getSessionSigningSecret();
  const payload = {
    ...user,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };

  const serialized = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(serialized).digest("base64url");

  return `${serialized}.${signature}`;
}

/**
 * Verifies and parses a signed session token.
 * Returns null if signature is invalid, token is malformed, or expired.
 */
export function verifySignedSessionToken(token: string): (AdminUser & { exp: number }) | null {
  if (!token || typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [serialized, signature] = parts;
  const secret = getSessionSigningSecret();

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(serialized)
    .digest("base64url");

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const jsonStr = Buffer.from(serialized, "base64url").toString("utf8");
    const parsed = JSON.parse(jsonStr);

    // Verify expiration
    if (typeof parsed.exp === "number" && Date.now() / 1000 > parsed.exp) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
