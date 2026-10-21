import { describe, it, expect } from "vitest";
import {
  generateTicketBearerToken,
  hashBearerToken,
  issueRotatingQrToken,
  verifyRotatingQrTokenSignature,
  generateQrDataUrl,
  generateQrSvgString,
} from "@/lib/ticket/rotating-qr";

describe("Rotating QR Cryptography & Token Lifecycle", () => {
  it("1. Bearer Token: generates high-entropy opaque bearer credential and consistent SHA-256 hash", () => {
    const { rawToken, tokenHash } = generateTicketBearerToken();

    expect(rawToken.startsWith("tkt_pass_")).toBe(true);
    expect(rawToken.length).toBeGreaterThan(40);
    expect(tokenHash).toBeDefined();
    expect(tokenHash.length).toBe(64); // SHA-256 hex length

    // Re-hashing the same raw token produces exact match
    expect(hashBearerToken(rawToken)).toBe(tokenHash);

    // Two separately generated tokens must be cryptographically distinct
    const token2 = generateTicketBearerToken();
    expect(token2.rawToken).not.toBe(rawToken);
    expect(token2.tokenHash).not.toBe(tokenHash);
  });

  it("2. Rotating Challenge Token: HMAC signature validates properly before expiry", () => {
    const ticketId = "11111111-1111-1111-1111-111111111111";
    const eventId = "22222222-2222-2222-2222-222222222222";
    const regId = "REG-2026-TEST-01";

    const { token, expiresAt, ttlSeconds } = issueRotatingQrToken({
      ticketId,
      eventId,
      registrationId: regId,
      ttlSeconds: 60,
    });

    expect(token).toBeDefined();
    expect(token.includes(".")).toBe(true);
    expect(ttlSeconds).toBe(60);

    const verification = verifyRotatingQrTokenSignature(token);
    expect(verification.valid).toBe(true);
    expect(verification.payload).toBeDefined();
    expect(verification.payload?.tid).toBe(ticketId);
    expect(verification.payload?.eid).toBe(eventId);
    expect(verification.payload?.reg).toBe(regId);
    expect(verification.payload?.exp).toBe(expiresAt);
  });

  it("3. Anti-Tamper: rejects corrupted payload, altered signature, or garbage strings", () => {
    const { token } = issueRotatingQrToken({
      ticketId: "11111111-1111-1111-1111-111111111111",
      eventId: "22222222-2222-2222-2222-222222222222",
      registrationId: "REG-2026-TEST-02",
      ttlSeconds: 60,
    });

    const [payload, sig] = token.split(".");

    // A. Altered signature
    const tamperedSigToken = `${payload}.${sig.slice(0, -4)}AAAA`;
    const resTampered = verifyRotatingQrTokenSignature(tamperedSigToken);
    expect(resTampered.valid).toBe(false);
    expect(resTampered.error).toBe("INVALID_SIGNATURE");

    // B. Altered payload with original signature
    const alteredPayloadToken = `${payload}xyz.${sig}`;
    const resAltered = verifyRotatingQrTokenSignature(alteredPayloadToken);
    expect(resAltered.valid).toBe(false);

    // C. Non-token random garbage
    const garbageRes = verifyRotatingQrTokenSignature("random-text-without-dot");
    expect(garbageRes.valid).toBe(false);
    expect(garbageRes.error).toBe("MALFORMED");
  });

  it("4. Expiration: rejects expired rotating tokens", () => {
    // Generate token with negative TTL (already expired in the past)
    const { token } = issueRotatingQrToken({
      ticketId: "11111111-1111-1111-1111-111111111111",
      eventId: "22222222-2222-2222-2222-222222222222",
      registrationId: "REG-2026-EXPIRED",
      ttlSeconds: -10, // 10 seconds in the past
    });

    const verification = verifyRotatingQrTokenSignature(token);
    expect(verification.valid).toBe(false);
    expect(verification.error).toBe("EXPIRED");
  });

  it("5. QR Image Output: generates valid base64 data URLs and SVG strings", async () => {
    const testData = "https://sketch.events/t/tkt_sample_12345";

    const dataUrl = await generateQrDataUrl(testData, 180);
    expect(dataUrl.startsWith("data:image/png;base64,")).toBe(true);

    const svgString = await generateQrSvgString(testData, 180);
    expect(svgString.includes("<svg")).toBe(true);
    expect(svgString.includes("</svg>")).toBe(true);
  });

  it("6. Production Fail-Closed: throws an explicit configuration error when secrets are missing in production mode", () => {
    const originalEnv = { ...process.env };
    try {
      (process.env as any).NODE_ENV = "production";
      delete process.env.ROTATING_QR_SECRET;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      expect(() => {
        issueRotatingQrToken({
          ticketId: "11111111-1111-1111-1111-111111111111",
          eventId: "22222222-2222-2222-2222-222222222222",
          registrationId: "REG-2026-PROD-TEST",
          ttlSeconds: 60,
        });
      }).toThrow(/Missing signing secret/);
    } finally {
      process.env = originalEnv;
    }
  });

  it("7. Clock Skew Protection: rejects tokens with future issued-at timestamp exceeding threshold", () => {
    const ticketId = "11111111-1111-1111-1111-111111111111";
    const eventId = "22222222-2222-2222-2222-222222222222";
    const regId = "REG-2026-SKEW";

    // Manually forge a token with iat far in the future
    const now = Math.floor(Date.now() / 1000);
    const futureIat = now + 60; // 60s in future (> 30s allowed)
    const payload = {
      tid: ticketId,
      eid: eventId,
      reg: regId,
      exp: now + 120,
      iat: futureIat,
      nonce: "12345678",
      v: 1,
    };

    const serialized = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const cryptoMod = require("crypto");
    const secret = cryptoMod
      .createHash("sha256")
      .update(process.env.ROTATING_QR_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "sketch-events-local-rotating-qr-secret-key-2026")
      .digest();
    const sig = cryptoMod.createHmac("sha256", secret).update(serialized).digest("base64url");
    const forgedToken = `${serialized}.${sig}`;

    const res = verifyRotatingQrTokenSignature(forgedToken);
    expect(res.valid).toBe(false);
    expect(res.error).toBe("CLOCK_SKEW");
  });
});
