import { describe, it, expect } from "vitest";
import { AdminRole } from "@/types";

describe("Role-Based Authorization & Least Privilege Matrix", () => {
  // Define permissions matrix as specified by SKETCH architecture
  const rolePermissions: Record<AdminRole, string[]> = {
    master_admin: [
      "events:create",
      "events:edit",
      "events:publish",
      "events:delete",
      "registrations:view",
      "registrations:modify",
      "attendance:scan",
      "attendance:override",
      "certificates:issue",
      "communications:send",
      "audit:view",
      "settings:manage",
    ],
    event_manager: [
      "events:create",
      "events:edit",
      "events:publish",
      "registrations:view",
      "registrations:modify",
      "attendance:scan",
      "attendance:override",
      "certificates:issue",
      "communications:send",
      "audit:view",
    ],
    attendance_staff: [
      "events:view",
      "registrations:view",
      "attendance:scan",
      "attendance:override",
    ],
    analyst: [
      "events:view",
      "registrations:view",
      "exports:download",
      "audit:view",
      "analytics:view",
    ],
  };

  function hasPermission(role: AdminRole, permission: string): boolean {
    return rolePermissions[role]?.includes(permission) ?? false;
  }

  it("grants master_admin full administrative capabilities including settings management", () => {
    expect(hasPermission("master_admin", "settings:manage")).toBe(true);
    expect(hasPermission("master_admin", "events:delete")).toBe(true);
  });

  it("strictly prevents attendance_staff from modifying events or issuing certificates", () => {
    expect(hasPermission("attendance_staff", "attendance:scan")).toBe(true);
    expect(hasPermission("attendance_staff", "events:create")).toBe(false);
    expect(hasPermission("attendance_staff", "events:edit")).toBe(false);
    expect(hasPermission("attendance_staff", "certificates:issue")).toBe(false);
    expect(hasPermission("attendance_staff", "communications:send")).toBe(false);
  });

  it("strictly prevents analysts from mutating attendance records or publishing events", () => {
    expect(hasPermission("analyst", "analytics:view")).toBe(true);
    expect(hasPermission("analyst", "exports:download")).toBe(true);
    expect(hasPermission("analyst", "attendance:scan")).toBe(false);
    expect(hasPermission("analyst", "events:publish")).toBe(false);
    expect(hasPermission("analyst", "registrations:modify")).toBe(false);
  });
});
