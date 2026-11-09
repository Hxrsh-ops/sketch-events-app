import { describe, it, expect, vi, beforeEach } from "vitest";
import { toggleAttendanceAction } from "@/app/actions/participant-actions";
import { verifyRotatingQrAction } from "@/app/actions/ticket-actions";
import { issueRotatingQrToken } from "@/lib/ticket/rotating-qr";
import * as sessionModule from "@/lib/auth/session";
import { SketchRepository } from "@/lib/supabase/repository";
import { AdminRole, AdminUser } from "@/types";
import { MOCK_PARTICIPANTS } from "@/lib/mock-data";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Participant Check-In & toggle_attendance RBAC Authorization Verification", () => {
  const mockUserWithRole = (role: AdminRole): AdminUser => ({
    id: "usr-admin-101",
    name: "Test Operator",
    email: "operator@sketch.test",
    role,
  });

  const setAuthSession = (role: AdminRole | null) => {
    if (role === null) {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValue({
        isAuthenticated: false,
        isAdmin: false,
        user: null,
      });
    } else {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValue({
        isAuthenticated: true,
        isAdmin: true,
        user: mockUserWithRole(role),
      });
    }
  };

  const sampleParticipant = MOCK_PARTICIPANTS[0];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Step 3: Verification of Attendance Operator Permissions", () => {
    it("1. master_admin can check in a participant", async () => {
      setAuthSession("master_admin");

      const res = await toggleAttendanceAction({
        registrationIdOrUid: sampleParticipant.registrationId,
        eventId: sampleParticipant.eventId,
        targetStatus: "checked_in",
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.attendanceStatus).toBe("checked_in");
        expect(res.data.registrationId).toBe(sampleParticipant.registrationId);
      }
    });

    it("2. event_manager can check in a participant", async () => {
      setAuthSession("event_manager");

      const res = await toggleAttendanceAction({
        registrationIdOrUid: sampleParticipant.registrationId,
        eventId: sampleParticipant.eventId,
        targetStatus: "checked_in",
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.attendanceStatus).toBe("checked_in");
      }
    });

    it("3. attendance_staff can check in a participant", async () => {
      setAuthSession("attendance_staff");

      const res = await toggleAttendanceAction({
        registrationIdOrUid: sampleParticipant.registrationId,
        eventId: sampleParticipant.eventId,
        targetStatus: "checked_in",
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.attendanceStatus).toBe("checked_in");
      }
    });

    it("4. analyst cannot check in participants (FORBIDDEN)", async () => {
      setAuthSession("analyst");

      const res = await toggleAttendanceAction({
        registrationIdOrUid: sampleParticipant.registrationId,
        eventId: sampleParticipant.eventId,
        targetStatus: "checked_in",
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe("FORBIDDEN");
        expect(res.message).toMatch(/permission/i);
      }
    });

    it("5. Unauthenticated callers cannot execute check-in (UNAUTHORIZED)", async () => {
      setAuthSession(null);

      const res = await toggleAttendanceAction({
        registrationIdOrUid: sampleParticipant.registrationId,
        eventId: sampleParticipant.eventId,
        targetStatus: "checked_in",
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe("UNAUTHORIZED");
      }
    });

    it("6. Repeated check-in calls behave idempotently without corrupting records", async () => {
      setAuthSession("master_admin");

      // Initial check-in
      const res1 = await toggleAttendanceAction({
        registrationIdOrUid: sampleParticipant.registrationId,
        eventId: sampleParticipant.eventId,
        targetStatus: "checked_in",
      });
      expect(res1.success).toBe(true);
      if (res1.success) {
        expect(res1.data.attendanceStatus).toBe("checked_in");
      }

      // Idempotent repeat check-in with targetStatus checked_in
      const res2 = await toggleAttendanceAction({
        registrationIdOrUid: sampleParticipant.registrationId,
        eventId: sampleParticipant.eventId,
        targetStatus: "checked_in",
      });
      expect(res2.success).toBe(true);
      if (res2.success) {
        expect(res2.data.attendanceStatus).toBe("checked_in");
      }

      // Check-out / toggle undo
      const res3 = await toggleAttendanceAction({
        registrationIdOrUid: sampleParticipant.registrationId,
        eventId: sampleParticipant.eventId,
        targetStatus: "not_checked_in",
      });
      expect(res3.success).toBe(true);
      if (res3.success) {
        expect(res3.data.attendanceStatus).toBe("not_checked_in");
      }
    });

    it("6. Rotating QR Scanner: verifies valid token, rejects expired and cross-event tokens", async () => {
      setAuthSession("attendance_staff");

      const validEventId = "a0000000-0000-4000-8000-000000000001";
      const differentEventId = "e0000000-0000-4000-8000-000000000099";

      vi.spyOn(SketchRepository, "verifyRotatingQrToken").mockResolvedValue({
        success: true,
        message: "Check-in confirmed.",
        attendanceStatus: "checked_in",
        attendeeName: "Jane Doe",
        ticketNumber: "TKT-2026-0001",
      });

      const tokenObj = issueRotatingQrToken({
        ticketId: "b0000000-0000-4000-8000-000000000001",
        eventId: validEventId,
        registrationId: "REG-2026-0001",
        ttlSeconds: 60,
      });

      // Valid token check
      const validRes = await verifyRotatingQrAction({
        token: tokenObj.token,
        eventId: validEventId,
        method: "camera",
      });
      expect(validRes.success).toBe(true);

      // Cross-event rejection
      const crossRes = await verifyRotatingQrAction({
        token: tokenObj.token,
        eventId: differentEventId,
        method: "camera",
      });
      expect(crossRes.success).toBe(false);
      if (!crossRes.success) {
        expect(crossRes.error).toBe("CROSS_EVENT_MISMATCH");
      }

      // Expired token rejection
      const expiredTokenObj = issueRotatingQrToken({
        ticketId: "b0000000-0000-4000-8000-000000000001",
        eventId: validEventId,
        registrationId: "REG-2026-0001",
        ttlSeconds: -10, // already expired
      });
      const expiredRes = await verifyRotatingQrAction({
        token: expiredTokenObj.token,
        eventId: validEventId,
        method: "camera",
      });
      expect(expiredRes.success).toBe(false);
      if (!expiredRes.success) {
        expect(expiredRes.error).toBe("TOKEN_EXPIRED");
      }
    });
  });
});
