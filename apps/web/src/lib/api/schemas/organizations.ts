/**
 * Zod schemas for the admin organization endpoints (Subsystem D Phase 4 backend).
 *
 * Validates the wire shape at the HTTP boundary:
 *   GET /api/v1/admin/organizations              → OrganizationListResponseSchema
 *   GET /api/v1/admin/organizations/{id}/products → OrganizationProductListResponseSchema
 *
 * `.passthrough()` on the item schemas tolerates backend fields the
 * organization admin UI doesn't render yet (mirrors the `category.ts` schema
 * convention).
 */

import { z } from "zod";

export const OrganizationSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    code: z.string().nullable().optional(),
    color: z.string().nullable().optional(),
    tenant_id: z.string(),
    status: z.string(),
    logo_url: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    website: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    // Contact
    email: z.string().nullable().optional(),
    whatsapp: z.string().nullable().optional(),
    // Address
    street_address: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    postal_code: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    // Legal
    tax_id: z.string().nullable().optional(),
    // Social
    instagram: z.string().nullable().optional(),
    facebook: z.string().nullable().optional(),
    // Meta
    created_at: z.string(),
    updated_at: z.string(),
    broker_count: z.number().nullable().optional(),
    owner_email: z.string().nullable().optional(),
  })
  .passthrough();

export type Organization = z.infer<typeof OrganizationSchema>;

export const OrganizationListResponseSchema = z.object({
  organizations: z.array(OrganizationSchema),
  total: z.number(),
  skip: z.number(),
  limit: z.number(),
});

export const OrganizationProductSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    price_cents: z.number(),
    currency: z.string(),
    status: z.string(),
    image_urls: z.array(z.string()).optional(),
    cover_image_key: z.string().nullable().optional(),
    created_at: z.string(),
  })
  .passthrough();

export type OrganizationProduct = z.infer<typeof OrganizationProductSchema>;

export const OrganizationProductListResponseSchema = z.object({
  products: z.array(OrganizationProductSchema),
  total: z.number(),
  skip: z.number(),
  limit: z.number(),
});

export const CreateOrganizationResponseSchema = z.object({
  invitation_id: z.string(),
  organization_id: z.string(),
  email: z.string(),
  status: z.string(),
});

export type CreateOrganizationResponse = z.infer<typeof CreateOrganizationResponseSchema>;

export const UpdateOrganizationResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    status: z.string(),
  })
  .passthrough();

export type UpdateOrganizationResponse = z.infer<typeof UpdateOrganizationResponseSchema>;

// Broker schemas
export const BrokerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable().optional(),
  user_id: z.string().nullable(),
  status: z.enum(["pending", "verified"]),
  created_at: z.string(),
  verified_at: z.string().nullable(),
});

export type Broker = z.infer<typeof BrokerSchema>;

export const BrokerListResponseSchema = z.object({
  brokers: z.array(BrokerSchema),
  count: z.number(),
});
