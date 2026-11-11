import "server-only";
import crypto from "crypto";

export const GOOGLE_OAUTH_TX_COOKIE = "sketch_google_oauth_tx";
export const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
export const GOOGLE_OAUTH_TX_TTL_SECONDS = 600; // 10 minutes

export interface GoogleOAuthConfig {
  clientId?: string;
  clientSecret?: string;
  isConfigured: boolean;
}

export interface GoogleOAuthTxPayload {
  state: string;
  rawNonce: string;
  redirectTarget: string;
  exp: number;
}

/**
 * Resolves Google OAuth client credentials from environment variables.
 * Uses process.env dynamically so tests and runtime environments reflect current values.
 */
export function getGoogleOAuthConfig(): GoogleOAuthConfig {
  const clientId = (
    process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  )?.trim();

  const clientSecret = (
    process.env.GOOGLE_CLIENT_SECRET || process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET
  )?.trim();

  const isPlaceholder = (v?: string) =>
    !v || /your-|placeholder|replace-me|example/i.test(v);

  const validId = !isPlaceholder(clientId) ? clientId : undefined;
  const validSecret = !isPlaceholder(clientSecret) ? clientSecret : undefined;

  return {
    clientId: validId,
    clientSecret: validSecret,
    isConfigured: Boolean(validId && validSecret),
  };
}

/**
 * Computes lowercase hex SHA-256 digest of an input string.
 * Google embeds the hashed nonce inside id_token; Supabase hashes the raw nonce
 * server-side with SHA-256 to verify they match.
 */
export function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

/**
 * Constant-time equality check for arbitrary strings via SHA-256 digests.
 */
export function timingSafeStringEqual(a: string, b: string): boolean {
  const digestA = crypto.createHash("sha256").update(a, "utf8").digest();
  const digestB = crypto.createHash("sha256").update(b, "utf8").digest();
  return crypto.timingSafeEqual(digestA, digestB);
}

/**
 * Generates fresh cryptographic state and raw/hashed nonce pairs for an OAuth login transaction.
 */
export function generateGoogleOAuthSecrets(): {
  state: string;
  rawNonce: string;
  hashedNonce: string;
} {
  const state = crypto.randomBytes(24).toString("base64url");
  const rawNonce = crypto.randomBytes(24).toString("base64url");
  const hashedNonce = sha256Hex(rawNonce);
  return { state, rawNonce, hashedNonce };
}

function getTxSigningSecret(): string {
  return (
    process.env.SESSION_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.GOOGLE_CLIENT_SECRET?.trim() ||
    process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET?.trim() ||
    "sketch-oauth-tx-dev-fallback-secret-32"
  );
}

/**
 * Signs an OAuth transaction payload into a tamper-evident HttpOnly cookie value.
 */
export function createGoogleOAuthTxToken(params: {
  state: string;
  rawNonce: string;
  redirectTarget: string;
  ttlSeconds?: number;
}): string {
  const payload: GoogleOAuthTxPayload = {
    state: params.state,
    rawNonce: params.rawNonce,
    redirectTarget: params.redirectTarget,
    exp: Math.floor(Date.now() / 1000) + (params.ttlSeconds ?? GOOGLE_OAUTH_TX_TTL_SECONDS),
  };

  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = crypto
    .createHmac("sha256", getTxSigningSecret())
    .update(encoded)
    .digest("base64url");

  return `${encoded}.${sig}`;
}

/**
 * Verifies signature and expiration of a stored OAuth transaction cookie.
 * Returns null if malformed, tampered, or expired.
 */
export function verifyGoogleOAuthTxToken(token: string | undefined | null): GoogleOAuthTxPayload | null {
  if (!token || typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [encoded, sig] = parts;
  if (!encoded || !sig) return null;

  const expectedSig = crypto
    .createHmac("sha256", getTxSigningSecret())
    .update(encoded)
    .digest("base64url");

  if (!timingSafeStringEqual(sig, expectedSig)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as GoogleOAuthTxPayload;
    if (
      !parsed ||
      typeof parsed.state !== "string" ||
      typeof parsed.rawNonce !== "string" ||
      typeof parsed.redirectTarget !== "string" ||
      typeof parsed.exp !== "number"
    ) {
      return null;
    }
    if (parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Constructs the direct Google OAuth 2.0 authorization URL pointing back to
 * the application's own /api/auth/callback endpoint.
 */
export function buildGoogleAuthorizationUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  hashedNonce: string;
}): string {
  const url = new URL(GOOGLE_AUTH_ENDPOINT);
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", params.state);
  url.searchParams.set("nonce", params.hashedNonce);
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export interface GoogleTokenExchangeResult {
  idToken?: string;
  error?: string;
  isNetworkError?: boolean;
}

/**
 * Exchanges a Google authorization code directly with Google's token endpoint
 * to obtain a signed OIDC id_token without routing the user's browser through
 * *.supabase.co.
 */
export async function exchangeGoogleCodeForIdToken(params: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<GoogleTokenExchangeResult> {
  try {
    const body = new URLSearchParams({
      code: params.code,
      client_id: params.clientId,
      client_secret: params.clientSecret,
      redirect_uri: params.redirectUri,
      grant_type: "authorization_code",
    });

    const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const json = (await response.json().catch(() => ({}))) as {
      id_token?: string;
      error?: string;
      error_description?: string;
    };

    if (!response.ok || !json.id_token) {
      const msg = json.error_description || json.error || `Google token endpoint returned HTTP ${response.status}`;
      return { error: msg, isNetworkError: response.status >= 502 };
    }

    return { idToken: json.id_token };
  } catch (err: any) {
    return {
      error: err?.message || "Failed to reach Google OAuth token endpoint.",
      isNetworkError: true,
    };
  }
}
