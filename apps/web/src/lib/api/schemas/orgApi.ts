/**
 * Zod schemas for the org endpoints.
 *
 * Validates the wire shape at the HTTP boundary instead of trusting the
 * generic `handleResponse<T>` cast on `response.json()`. `.passthrough()`
 * tolerates backend fields the org UI doesn't render yet (mirrors the
 * `leads.ts`/`appointments.ts` schema convention).
 */

import { z } from "zod";

export const OrganizationStatusSchema = z.enum([
  "pending_verification",
  "active",
  "suspended",
  "rejected",
]);

export const OrganizationSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    code: z.string().nullable().optional(),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .nullable()
      .optional(),
    tenant_id: z.string(),
    status: OrganizationStatusSchema,
    logo_url: z.string().nullable(),
    banner_url: z.string().nullable(),
    description: z.string().nullable(),
    website: z.string().nullable(),
    phone: z.string().nullable(),
    // Contact
    email: z.string().nullable(),
    whatsapp: z.string().nullable(),
    // Address
    street_address: z.string().nullable(),
    city: z.string().nullable(),
    state: z.string().nullable(),
    postal_code: z.string().nullable(),
    country: z.string().nullable(),
    // Legal
    tax_id: z.string().nullable(),
    // Social
    instagram: z.string().nullable(),
    facebook: z.string().nullable(),
    // Meta
    wallet_id: z.string().nullable(),
    setup_complete: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
    verified_at: z.string().nullable(),
    verified_by: z.string().nullable(),
  })
  .passthrough();

export const OrganizationListResponseSchema = z.object({
  organizations: z.array(OrganizationSchema),
  total: z.number(),
  skip: z.number(),
  limit: z.number(),
});

export type OrganizationStatus = z.infer<typeof OrganizationStatusSchema>;
export type Organization = z.infer<typeof OrganizationSchema>;
export type OrganizationListResponse = z.infer<
  typeof OrganizationListResponseSchema
>;
