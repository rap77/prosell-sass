/**
 * Zod schemas for the admin dealer endpoints (Subsystem D Phase 4 backend).
 *
 * Validates the wire shape at the HTTP boundary:
 *   GET /api/v1/admin/dealers              → DealerListResponseSchema
 *   GET /api/v1/admin/dealers/{id}/products → DealerProductListResponseSchema
 *
 * `.passthrough()` on the item schemas tolerates backend fields the
 * dealer admin UI doesn't render yet (mirrors the `category.ts` schema
 * convention).
 */

import { z } from "zod";

export const DealerSchema = z
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

export type Dealer = z.infer<typeof DealerSchema>;

export const DealerListResponseSchema = z.object({
  organizations: z.array(DealerSchema),
  total: z.number(),
  skip: z.number(),
  limit: z.number(),
});

export const DealerProductSchema = z
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

export type DealerProduct = z.infer<typeof DealerProductSchema>;

export const DealerProductListResponseSchema = z.object({
  products: z.array(DealerProductSchema),
  total: z.number(),
  skip: z.number(),
  limit: z.number(),
});

export const CreateDealerResponseSchema = z.object({
  invitation_id: z.string(),
  organization_id: z.string(),
  email: z.string(),
  status: z.string(),
});

export type CreateDealerResponse = z.infer<typeof CreateDealerResponseSchema>;

export const UpdateDealerResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    status: z.string(),
  })
  .passthrough();

export type UpdateDealerResponse = z.infer<typeof UpdateDealerResponseSchema>;

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
