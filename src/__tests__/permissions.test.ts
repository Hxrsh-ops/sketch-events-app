import { describe, it, expect, beforeEach } from "vitest";
import { ROLE_PERMISSIONS, hasPermission, getRequiredPermissionForPath } from "@/lib/auth/permissions";
import { AdminRole } from "@/types";

describe("Slice 2: Server-Side Authorization & Role-Based Access Control", () => {
  it("enforces least-privilege matrix for all four roles", () => {
    // 1. master_admin has full permissions
    expect(hasPermission("master_admin", "settings:manage")).toBe(true);
    expect(hasPermission("master_admin", "events:delete")).toBe(true);
    expect(hasPermission("master_admin", "events:create")).toBe(true);

    // 2. event_manager has operations and communications, but NOT settings:manage or events:delete
    expect(hasPermission("event_manager", "events:create")).toBe(true);
    expect(hasPermission("event_manager", "certificates:issue")).toBe(true);
    expect(hasPermission("event_manager", "settings:manage")).toBe(false);
    expect(hasPermission("event_manager", "events:delete")).toBe(false);

    // 3. attendance_staff only has scan/override, cannot create events or view analytics
    expect(hasPermission("attendance_staff", "attendance:scan")).toBe(true);
    expect(hasPermission("attendance_staff", "attendance:override")).toBe(true);
    expect(hasPermission("attendance_staff", "events:create")).toBe(false);
    expect(hasPermission("attendance_staff", "analytics:view")).toBe(false);
    expect(hasPermission("attendance_staff", "certificates:issue")).toBe(false);

    // 4. analyst only has analytics and exports, cannot scan attendance or mutate events
    expect(hasPermission("analyst", "analytics:view")).toBe(true);
    expect(hasPermission("analyst", "exports:download")).toBe(true);
    expect(hasPermission("analyst", "attendance:scan")).toBe(false);
    expect(hasPermission("analyst", "events:create")).toBe(false);
    expect(hasPermission("analyst", "events:edit")).toBe(false);
  });

  it("denies all permissions when role is null or undefined", () => {
    expect(hasPermission(null, "events:view")).toBe(false);
    expect(hasPermission(undefined, "events:view")).toBe(false);
  });

  it("maps protected administrative routes to requisite permissions correctly", () => {
    expect(getRequiredPermissionForPath("/settings")).toBe("settings:manage");
    expect(getRequiredPermissionForPath("/events/new")).toBe("events:create");
    expect(getRequiredPermissionForPath("/attendance")).toBe("attendance:view");
    expect(getRequiredPermissionForPath("/certificates")).toBe("certificates:view");
    expect(getRequiredPermissionForPath("/analytics")).toBe("analytics:view");
    expect(getRequiredPermissionForPath("/exports")).toBe("exports:download");
    expect(getRequiredPermissionForPath("/audit")).toBe("audit:view");
  });
});
