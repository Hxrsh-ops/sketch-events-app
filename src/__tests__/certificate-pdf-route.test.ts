import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET as getCertificatePdf } from "@/app/api/certificates/[id]/pdf/route";
import * as sessionModule from "@/lib/auth/session";
import { SketchRepository } from "@/lib/supabase/repository";
import { CertificateRecord } from "@/types";

describe("Certificate PDF Generation Route (/api/certificates/[id]/pdf)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("strictly rejects unauthenticated requests with 401", async () => {
    vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValueOnce({
      isAuthenticated: false,
      isAdmin: false,
      user: null,
    });

    const res = await getCertificatePdf(new Request("http://localhost:3000/api/certificates/cert-1/pdf"), {
      params: Promise.resolve({ id: "cert-1" }),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("strictly rejects unauthorized roles without certificates:issue with 403", async () => {
    vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValueOnce({
      isAuthenticated: true,
      isAdmin: true,
      user: {
        id: "staff-1",
        name: "Attendance Staff",
        email: "staff@sketch.test",
        role: "attendance_staff",
      },
    });

    const res = await getCertificatePdf(new Request("http://localhost:3000/api/certificates/cert-1/pdf"), {
      params: Promise.resolve({ id: "cert-1" }),
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("strictly rejects invalid or malicious certificate IDs with 400", async () => {
    vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValueOnce({
      isAuthenticated: true,
      isAdmin: true,
      user: {
        id: "admin-1",
        name: "Master Admin",
        email: "admin@sketch.test",
        role: "master_admin",
      },
    });

    const res = await getCertificatePdf(
      new Request("http://localhost:3000/api/certificates/..%2Fevil/pdf"),
      {
        params: Promise.resolve({ id: "../evil" }),
      }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid certificate ID");
  });

  it("returns 404 if certificate is not found or not in issued status", async () => {
    vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValueOnce({
      isAuthenticated: true,
      isAdmin: true,
      user: {
        id: "admin-1",
        name: "Master Admin",
        email: "admin@sketch.test",
        role: "master_admin",
      },
    });

    vi.spyOn(SketchRepository, "listCertificates").mockResolvedValueOnce([]);

    const res = await getCertificatePdf(new Request("http://localhost:3000/api/certificates/missing-cert/pdf"), {
      params: Promise.resolve({ id: "missing-cert" }),
    });

    expect(res.status).toBe(404);
  });

  it("generates a valid PDF document with correct headers for authorized users", async () => {
    vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValueOnce({
      isAuthenticated: true,
      isAdmin: true,
      user: {
        id: "admin-1",
        name: "Master Admin",
        email: "admin@sketch.test",
        role: "master_admin",
      },
    });

    const mockCert: CertificateRecord = {
      id: "cert-valid-1",
      certificateNumber: "SKETCH-CERT-2026-0001",
      eventId: "evt-1",
      eventTitle: "Hackathon Grand Finale 2026",
      recipientName: "Alex Rivera",
      recipientEmail: "alex@example.com",
      status: "issued",
      issuedAt: "2026-10-24T12:00:00Z",
    };

    vi.spyOn(SketchRepository, "listCertificates").mockResolvedValueOnce([mockCert]);

    const res = await getCertificatePdf(new Request("http://localhost:3000/api/certificates/cert-valid-1/pdf"), {
      params: Promise.resolve({ id: "cert-valid-1" }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toContain("SKETCH-CERT-2026-0001.pdf");

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    // Verify standard PDF magic header: %PDF-
    expect(buffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });
});
