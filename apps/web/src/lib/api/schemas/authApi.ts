/**
 * Zod schemas for the auth endpoints.
 *
 * Validates the wire shape at the HTTP boundary instead of trusting the
 * generic `handleResponse<T>` cast on `response.json()`. `z.looseObject()`
 * tolerates backend fields the auth UI doesn't render yet (mirrors the
 * `leads.ts`/`appointments.ts` schema convention).
 */

import { z } from "zod";

export const UserResponseSchema = z.looseObject({
  id: z.string(),
  email: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  role: z.string(),
  is_email_verified: z.boolean(),
  is_2fa_enabled: z.boolean().optional(),
  organization_id: z.string().nullable().optional(),
});

// Backend UserInfo shape returned by POST /auth/login (full_name + roles[])
// differs from GET /auth/me (first_name + last_name + role).
const LoginUserInfoSchema = z.looseObject({
  id: z.string(),
  email: z.string(),
  full_name: z.string(),
  avatar_url: z.string().nullable().optional(),
  roles: z.array(z.string()).optional(),
  tenant_id: z.string(),
});

export const LoginResponseSchema = z.looseObject({
  user: LoginUserInfoSchema,
});

export const RegisterResponseSchema = z.looseObject({
  user_id: z.string(),
  email: z.string(),
  status: z.string(),
  message: z.string(),
});

export const MessageResponseSchema = z.looseObject({
  message: z.string(),
});

export const Enable2FAResponseSchema = z.looseObject({
  qr_code: z.string(),
  backup_codes: z.array(z.string()),
});

export type UserResponse = z.infer<typeof UserResponseSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;
export type MessageResponse = z.infer<typeof MessageResponseSchema>;
export type Enable2FAResponse = z.infer<typeof Enable2FAResponseSchema>;
