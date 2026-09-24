/**
 * Zod schema for the batch cover-URL API.
 *
 * `POST /api/v1/products/image-urls:batch` returns one signed CDN URL per
 * product (the cover/thumbnail derivative, never the gallery). This
 * schema validates the wire shape before the data flows into the catalog
 * grid's image map. The schema is `z.looseObject()` so the backend may
 * add fields without breaking the frontend (same as the single-product
 * schema in ./productImageUrls.ts).
 */

import { z } from "zod";

const BatchProductCoverUrlItemSchema = z.looseObject({
  product_id: z.string(),
  key: z.string(),
  url: z.string(),
  expires_in: z.number(),
});

export const BatchProductCoverUrlsResponseSchema = z.looseObject({
  covers: z.array(BatchProductCoverUrlItemSchema),
  batch_size: z.number(),
});

export type BatchProductCoverUrlsResponseWire = z.infer<
  typeof BatchProductCoverUrlsResponseSchema
>;
