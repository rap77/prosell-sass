/**
 * Zod schema for the product image-URLs API.
 *
 * `GET /api/v1/products/{id}/image-urls` returns time-limited signed
 * download URLs. This is an untrusted network boundary, so the wire
 * shape is validated here before the data flows into the catalog
 * container's image map. The schema is `z.looseObject()` so the backend
 * may add fields without breaking the frontend (same convention as
 * `./category`).
 */

import { z } from "zod";

const ProductImageUrlSchema = z.looseObject({
  key: z.string(),
  url: z.string(),
  expires_in: z.number(),
});

export const ProductImageUrlsResponseSchema = z.looseObject({
  product_id: z.string(),
  images: z.array(ProductImageUrlSchema),
});

export type ProductImageUrlsResponseWire = z.infer<
  typeof ProductImageUrlsResponseSchema
>;
