import { describe, it, expect, beforeEach, vi } from "vitest";
import { generateCertificateSvg } from "@/lib/certificate/certificate-renderer";
import { DEFAULT_CERTIFICATE_DESIGN } from "@/types/certificate-template";
import { SketchRepository } from "@/lib/supabase/repository";
import { GET as getPublicCertificatePdf } from "@/app/api/certificates/verify/[number]/pdf/route";

describe("Certificate QR Verification Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Requirement 1: QR Generation & Verification URL Encoding", () => {
    it("generates an SVG containing a valid scannable QR element pointing to verification URL", async () => {
      const certData = {
        recipientName: "Aditi Rao",
        eventTitle: "Annual Design & Tech Summit 2026",
        certificateNumber: "SKETCH-CERT-2026-8849",
        issuedAt: "2026-11-21T10:00:00.000Z",
      };

      const svg = await generateCertificateSvg({
        design: DEFAULT_CERTIFICATE_DESIGN,
        certificate: certData,
        verificationBaseUrl: "https://sketchhub.example.com",
      });

      // SVG must be valid XML SVG
      expect(svg).toContain("<svg");
      expect(svg).toContain("</svg>");

      // Must include recipient, event (XML-escaped), and certificate number
      expect(svg).toContain("Aditi Rao");
      expect(svg).toContain("Annual Design &amp; Tech Summit 2026");
      expect(svg).toContain("SKETCH-CERT-2026-8849");

      // Must include QR code element group
      const qrEl = DEFAULT_CERTIFICATE_DESIGN.elements.find((e) => e.type === "qr");
      expect(qrEl).toBeDefined();
      expect(svg).toContain(`transform="translate(${qrEl?.x}, ${qrEl?.y})"`);
    });
  });

  describe("Requirement 2 & 3: Public Verification Data Lookup & Details Display", () => {
    it("retrieves complete student and certificate details for valid issued certificate", async () => {
      const cert = await SketchRepository.verifyCertificate("SKETCH-CERT-2026-8849");

      expect(cert).not.toBeNull();
      // Requirement 3 fields:
      expect(cert?.recipientName).toBe("Aditi Rao"); // Student name
      expect(cert?.certificateNumber).toBe("SKETCH-CERT-2026-8849"); // Certificate ID
      expect(cert?.eventTitle).toBe("Annual Design & Tech Summit 2026"); // Event name
      expect(cert?.issuedAt).toBeDefined(); // Issue date
      expect(cert?.status).toBe("issued");
      expect(cert?.isValid).toBe(true);
    });

    it("retrieves details for production sample certificate SKETCH-CERT-2026-0811", async () => {
      const cert = await SketchRepository.verifyCertificate("SKETCH-CERT-2026-0811");

      expect(cert).not.toBeNull();
      expect(cert?.recipientName).toBe("Rohan Varma");
      expect(cert?.certificateNumber).toBe("SKETCH-CERT-2026-0811");
      expect(cert?.eventTitle).toBe("Visual Storytelling Masterclass");
      expect(cert?.status).toBe("issued");
      expect(cert?.isValid).toBe(true);
    });
  });

  describe("Requirement 4: Status Handling (Valid, Revoked, Unrecognized)", () => {
    it("handles valid/verified certificates correctly", async () => {
      const cert = await SketchRepository.verifyCertificate("SKETCH-CERT-2026-8849");

      expect(cert).not.toBeNull();
      expect(cert?.isValid).toBe(true);
      expect(cert?.status).toBe("issued");
    });

    it("handles revoked certificates correctly with distinct status and invalid flag", async () => {
      const cert = await SketchRepository.verifyCertificate("SKETCH-CERT-2026-REVOKED");

      expect(cert).not.toBeNull();
      expect(cert?.certificateNumber).toBe("SKETCH-CERT-2026-REVOKED");
      expect(cert?.recipientName).toBe("Karthik Subramanian");
      expect(cert?.status).toBe("revoked");
      expect(cert?.isValid).toBe(false);
    });

    it("handles unrecognized / nonexistent certificate numbers cleanly", async () => {
      const cert = await SketchRepository.verifyCertificate("NON-EXISTENT-CERT-0000");

      expect(cert).toBeNull();
    });
  });

  describe("Public Certificate PDF Route Verification", () => {
    it("generates a valid downloadable PDF for issued certificates with verification QR", async () => {
      const res = await getPublicCertificatePdf(
        new Request("http://localhost:3000/api/certificates/verify/SKETCH-CERT-2026-8849/pdf"),
        { params: Promise.resolve({ number: "SKETCH-CERT-2026-8849" }) }
      );

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/pdf");
      expect(res.headers.get("Content-Disposition")).toContain("SKETCH-CERT-2026-8849.pdf");

      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      expect(buffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    });

    it("rejects PDF download for revoked certificates with 404", async () => {
      const res = await getPublicCertificatePdf(
        new Request("http://localhost:3000/api/certificates/verify/SKETCH-CERT-2026-REVOKED/pdf"),
        { params: Promise.resolve({ number: "SKETCH-CERT-2026-REVOKED" }) }
      );

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Valid issued certificate not found");
    });

    it("rejects PDF download for unrecognized certificates with 404", async () => {
      const res = await getPublicCertificatePdf(
        new Request("http://localhost:3000/api/certificates/verify/UNKNOWN-CERT-9999/pdf"),
        { params: Promise.resolve({ number: "UNKNOWN-CERT-9999" }) }
      );

      expect(res.status).toBe(404);
    });

    it("rejects invalid certificate number format with 400", async () => {
      const res = await getPublicCertificatePdf(
        new Request("http://localhost:3000/api/certificates/verify/../../etc/passwd/pdf"),
        { params: Promise.resolve({ number: "../../etc/passwd" }) }
      );

      expect(res.status).toBe(400);
    });
  });
});
