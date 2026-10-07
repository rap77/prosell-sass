/**
 * Zod schemas for the admin roles (permission profiles) endpoints — bloque 3.
 *
 * Validates the wire shape at the HTTP boundary:
 *   GET    /api/v1/admin/roles              → RoleListResponseSchema
 *   GET    /api/v1/admin/roles/{id}         → RoleSchema
 *   POST   /api/v1/admin/roles              → RoleSchema
 *   PATCH  /api/v1/admin/roles/{id}         → RoleSchema
 *   POST   /api/v1/admin/roles/{id}/clone   → RoleSchema
 *   GET    /api/v1/admin/users/by-email     → UserSummarySchema
 *
 * Mirrors `RoleResponse`/`RoleListResponse` (apps/api/.../dto/role/response.py)
 * and `UserSummaryResponse` (apps/api/.../routers/admin_users_router.py).
 */

import { z } from "zod";

export const RoleGrantSchema = z.object({
  zone: z.string(),
  action: z.string(),
});

export type RoleGrant = z.infer<typeof RoleGrantSchema>;

export const ScopeTypeSchema = z.enum(["own", "all", "explicit", "none"]);

export type ScopeType = z.infer<typeof ScopeTypeSchema>;

export const RoleScopeSchema = z.object({
  scope_type: ScopeTypeSchema,
  organization_ids: z.array(z.string()).default([]),
});

export type RoleScope = z.infer<typeof RoleScopeSchema>;

export const RoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  role_type: z.string().nullable(),
  is_system_role: z.boolean(),
  tenant_id: z.string().nullable(),
  grants: z.array(RoleGrantSchema),
  scope: RoleScopeSchema,
});

export type Role = z.infer<typeof RoleSchema>;

export const RoleListResponseSchema = z.object({
  items: z.array(RoleSchema),
  total: z.number(),
});

export const UserSummarySchema = z.object({
  id: z.string(),
  email: z.string(),
  full_name: z.string(),
  tenant_id: z.string().nullable(),
});

export type UserSummary = z.infer<typeof UserSummarySchema>;

export const UserSummaryListSchema = z.array(UserSummarySchema);
