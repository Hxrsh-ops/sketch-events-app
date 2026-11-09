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
  | "settings:manage"
  | "rounds:manage";

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
    "rounds:manage",
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
    "rounds:manage",
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
  ],
};

/**
 * Route protection mapping specifying which administrator roles are permitted
 * to view and operate each route in the platform.
 */
export const ROUTE_ALLOWED_ROLES: Record<string, AdminRole[]> = {
  "/studio": ["master_admin", "event_manager"],
  "/settings": ["master_admin"],
  "/audit": ["master_admin"],
  "/events/new": ["master_admin", "event_manager"],
  "/rounds": ["master_admin", "event_manager"],
  "/certificates": ["master_admin", "event_manager"],
  "/communications": ["master_admin", "event_manager"],
  "/attendance": ["master_admin", "event_manager", "attendance_staff"],
  "/participants": ["master_admin", "event_manager", "attendance_staff", "analyst"],
  "/teams": ["master_admin", "event_manager", "attendance_staff", "analyst"],
  "/analytics": ["master_admin", "event_manager", "analyst"],
  "/exports": ["master_admin", "event_manager", "analyst"],
  "/events": ["master_admin", "event_manager", "attendance_staff", "analyst"],
  "/": ["master_admin", "event_manager", "attendance_staff", "analyst"],
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
 * Checks if a specific admin role is authorized to access a given pathname
 */
export function isRoleAllowedForRoute(role: AdminRole | null | undefined, pathname: string): boolean {
  if (!role) return false;
  if (role === "master_admin") return true;

  // Exact match
  if (ROUTE_ALLOWED_ROLES[pathname]) {
    return ROUTE_ALLOWED_ROLES[pathname].includes(role);
  }

  // Parameterized match: /events/:id
  if (pathname.startsWith("/events/") && pathname !== "/events/new") {
    return role === "event_manager";
  }

  // Prefix match for subpaths
  for (const [route, allowed] of Object.entries(ROUTE_ALLOWED_ROLES)) {
    if (route !== "/" && pathname.startsWith(route)) {
      return allowed.includes(role);
    }
  }

  return true;
}

/**
 * Checks if a route path requires a specific permission (for sidebar visibility)
 */
export function getRequiredPermissionForPath(pathname: string): Permission | null {
  if (pathname === "/settings") return "settings:manage";
  if (pathname === "/studio" || pathname.startsWith("/studio")) return "events:edit";
  if (pathname === "/audit" || pathname.startsWith("/audit")) return "audit:view";
  if (pathname === "/events/new") return "events:create";
  if (pathname === "/rounds" || pathname.startsWith("/rounds")) return "rounds:manage";
  if (pathname === "/certificates" || pathname.startsWith("/certificates")) return "certificates:view";
  if (pathname === "/communications" || pathname.startsWith("/communications")) return "communications:view";
  if (pathname === "/attendance" || pathname.startsWith("/attendance")) return "attendance:view";
  if (pathname === "/analytics" || pathname.startsWith("/analytics")) return "analytics:view";
  if (pathname === "/exports" || pathname.startsWith("/exports")) return "exports:download";
  if (pathname === "/participants" || pathname.startsWith("/participants")) return "registrations:view";
  if (pathname === "/teams" || pathname.startsWith("/teams")) return "registrations:view";
  if (pathname.startsWith("/events")) return "events:view";
  if (pathname === "/") return "events:view";
  return null;
}
