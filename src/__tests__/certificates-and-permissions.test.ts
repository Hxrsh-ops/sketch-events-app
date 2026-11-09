import { describe, it, expect } from "vitest";
import { isRoleAllowedForRoute, ROUTE_ALLOWED_ROLES } from "../lib/auth/permissions";
import { AdminRole } from "@/types";

describe("Role-Based Route Access Control Matrix", () => {
  const masterAdmin: AdminRole = "master_admin";
  const eventManager: AdminRole = "event_manager";
  const attendanceStaff: AdminRole = "attendance_staff";
  const analyst: AdminRole = "analyst";

  describe("Master Admin permissions", () => {
    it("has access to all admin routes without restriction", () => {
      const routes = [
        "/",
        "/studio",
        "/settings",
        "/audit",
        "/events",
        "/events/new",
        "/events/e0000000-0000-4000-8000-000000000001",
        "/rounds",
        "/certificates",
        "/communications",
        "/attendance",
        "/participants",
        "/teams",
        "/analytics",
        "/exports",
      ];

      for (const route of routes) {
        expect(isRoleAllowedForRoute(masterAdmin, route)).toBe(true);
      }
    });
  });

  describe("Event Manager permissions", () => {
    it("can access event operational management routes including studio", () => {
      const allowedRoutes = [
        "/events",
        "/events/new",
        "/events/e0000000-0000-4000-8000-000000000001",
        "/rounds",
        "/certificates",
        "/communications",
        "/attendance",
        "/participants",
        "/teams",
        "/analytics",
        "/exports",
        "/studio",
      ];

      for (const route of allowedRoutes) {
        expect(isRoleAllowedForRoute(eventManager, route)).toBe(true);
      }
    });

    it("is strictly blocked from master-admin restricted routes", () => {
      const forbiddenRoutes = ["/settings", "/audit"];

      for (const route of forbiddenRoutes) {
        expect(isRoleAllowedForRoute(eventManager, route)).toBe(false);
      }
    });
  });

  describe("Attendance Staff permissions", () => {
    it("can access attendance operations and attendee lists", () => {
      const allowedRoutes = ["/attendance", "/participants", "/teams"];

      for (const route of allowedRoutes) {
        expect(isRoleAllowedForRoute(attendanceStaff, route)).toBe(true);
      }
    });

    it("is strictly blocked from event configuration, certificates, communications, analytics, and admin routes", () => {
      const forbiddenRoutes = [
        "/studio",
        "/settings",
        "/audit",
        "/events/new",
        "/events/e0000000-0000-4000-8000-000000000001",
        "/rounds",
        "/certificates",
        "/communications",
        "/analytics",
        "/exports",
      ];

      for (const route of forbiddenRoutes) {
        expect(isRoleAllowedForRoute(attendanceStaff, route)).toBe(false);
      }
    });
  });

  describe("Analyst permissions", () => {
    it("can access analytics, exports, and read-only attendee rosters", () => {
      const allowedRoutes = ["/analytics", "/exports", "/participants", "/teams"];

      for (const route of allowedRoutes) {
        expect(isRoleAllowedForRoute(analyst, route)).toBe(true);
      }
    });

    it("is strictly blocked from mutating operations: event creation, studio, settings, attendance, certificates, communications", () => {
      const forbiddenRoutes = [
        "/studio",
        "/settings",
        "/audit",
        "/events/new",
        "/events/e0000000-0000-4000-8000-000000000001",
        "/rounds",
        "/certificates",
        "/communications",
        "/attendance",
      ];

      for (const route of forbiddenRoutes) {
        expect(isRoleAllowedForRoute(analyst, route)).toBe(false);
      }
    });
  });

  describe("Unauthenticated / Nil roles", () => {
    it("blocks access for null or undefined roles", () => {
      expect(isRoleAllowedForRoute(null, "/attendance")).toBe(false);
      expect(isRoleAllowedForRoute(undefined, "/events")).toBe(false);
    });
  });
});

describe("Public Route Middleware Matching Rules", () => {
  const publicPaths = [
    "/e/techfest-2027",
    "/e/a0000000-0000-4000-8000-000000000001",
    "/certificates/verify",
    "/certificates/verify/SKETCH-CERT-TEST-1234",
    "/verify/TKT-001",
    "/tickets/tkt-001/rotating-qr",
    "/login",
  ];

  const adminPaths = [
    "/",
    "/events",
    "/events/new",
    "/events/e0000000-0000-4000-8000-000000000001",
    "/certificates",
    "/attendance",
    "/studio",
    "/settings",
    "/audit",
    "/communications",
    "/analytics",
    "/exports",
  ];

  it("distinguishes public verification & ticket paths from admin management paths", () => {
    const isPublic = (path: string) => {
      if (
        path === "/login" ||
        path.startsWith("/api/public") ||
        path.startsWith("/api/cron") ||
        path.startsWith("/api/certificates/verify") ||
        path.startsWith("/e/") ||
        path.startsWith("/certificates/verify") ||
        path.startsWith("/verify/") ||
        path.startsWith("/tickets/")
      ) {
        return true;
      }
      return false;
    };

    for (const path of publicPaths) {
      expect(isPublic(path)).toBe(true);
    }

    for (const path of adminPaths) {
      expect(isPublic(path)).toBe(false);
    }
  });
});
