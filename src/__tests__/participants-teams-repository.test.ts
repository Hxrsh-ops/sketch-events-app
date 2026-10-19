import { describe, it, expect, vi, beforeEach } from "vitest";
import { SketchRepository } from "@/lib/supabase/repository";
import { toggleAttendanceAction } from "@/app/actions/participant-actions";
import { resetAppEnvCache } from "@/lib/env";
import { resetServerEnvCache } from "@/lib/env.server";
import { MOCK_PARTICIPANTS, MOCK_TEAMS, MOCK_ADMIN_USER } from "@/lib/mock-data";

// Mock next/cache so revalidatePath does not fail in test environment
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock auth session
const mockVerifyAdminSession = vi.fn();
vi.mock("@/lib/auth/session", () => ({
  verifyAdminSession: () => mockVerifyAdminSession(),
}));

describe("Slice 4.2: Participants & Teams Real PostgreSQL Integration", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetAppEnvCache();
    resetServerEnvCache();
    process.env = { ...originalEnv };
    vi.clearAllMocks();

    mockVerifyAdminSession.mockResolvedValue({
      isAuthenticated: true,
      isAdmin: true,
      user: {
        ...MOCK_ADMIN_USER,
        role: "master_admin",
      },
    });
  });

  describe("1. Repository Data Mapping & Filtering (Preview & Fallback)", () => {
    it("lists all participants in preview mode without leaking nulls", async () => {
      process.env.APP_MODE = "preview";
      const participants = await SketchRepository.listParticipants();

      expect(Array.isArray(participants)).toBe(true);
      expect(participants.length).toBeGreaterThan(0);
      expect(participants[0]).toHaveProperty("registrationId");
      expect(participants[0]).toHaveProperty("name");
      expect(participants[0]).toHaveProperty("email");
      expect(participants[0]).toHaveProperty("attendanceStatus");
    });

    it("filters participants by eventId correctly", async () => {
      process.env.APP_MODE = "preview";
      const eventId = "evt-01";
      const filtered = await SketchRepository.listParticipants({ eventId });

      expect(filtered.every((p) => p.eventId === eventId)).toBe(true);
    });

    it("filters participants by search query across name, email, and registration ID", async () => {
      process.env.APP_MODE = "preview";
      const first = MOCK_PARTICIPANTS[0];
      const search = first.name.slice(0, 4);

      const results = await SketchRepository.listParticipants({ search });
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((p) => p.name.toLowerCase().includes(search.toLowerCase()))).toBe(true);
    });

    it("lists all teams with complete member rosters", async () => {
      process.env.APP_MODE = "preview";
      const teams = await SketchRepository.listTeams();

      expect(Array.isArray(teams)).toBe(true);
      expect(teams.length).toBeGreaterThan(0);
      expect(teams[0]).toHaveProperty("id");
      expect(teams[0]).toHaveProperty("name");
      expect(teams[0]).toHaveProperty("captainName");
      expect(teams[0]).toHaveProperty("memberCount");
      expect(Array.isArray(teams[0].members)).toBe(true);
    });
  });

  describe("2. Attendance Mutation & Counter Behavior", () => {
    it("toggles attendance status between checked_in and not_checked_in idempotently", async () => {
      process.env.APP_MODE = "preview";
      const sample = MOCK_PARTICIPANTS[0];
      const initialStatus = sample.attendanceStatus;

      // 1. Flip status
      const res1 = await SketchRepository.toggleParticipantAttendance({
        registrationIdOrUid: sample.registrationId,
        eventId: sample.eventId,
      });

      expect(res1.success).toBe(true);
      expect(res1.attendanceStatus).not.toBe(initialStatus);

      // 2. Revert status
      const res2 = await SketchRepository.toggleParticipantAttendance({
        registrationIdOrUid: sample.registrationId,
        eventId: sample.eventId,
        targetStatus: initialStatus,
      });

      expect(res2.success).toBe(true);
      expect(res2.attendanceStatus).toBe(initialStatus);
    });

    it("rejects attendance mutation when registration does not belong to specified event", async () => {
      process.env.APP_MODE = "preview";
      const sample = MOCK_PARTICIPANTS[0];

      const res = await SketchRepository.toggleParticipantAttendance({
        registrationIdOrUid: sample.registrationId,
        eventId: "wrong-mismatched-event-id",
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe("REGISTRATION_NOT_FOUND");
    });
  });

  describe("3. Server Action Security, Authentication & RBAC", () => {
    it("rejects unauthenticated requests with 401 UNAUTHORIZED", async () => {
      mockVerifyAdminSession.mockResolvedValueOnce({
        isAuthenticated: false,
        isAdmin: false,
        user: null,
      });

      const res = await toggleAttendanceAction({
        registrationIdOrUid: "REG-2026-0001",
        eventId: "evt-01",
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe("UNAUTHORIZED");
      }
    });

    it("rejects unauthorized roles lacking attendance permissions", async () => {
      mockVerifyAdminSession.mockResolvedValueOnce({
        isAuthenticated: true,
        isAdmin: true,
        user: {
          ...MOCK_ADMIN_USER,
          role: "analyst", // Analyst cannot scan or override attendance
        },
      });

      const res = await toggleAttendanceAction({
        registrationIdOrUid: "REG-2026-0001",
        eventId: "evt-01",
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe("FORBIDDEN");
      }
    });

    it("allows attendance_staff, event_manager, and master_admin roles", async () => {
      const allowedRoles = ["master_admin", "event_manager", "attendance_staff"] as const;

      for (const role of allowedRoles) {
        mockVerifyAdminSession.mockResolvedValueOnce({
          isAuthenticated: true,
          isAdmin: true,
          user: {
            ...MOCK_ADMIN_USER,
            role,
          },
        });

        const res = await toggleAttendanceAction({
          registrationIdOrUid: MOCK_PARTICIPANTS[0].registrationId,
          eventId: MOCK_PARTICIPANTS[0].eventId,
          targetStatus: "checked_in",
        });

        expect(res.success).toBe(true);
        if (res.success) {
          expect(res.data.attendanceStatus).toBe("checked_in");
        }
      }
    });

    it("rejects malformed or empty registration ID input", async () => {
      const res = await toggleAttendanceAction({
        registrationIdOrUid: "   ",
        eventId: "evt-01",
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe("VALIDATION_FAILED");
      }
    });

    it("rejects missing eventId input", async () => {
      const res = await toggleAttendanceAction({
        registrationIdOrUid: "REG-2026-0001",
        eventId: "   ",
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe("VALIDATION_FAILED");
      }
    });
  });
});
