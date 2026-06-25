/**
 * Zod schemas for the Next.js auth route handlers (`app/api/auth/*`).
 *
 * Validates the backend response at the wire boundary instead of trusting
 * a bare `as X` cast on `response.json()` (mirrors the `schemas/authApi.ts`
 * convention used by the `lib/api` clients).
 */

import { z } from "zod";

export const BackendRefreshResponseSchema = z
  .object({
    access_token: z.string(),
    refresh_token: z.string(),
  })
  .passthrough();

export const AuthStateResponseSchema = z
  .object({
    isAuthenticated: z.boolean(),
    user: z
      .object({
        id: z.string(),
        email: z.string(),
        first_name: z.string(),
        last_name: z.string(),
        role: z.string(),
        is_email_verified: z.boolean(),
        is_2fa_enabled: z.boolean(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export type BackendRefreshResponse = z.infer<
  typeof BackendRefreshResponseSchema
>;
export type AuthStateResponse = z.infer<typeof AuthStateResponseSchema>;
