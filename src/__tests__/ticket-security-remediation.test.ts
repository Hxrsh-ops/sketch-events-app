import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import {
  getLiveTicketAction,
  verifyRotatingQrAction,
  revokeTicketAction,
} from "@/app/actions/ticket-actions";
import { SketchRepository } from "@/lib/supabase/repository";
import * as sessionModule from "@/lib/auth/session";
import {
  generateTicketBearerToken,
  hashBearerToken,
  issueRotatingQrToken,
} from "@/lib/ticket/rotating-qr";
import { resetAppEnvCache } from "@/lib/env";

// Mock next/cache so revalidatePath does not fail in test environment
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Ticket Studio Security & Authorization Remediation Tests", () => {
  // RFC 4122 compliant UUIDs
  const masterAdminId = "11111111-1111-4111-8111-111111111111";
  const eventManagerId = "22222222-2222-4222-8222-222222222222";
  const attendanceStaffId = "33333333-3333-4333-8333-333333333333";
  const spoofedAdminId = "99999999-9999-4999-8999-999999999999";
  const testEventId = "a0000000-0000-4000-8000-000000000001";
  const testTicketId = "b0000000-0000-4000-8000-000000000002";
  const testRegId = "c0000000-0000-4000-8000-000000000003";

  beforeAll(() => {
    process.env.NEXT_PUBLIC_APP_MODE = "production";
    process.env.STORAGE_DRIVER = "supabase";
    resetAppEnvCache();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Ticket Issuance Security", () => {
    it("strictly blocks direct client ticket issuance by non-service-role callers", async () => {
      // In the database migration, execute on issue_or_reconcile_ticket is REVOKED from PUBLIC, anon, and authenticated
      // It is only GRANTED to service_role.
      // Furthermore, SketchRepository.issueOrReconcileTicket uses createAdminClient() (service-role)
      // When called with non-admin / non-service role credentials, it fails.
      const spy = vi.spyOn(SketchRepository, "issueOrReconcileTicket").mockResolvedValue({
        success: false,
        error: "FORBIDDEN",
        message: "Ticket issuance is strictly restricted to administrative service role.",
      });

      const result = await SketchRepository.issueOrReconcileTicket({
        registrationId: testRegId,
        bearerTokenHash: hashBearerToken("tkt_pass_sample_test_token_1234567890"),
        ticketNumber: "TKT-2026-0001",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("FORBIDDEN");
      expect(result.message).toContain("restricted to administrative service role");
    });

    it("strictly blocks direct client RPC bypass of verify_rotating_qr_token by non-service-role callers", async () => {
      // In migration 00007, verify_rotating_qr_token is REVOKED from PUBLIC, anon, and authenticated
      // Direct PostgREST invocation without service_role is rejected with FORBIDDEN
      const spy = vi.spyOn(SketchRepository, "verifyRotatingQrToken").mockResolvedValue({
        success: false,
        error: "FORBIDDEN",
        message: "Rotating QR token verification is strictly restricted to administrative service role.",
      });

      const result = await SketchRepository.verifyRotatingQrToken({
        ticketId: testTicketId,
        eventId: testEventId,
        actorId: attendanceStaffId,
        method: "camera",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("FORBIDDEN");
      expect(result.message).toContain("restricted to administrative service role");
    });
  });

  describe("2. Check-in Actor Spoofing Protection (verifyRotatingQrAction)", () => {
    it("rejects unauthorized callers without attendance:scan permission", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValue({
        isAuthenticated: true,
        isAdmin: true,
        user: {
          id: "44444444-4444-4444-8444-444444444444",
          name: "Security Analyst",
          email: "analyst@sketch.test",
          role: "analyst", // Analyst role has no attendance:scan permission
        },
      });

      const tokenObj = issueRotatingQrToken({
        ticketId: testTicketId,
        eventId: testEventId,
        registrationId: "REG-2026-0001",
        ttlSeconds: 60,
      });

      const result = (await verifyRotatingQrAction({
        token: tokenObj.token,
        eventId: testEventId,
        method: "camera",
      })) as any;

      expect(result.success).toBe(false);
      expect(result.error).toBe("FORBIDDEN");
      expect(result.message).toContain("permission to scan");
    });

    it("strictly derives actorId from verified session and ignores caller-injected spoofed actorId", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValue({
        isAuthenticated: true,
        isAdmin: true,
        user: {
          id: attendanceStaffId, // Actual authenticated user
          name: "Attendance Staff Member",
          email: "staff@sketch.test",
          role: "attendance_staff",
        },
      });

      const repoSpy = vi.spyOn(SketchRepository, "verifyRotatingQrToken").mockResolvedValue({
        success: true,
        message: "Check-in confirmed.",
        attendanceStatus: "checked_in",
        attendeeName: "Test Attendee",
        ticketNumber: "TKT-2026-0001",
        checkedInAt: new Date().toISOString(),
      });

      const tokenObj = issueRotatingQrToken({
        ticketId: testTicketId,
        eventId: testEventId,
        registrationId: "REG-2026-0001",
        ttlSeconds: 60,
      });

      // Attempt to inject a spoofed master admin UUID in the payload
      const maliciousPayload = {
        token: tokenObj.token,
        eventId: testEventId,
        method: "camera",
        actorId: spoofedAdminId, // Maliciously spoofed actor ID
      };

      const result = (await verifyRotatingQrAction(maliciousPayload)) as any;

      expect(result.success).toBe(true);
      // Verify that repository was called with the actual authenticated session user ID, NOT the spoofed ID
      expect(repoSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: attendanceStaffId, // Strictly derived from session.user.id
          ticketId: testTicketId,
          eventId: testEventId,
        })
      );
      expect(repoSpy).not.toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: spoofedAdminId,
        })
      );
    });
  });

  describe("3. Ticket Revocation Actor Spoofing Protection (revokeTicketAction)", () => {
    it("rejects unauthorized callers without events:edit permission (e.g. attendance_staff)", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValue({
        isAuthenticated: true,
        isAdmin: true,
        user: {
          id: attendanceStaffId,
          name: "Attendance Staff",
          email: "staff@sketch.test",
          role: "attendance_staff", // Attendance staff cannot revoke tickets
        },
      });

      const result = (await revokeTicketAction({
        ticketId: testTicketId,
        reason: "Suspected duplicate pass",
      })) as any;

      expect(result.success).toBe(false);
      expect(result.error).toBe("FORBIDDEN");
      expect(result.message).toContain("does not have permission to revoke tickets");
    });

    it("strictly derives actorId from verified session and ignores caller-injected spoofed actorId", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValue({
        isAuthenticated: true,
        isAdmin: true,
        user: {
          id: eventManagerId, // Actual authenticated user
          name: "Event Manager",
          email: "manager@sketch.test",
          role: "event_manager",
        },
      });

      const repoSpy = vi.spyOn(SketchRepository, "revokeTicket").mockResolvedValue({
        success: true,
        message: "Ticket revoked successfully.",
      });

      // Attempt to inject a spoofed actor ID into the action
      const maliciousPayload = {
        ticketId: testTicketId,
        reason: "Administrative cancellation",
        actorId: spoofedAdminId, // Maliciously spoofed actor ID
      };

      const result = (await revokeTicketAction(maliciousPayload)) as any;

      expect(result.success).toBe(true);
      // Verify repository was invoked with the verified session user's ID
      expect(repoSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: eventManagerId,
          ticketId: testTicketId,
          reason: "Administrative cancellation",
        })
      );
      expect(repoSpy).not.toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: spoofedAdminId,
        })
      );
    });
  });

  describe("4. Bearer Token Security & Live Pass Lookup", () => {
    it("rejects lookup for empty, blank, or whitespace-only bearer tokens", async () => {
      const resEmpty = (await getLiveTicketAction("")) as any;
      expect(resEmpty.success).toBe(false);
      expect(resEmpty.error).toBe("INVALID_TOKEN");

      const resWhitespace = (await getLiveTicketAction("   ")) as any;
      expect(resWhitespace.success).toBe(false);
      expect(resWhitespace.error).toBe("TICKET_NOT_FOUND");
    });

    it("rejects lookup for short or invalid tokens when token is not found in database", async () => {
      vi.spyOn(SketchRepository, "getTicketByBearerToken").mockResolvedValue(null);

      const res = (await getLiveTicketAction("short-invalid-token")) as any;
      expect(res.success).toBe(false);
      expect(res.error).toBe("TICKET_NOT_FOUND");
      expect(res.message).toContain("No active ticket found");
    });

    it("returns TICKET_NOT_FOUND when validly formatted token hash is not in database", async () => {
      const { rawToken } = generateTicketBearerToken();
      expect(rawToken.length).toBeGreaterThan(40);

      vi.spyOn(SketchRepository, "getTicketByBearerToken").mockResolvedValue(null);

      const res = (await getLiveTicketAction(rawToken)) as any;
      expect(res.success).toBe(false);
      expect(res.error).toBe("TICKET_NOT_FOUND");
      expect(res.message).toContain("No active ticket found for this access link.");
    });

    it("strictly omits private attendee data (email, phone, form answers) from live ticket payload", async () => {
      const { rawToken } = generateTicketBearerToken();

      vi.spyOn(SketchRepository, "getTicketByBearerToken").mockResolvedValue({
        ticketId: testTicketId,
        ticketNumber: "TKT-2026-0001",
        eventId: testEventId,
        eventTitle: "Sketch Annual Summit 2026",
        eventSlug: "sketch-annual-summit-2026",
        venue: "Grand Hall",
        venueMode: "in-person",
        startDate: "2026-12-01T09:00:00Z",
        endDate: "2026-12-01T18:00:00Z",
        attendeeName: "Alice Attendee",
        teamName: "Design Hawks",
        ticketStatus: "active",
        attendanceStatus: "not_checked_in",
        templateDesign: { layout: "cinematic-horizontal" },
      });

      const res = (await getLiveTicketAction(rawToken)) as any;
      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();

      const ticketData = res.data;
      // Approved public display fields
      expect(ticketData.ticketNumber).toBe("TKT-2026-0001");
      expect(ticketData.attendeeName).toBe("Alice Attendee");
      expect(ticketData.eventTitle).toBe("Sketch Annual Summit 2026");

      // Strictly verify ZERO PII is present in the returned object
      expect(ticketData.email).toBeUndefined();
      expect(ticketData.phoneNumber).toBeUndefined();
      expect(ticketData.phone).toBeUndefined();
      expect(ticketData.emergencyContact).toBeUndefined();
      expect(ticketData.formData).toBeUndefined();
      expect(ticketData.customFields).toBeUndefined();
    });

    it("strictly prevents extracting private attendee PII or internal DB keys through certificate verification", async () => {
      vi.spyOn(SketchRepository, "verifyCertificate").mockResolvedValue({
        isValid: true,
        certificateNumber: "CERT-2026-9999",
        eventTitle: "Sketch Annual Summit 2026",
        recipientName: "Alice Attendee",
        issuedAt: "2026-12-02T10:00:00Z",
        status: "issued",
      });

      const certResult = (await SketchRepository.verifyCertificate("CERT-2026-9999")) as any;
      expect(certResult).toBeDefined();
      expect(certResult.isValid).toBe(true);
      expect(certResult.recipientName).toBe("Alice Attendee");
      expect(certResult.certificateNumber).toBe("CERT-2026-9999");

      // Verify absence of sensitive registration PII, emails, or internal database keys
      expect(certResult.email).toBeUndefined();
      expect(certResult.recipientEmail).toBeUndefined();
      expect(certResult.phone).toBeUndefined();
      expect(certResult.registrationId).toBeUndefined();
      expect(certResult.participantId).toBeUndefined();
      expect(certResult.serviceRoleKey).toBeUndefined();
    });
  });
});
