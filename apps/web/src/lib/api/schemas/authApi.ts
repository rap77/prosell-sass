/**
 * Zod schemas for the auth endpoints.
 *
 * Validates the wire shape at the HTTP boundary instead of trusting the
 * generic `handleResponse<T>` cast on `response.json()`. `.passthrough()`
 * tolerates backend fields the auth UI doesn't render yet (mirrors the
 * `leads.ts`/`appointments.ts` schema convention).
 */

import { z } from "zod";

export const UserResponseSchema = z
  .object({
    id: z.string(),
    email: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    role: z.string(),
    is_email_verified: z.boolean(),
    is_2fa_enabled: z.boolean().optional(),
    organization_id: z.string().nullable().optional(),
  })
  .passthrough();

export const LoginResponseSchema = z
  .object({
    user: UserResponseSchema,
  })
  .passthrough();

export const RegisterResponseSchema = z
  .object({
    user_id: z.string(),
    email: z.string(),
    status: z.string(),
    message: z.string(),
  })
  .passthrough();

export const MessageResponseSchema = z
  .object({
    message: z.string(),
  })
  .passthrough();

export const Enable2FAResponseSchema = z
  .object({
    qr_code: z.string(),
    backup_codes: z.array(z.string()),
  })
  .passthrough();

export type UserResponse = z.infer<typeof UserResponseSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;
export type MessageResponse = z.infer<typeof MessageResponseSchema>;
export type Enable2FAResponse = z.infer<typeof Enable2FAResponseSchema>;
