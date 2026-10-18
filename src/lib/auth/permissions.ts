import { AdminRole } from "@/types";

export type Permission =
  | "events:view"
  | "events:create"
  | "events:edit"
  | "events:publish"
  | "events:delete"
  | "registrations:view"
  | "registrations:modify"
  | "attendance:view"
  | "attendance:scan"
  | "attendance:override"
  | "certificates:view"
  | "certificates:issue"
  | "communications:view"
  | "communications:send"
  | "analytics:view"
  | "exports:download"
  | "audit:view"
  | "settings:manage";

export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  master_admin: [
    "events:view",
    "events:create",
    "events:edit",
    "events:publish",
    "events:delete",
    "registrations:view",
    "registrations:modify",
    "attendance:view",
    "attendance:scan",
    "attendance:override",
    "certificates:view",
    "certificates:issue",
    "communications:view",
    "communications:send",
    "analytics:view",
    "exports:download",
    "audit:view",
    "settings:manage",
  ],
  event_manager: [
    "events:view",
    "events:create",
    "events:edit",
    "events:publish",
    "registrations:view",
    "registrations:modify",
    "attendance:view",
    "attendance:scan",
    "attendance:override",
    "certificates:view",
    "certificates:issue",
    "communications:view",
    "communications:send",
    "analytics:view",
    "exports:download",
    "audit:view",
  ],
  attendance_staff: [
    "events:view",
    "registrations:view",
    "attendance:view",
    "attendance:scan",
    "attendance:override",
  ],
  analyst: [
    "events:view",
    "registrations:view",
    "analytics:view",
    "exports:download",
    "audit:view",
  ],
};

/**
 * Checks whether an admin role has a specific permission
 */
export function hasPermission(role: AdminRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.includes(permission);
}

/**
 * Checks if a route path requires a specific permission
 */
export function getRequiredPermissionForPath(pathname: string): Permission | null {
  if (pathname === "/settings") return "settings:manage";
  if (pathname === "/events/new") return "events:create";
  if (pathname === "/attendance") return "attendance:view";
  if (pathname === "/certificates") return "certificates:view";
  if (pathname === "/communications") return "communications:view";
  if (pathname === "/analytics") return "analytics:view";
  if (pathname === "/exports") return "exports:download";
  if (pathname === "/audit") return "audit:view";
  if (pathname === "/participants") return "registrations:view";
  if (pathname === "/teams") return "registrations:view";
  if (pathname === "/rounds") return "events:view";
  if (pathname.startsWith("/events")) return "events:view";
  if (pathname === "/") return "events:view"; // Dashboard requires basic event access
  return null;
}
