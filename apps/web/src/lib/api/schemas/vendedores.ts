/**
 * Zod schema for the vendedores list endpoint.
 *
 * Validates the wire shape at the HTTP boundary instead of trusting an
 * `as BackendVendedorListResponse` cast on `res.json()`.
 */

import { z } from "zod";

const BackendVendedorResponseSchema = z
  .object({
    id: z.string(),
    user_id: z.string(),
    tenant_id: z.string(),
    name: z.string(),
    email: z.string(),
    role: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .passthrough();

export const BackendVendedorListResponseSchema = z.object({
  items: z.array(BackendVendedorResponseSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

export type BackendVendedorResponse = z.infer<
  typeof BackendVendedorResponseSchema
>;
