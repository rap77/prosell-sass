/**
 * Zod schema for the product image-URLs API.
 *
 * `GET /api/v1/products/{id}/image-urls` returns time-limited signed
 * download URLs. This is an untrusted network boundary, so the wire
 * shape is validated here before the data flows into the catalog
 * container's image map. The schema is `.passthrough()` so the backend
 * may add fields without breaking the frontend (same convention as
 * `./category`).
 */

import { z } from "zod";

const ProductImageUrlSchema = z
  .object({
    key: z.string(),
    url: z.string(),
    expires_in: z.number(),
  })
  .passthrough();

export const ProductImageUrlsResponseSchema = z
  .object({
    product_id: z.string(),
    images: z.array(ProductImageUrlSchema),
  })
  .passthrough();

export type ProductImageUrlsResponseWire = z.infer<
  typeof ProductImageUrlsResponseSchema
>;
