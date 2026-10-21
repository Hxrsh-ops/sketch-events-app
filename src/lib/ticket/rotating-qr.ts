import crypto from "crypto";
import QRCode from "qrcode";

/**
 * Rotating QR Token Payload Definition
 */
export interface RotatingQrPayload {
  tid: string; // Ticket ID (UUID)
  eid: string; // Event ID (UUID)
  reg: string; // Registration ID (text)
  exp: number; // Expiry timestamp (Unix epoch in seconds)
  iat: number; // Issued at timestamp (Unix epoch in seconds)
  nonce: string; // Cryptographic nonce preventing prediction
  v: number; // Token format version
}

export interface QrTokenVerificationResult {
  valid: boolean;
  error?: "EXPIRED" | "INVALID_SIGNATURE" | "MALFORMED" | "CLOCK_SKEW";
  payload?: RotatingQrPayload;
}

/**
 * Resolves the server-side HMAC secret for rotating QR tokens.
 * Fallbacks to server-role key or generates deterministic runtime fallback.
 */
function getRotatingQrSecret(): Buffer {
  const secret = process.env.ROTATING_QR_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[RotatingQR] Missing signing secret: ROTATING_QR_SECRET or SUPABASE_SERVICE_ROLE_KEY must be configured in production."
      );
    }
    // Permitted only in local test/dev environments
    return crypto.createHash("sha256").update("sketch-events-local-rotating-qr-secret-key-2026").digest();
  }
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Generates an opaque, high-entropy bearer token for participant ticket access.
 * Returns raw bearer token (to be sent via email link) and SHA-256 hash (to be stored in DB).
 */
export function generateTicketBearerToken(): { rawToken: string; tokenHash: string } {
  const rawToken = `tkt_pass_${crypto.randomBytes(32).toString("base64url")}`;
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  return { rawToken, tokenHash };
}

/**
 * Hashes a raw bearer token for database lookup.
 */
export function hashBearerToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken.trim()).digest("hex");
}

/**
 * Issues a short-lived HMAC-signed rotating QR challenge token.
 * 
 * @param ticketId Ticket UUID
 * @param eventId Event UUID
 * @param registrationId Registration display ID (e.g. REG-2026-0001)
 * @param ttlSeconds Token lifetime in seconds (default: 60s)
 */
export function issueRotatingQrToken(params: {
  ticketId: string;
  eventId: string;
  registrationId: string;
  ttlSeconds?: number;
}): { token: string; expiresAt: number; ttlSeconds: number } {
  const ttl = params.ttlSeconds || 60;
  const now = Math.floor(Date.now() / 1000);
  const exp = now + ttl;
  const nonce = crypto.randomBytes(8).toString("hex");

  const payload: RotatingQrPayload = {
    tid: params.ticketId,
    eid: params.eventId,
    reg: params.registrationId,
    exp,
    iat: now,
    nonce,
    v: 1,
  };

  const serializedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const secret = getRotatingQrSecret();
  const signature = crypto
    .createHmac("sha256", secret)
    .update(serializedPayload)
    .digest("base64url");

  const token = `${serializedPayload}.${signature}`;

  return {
    token,
    expiresAt: exp,
    ttlSeconds: ttl,
  };
}

/**
 * Verifies a rotating QR token signature and expiration.
 * Uses constant-time comparison to prevent timing side-channel attacks.
 */
export function verifyRotatingQrTokenSignature(token: string): QrTokenVerificationResult {
  if (!token || typeof token !== "string") {
    return { valid: false, error: "MALFORMED" };
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return { valid: false, error: "MALFORMED" };
  }

  const [serializedPayload, providedSignature] = parts;

  try {
    const secret = getRotatingQrSecret();
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(serializedPayload)
      .digest("base64url");

    // Constant-time signature comparison
    const sigBuffer = Buffer.from(providedSignature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return { valid: false, error: "INVALID_SIGNATURE" };
    }

    const jsonString = Buffer.from(serializedPayload, "base64url").toString("utf8");
    const payload: RotatingQrPayload = JSON.parse(jsonString);

    const now = Math.floor(Date.now() / 1000);

    // Allow 5-second grace window for minor network transit clock skew
    if (now > payload.exp + 5) {
      return { valid: false, error: "EXPIRED", payload };
    }

    // Reject tokens claiming to be issued in the distant future
    if (payload.iat > now + 30) {
      return { valid: false, error: "CLOCK_SKEW", payload };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, error: "MALFORMED" };
  }
}

/**
 * Generates a PNG Data URL representation of a QR token for browser display.
 */
export async function generateQrDataUrl(data: string, size = 200): Promise<string> {
  return QRCode.toDataURL(data, {
    width: size,
    margin: 1,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
    errorCorrectionLevel: "M",
  });
}

/**
 * Generates an SVG string representation of a QR token for email / print documents.
 */
export async function generateQrSvgString(data: string, size = 180): Promise<string> {
  return QRCode.toString(data, {
    type: "svg",
    width: size,
    margin: 1,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
    errorCorrectionLevel: "M",
  });
}
