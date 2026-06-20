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
    tenant_id: z.string(),
    status: z.string(),
    logo_url: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string(),
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
