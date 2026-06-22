/**
 * Single source of truth for reading the "current role" out of the
 * `user_data` cookie/login payload shape: `roles: string[]` (current wire
 * shape) takes precedence over the legacy singular `role` field.
 *
 * Shared between Edge middleware (proxy.ts) and the client auth store
 * (authStore.ts) so the two never drift — see code review finding #5.
 */
export function deriveRoleFromCookieData(data: {
  role?: unknown;
  roles?: unknown;
}): string | null {
  if (Array.isArray(data.roles) && data.roles.length > 0) {
    return String(data.roles[0]);
  }
  return typeof data.role === "string" ? data.role : null;
}
