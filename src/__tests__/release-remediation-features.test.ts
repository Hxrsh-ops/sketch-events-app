import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { deleteEventAction } from "@/app/actions/event-actions";
import { cancelRegistrationAction } from "@/app/actions/participant-actions";
import * as sessionModule from "@/lib/auth/session";
import { SketchRepository } from "@/lib/supabase/repository";
import { getStoredEvents, saveEvent, getStoredSubmissions, saveSubmission } from "@/lib/registration-store";
import AdminDashboardPage from "@/app/(admin)/page";

// Mock next/cache so revalidatePath does not fail
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Release Remediation: Event Deletion, Registration Cancellation & Overview Page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Event Deletion Action (deleteEventAction)", () => {
    it("rejects unauthenticated caller", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValueOnce({
        isAuthenticated: false,
        isAdmin: false,
        user: null,
      });

      const res = await deleteEventAction({ id: "evt-test-1" });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe("UNAUTHORIZED");
      }
    });

    it("rejects event_manager and unauthorized roles without events:delete permission", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValueOnce({
        isAuthenticated: true,
        isAdmin: true,
        user: {
          id: "usr-mgr",
          name: "Event Manager User",
          email: "manager@sketch.org",
          role: "event_manager",
        },
      });

      const res = await deleteEventAction({ id: "evt-test-1" });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe("FORBIDDEN");
      }
    });

    it("allows master_admin to permanently delete an event", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValueOnce({
        isAuthenticated: true,
        isAdmin: true,
        user: {
          id: "usr-admin",
          name: "Master Admin",
          email: "admin@sketch.org",
          role: "master_admin",
        },
      });

      vi.spyOn(SketchRepository, "deleteEvent").mockResolvedValueOnce(true);
      vi.spyOn(SketchRepository, "logAudit").mockResolvedValueOnce({} as any);

      const res = await deleteEventAction({ id: "evt-to-delete-123" });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.id).toBe("evt-to-delete-123");
        expect(res.message).toContain("permanently removed");
      }
    });

    it("validates empty event ID", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValueOnce({
        isAuthenticated: true,
        isAdmin: true,
        user: {
          id: "usr-admin",
          name: "Master Admin",
          email: "admin@sketch.org",
          role: "master_admin",
        },
      });

      const res = await deleteEventAction({ id: "   " });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe("VALIDATION_FAILED");
      }
    });
  });

  describe("2. Registration Cancellation Action (cancelRegistrationAction)", () => {
    it("rejects unauthenticated caller", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValueOnce({
        isAuthenticated: false,
        isAdmin: false,
        user: null,
      });

      const res = await cancelRegistrationAction({ registrationId: "REG-2026-9999" });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe("UNAUTHORIZED");
      }
    });

    it("rejects attendance_staff and analyst roles without registrations:modify permission", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValueOnce({
        isAuthenticated: true,
        isAdmin: true,
        user: {
          id: "usr-staff",
          name: "Gate Staff",
          email: "staff@sketch.org",
          role: "attendance_staff",
        },
      });

      const res = await cancelRegistrationAction({ registrationId: "REG-2026-9999" });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe("FORBIDDEN");
      }
    });

    it("allows event_manager and master_admin to cancel a registration", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValueOnce({
        isAuthenticated: true,
        isAdmin: true,
        user: {
          id: "usr-mgr",
          name: "Event Manager",
          email: "manager@sketch.org",
          role: "event_manager",
        },
      });

      vi.spyOn(SketchRepository, "cancelRegistration").mockResolvedValueOnce({
        success: true,
        message: "Registration for Jane Doe (REG-2026-9999) was cancelled.",
      });

      const res = await cancelRegistrationAction({
        registrationId: "REG-2026-9999",
        eventId: "evt-001",
        reason: "Attendee requested cancellation",
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.registrationId).toBe("REG-2026-9999");
        expect(res.data.status).toBe("cancelled");
      }
    });
  });

  describe("3. Overview Page Audit (Registration Trends Removal)", () => {
    it("renders the Overview page without the Registration Trends chart or heading", async () => {
      vi.spyOn(SketchRepository, "listEvents").mockResolvedValueOnce([]);
      vi.spyOn(SketchRepository, "listParticipants").mockResolvedValueOnce([]);
      vi.spyOn(SketchRepository, "listCertificates").mockResolvedValueOnce([]);
      vi.spyOn(SketchRepository, "listAdminProfiles").mockResolvedValueOnce([]);

      const pageJsx = await AdminDashboardPage();
      const html = ReactDOMServer.renderToStaticMarkup(pageJsx);

      // Verify Overview page still renders header and KPI cards
      expect(html).toContain("SKETCHHUB WORKSPACE / OVERVIEW");
      expect(html).toContain("Overview");
      expect(html).toContain("Active Events");

      // Verify Registration Trends has been completely removed
      expect(html).not.toContain("Registration Trends");
      expect(html).not.toContain("registrationSeries");
      expect(html).not.toContain("Check-in Velocity");
    });
  });
});
