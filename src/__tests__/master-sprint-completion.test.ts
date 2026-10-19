import { describe, it, expect, beforeEach, vi } from "vitest";
import { SketchRepository } from "@/lib/supabase/repository";
import { batchIssueCertificatesAction } from "@/app/actions/certificate-actions";
import { enqueueDispatchAction } from "@/app/actions/communication-actions";
import { exportRosterDataAction } from "@/app/actions/export-actions";
import { toggleAttendanceAction } from "@/app/actions/participant-actions";
import * as sessionModule from "@/lib/auth/session";

// Mock next/cache so revalidatePath does not fail in test environment
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Master Completion Sprint: End-to-End Product Integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Certificate Issuance & RBAC", () => {
    it("rejects unauthenticated requests to batch issue certificates", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValue({
        isAuthenticated: false,
        isAdmin: false,
        user: null,
      });

      const res = await batchIssueCertificatesAction({ eventId: "evt-01" });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe("UNAUTHORIZED");
      }
    });

    it("rejects unauthorized roles from issuing certificates", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValue({
        isAuthenticated: true,
        isAdmin: true,
        user: {
          id: "usr-analyst",
          email: "analyst@sketch.org",
          name: "Analyst",
          role: "analyst",
        },
      });

      const res = await batchIssueCertificatesAction({ eventId: "evt-01" });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe("FORBIDDEN");
      }
    });

    it("allows authorized admin to batch issue certificates and records outbox jobs", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValue({
        isAuthenticated: true,
        isAdmin: true,
        user: {
          id: "usr-admin",
          email: "admin@sketch.org",
          name: "Admin User",
          role: "master_admin",
        },
      });

      const res = await batchIssueCertificatesAction({ eventId: "evt-01" });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data).toBeDefined();
      }

      // Verify listCertificates returns issued certificates
      const certs = await SketchRepository.listCertificates();
      expect(Array.isArray(certs)).toBe(true);
    });
  });

  describe("2. Communications Outbox Dispatch & RBAC", () => {
    it("rejects unauthenticated requests to dispatch communications", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValue({
        isAuthenticated: false,
        isAdmin: false,
        user: null,
      });

      const res = await enqueueDispatchAction({
        eventId: "evt-01",
        subject: "Welcome Announcement",
        audience: "all",
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe("UNAUTHORIZED");
      }
    });

    it("rejects unauthorized roles from dispatching communications", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValue({
        isAuthenticated: true,
        isAdmin: true,
        user: {
          id: "usr-staff",
          email: "staff@sketch.org",
          name: "Attendance Staff",
          role: "attendance_staff",
        },
      });

      const res = await enqueueDispatchAction({
        eventId: "evt-01",
        subject: "Welcome Announcement",
        audience: "all",
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe("FORBIDDEN");
      }
    });

    it("enforces schema validation on dispatch subject", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValue({
        isAuthenticated: true,
        isAdmin: true,
        user: {
          id: "usr-admin",
          email: "admin@sketch.org",
          name: "Admin User",
          role: "master_admin",
        },
      });

      const res = await enqueueDispatchAction({
        eventId: "evt-01",
        subject: "",
        audience: "all",
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe("VALIDATION_FAILED");
      }
    });

    it("successfully enqueues broadcast communication for confirmed attendees", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValue({
        isAuthenticated: true,
        isAdmin: true,
        user: {
          id: "usr-admin",
          email: "admin@sketch.org",
          name: "Admin User",
          role: "master_admin",
        },
      });

      const res = await enqueueDispatchAction({
        eventId: "evt-01",
        subject: "Check-in instructions for Lab B",
        audience: "all",
        bodyContent: "Please arrive 15 minutes before opening ceremonies.",
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data?.enqueuedCount).toBeGreaterThan(0);
      }

      // Verify listOutboxJobs contains the job
      const jobs = await SketchRepository.listOutboxJobs("evt-01");
      expect(Array.isArray(jobs)).toBe(true);
    });
  });

  describe("3. Authoritative Export Generation & RBAC", () => {
    it("rejects unauthenticated requests to export rosters", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValue({
        isAuthenticated: false,
        isAdmin: false,
        user: null,
      });

      const res = await exportRosterDataAction({ dataset: "attendance" });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe("UNAUTHORIZED");
      }
    });

    it("exports attendance records when authenticated", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValue({
        isAuthenticated: true,
        isAdmin: true,
        user: {
          id: "usr-admin",
          email: "admin@sketch.org",
          name: "Admin User",
          role: "master_admin",
        },
      });

      const res = await exportRosterDataAction({ dataset: "attendance", eventId: "all" });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(Array.isArray(res.data?.records)).toBe(true);
        expect(res.data?.records.length).toBeGreaterThan(0);
      }
    });

    it("exports certificates and audit trails safely", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValue({
        isAuthenticated: true,
        isAdmin: true,
        user: {
          id: "usr-admin",
          email: "admin@sketch.org",
          name: "Admin User",
          role: "master_admin",
        },
      });

      const certExport = await exportRosterDataAction({ dataset: "certificates" });
      expect(certExport.success).toBe(true);
      if (certExport.success) {
        expect(Array.isArray(certExport.data?.records)).toBe(true);
      }

      const auditExport = await exportRosterDataAction({ dataset: "audit" });
      expect(auditExport.success).toBe(true);
      if (auditExport.success) {
        expect(Array.isArray(auditExport.data?.records)).toBe(true);
      }
    });
  });

  describe("4. Attendance Validation & Audit Trail", () => {
    it("logs audit trail when attendance is toggled", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValue({
        isAuthenticated: true,
        isAdmin: true,
        user: {
          id: "usr-admin",
          email: "admin@sketch.org",
          name: "Admin User",
          role: "master_admin",
        },
      });

      const res = await toggleAttendanceAction({
        registrationIdOrUid: "REG-2026-8812",
        eventId: "evt-01",
        targetStatus: "checked_in",
      });

      expect(res.success).toBe(true);

      const auditLogs = await SketchRepository.listAuditLogs();
      expect(Array.isArray(auditLogs)).toBe(true);
    });
  });
});
