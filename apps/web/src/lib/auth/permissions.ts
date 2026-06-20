/**
 * Frontend mirror of the backend RBAC model.
 *
 * Source of truth: apps/api/src/prosell/domain/entities/role.py
 * (`Permission` enum + `ROLE_PERMISSIONS` map). Keep these in sync —
 * this is UI-gating only, the backend re-checks every permission on
 * every request.
 */

export enum Permission {
  USER_CREATE = "user:create",
  USER_READ = "user:read",
  USER_UPDATE = "user:update",
  USER_DELETE = "user:delete",

  ROLE_CREATE = "role:create",
  ROLE_READ = "role:read",
  ROLE_UPDATE = "role:update",
  ROLE_DELETE = "role:delete",

  ORG_CREATE = "org:create",
  ORG_READ = "org:read",
  ORG_UPDATE = "org:update",
  ORG_DELETE = "org:delete",

  VEHICLE_CREATE = "vehicle:create",
  VEHICLE_READ = "vehicle:read",
  VEHICLE_UPDATE = "vehicle:update",
  VEHICLE_DELETE = "vehicle:delete",

  DEALER_ADMIN_VIEW_ALL = "dealer:admin_view_all",
  MARKETPLACE_PUBLISH = "marketplace:publish",

  ANALYTICS_VIEW = "analytics:view",
  ANALYTICS_EXPORT = "analytics:export",

  SETTINGS_READ = "settings:read",
  SETTINGS_UPDATE = "settings:update",
}

export type RoleType =
  | "super_admin"
  | "admin"
  | "manager"
  | "sales_agent"
  | "sales_user"
  | "viewer";

export const ROLE_PERMISSIONS: Record<RoleType, Permission[]> = {
  super_admin: Object.values(Permission),
  admin: [
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.ORG_READ,
    Permission.ORG_UPDATE,
    Permission.VEHICLE_CREATE,
    Permission.VEHICLE_READ,
    Permission.VEHICLE_UPDATE,
    Permission.VEHICLE_DELETE,
    Permission.DEALER_ADMIN_VIEW_ALL,
    Permission.MARKETPLACE_PUBLISH,
    Permission.ANALYTICS_VIEW,
    Permission.ANALYTICS_EXPORT,
    Permission.SETTINGS_READ,
    Permission.SETTINGS_UPDATE,
  ],
  manager: [
    Permission.USER_READ,
    Permission.ORG_READ,
    Permission.VEHICLE_CREATE,
    Permission.VEHICLE_READ,
    Permission.VEHICLE_UPDATE,
    Permission.VEHICLE_DELETE,
    Permission.MARKETPLACE_PUBLISH,
    Permission.ANALYTICS_VIEW,
    Permission.ANALYTICS_EXPORT,
    Permission.SETTINGS_READ,
  ],
  sales_agent: [
    Permission.VEHICLE_CREATE,
    Permission.VEHICLE_READ,
    Permission.VEHICLE_UPDATE,
    Permission.ANALYTICS_VIEW,
  ],
  sales_user: [Permission.VEHICLE_READ, Permission.ANALYTICS_VIEW],
  viewer: [Permission.VEHICLE_READ, Permission.ANALYTICS_VIEW],
};

function isKnownRole(role: string): role is RoleType {
  return role in ROLE_PERMISSIONS;
}

/** Permissions granted to a role string, or `[]` for null/unknown roles. */
export function getPermissionsForRole(role: string | null): Permission[] {
  if (!role || !isKnownRole(role)) {
    return [];
  }
  return ROLE_PERMISSIONS[role];
}
