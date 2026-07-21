import { z } from "zod";

/**
 * Wire shape for one row-level failure reported by
 * `POST /api/v1/products/bulk-upload` (PR1 backend, `BulkUploadRowError` DTO).
 *
 * `raw_row` is the raw CSV row as a string-keyed record so the modal can
 * show what the user actually uploaded (useful when the failure is a
 * type mismatch — the user can see "I sent the value `twenty thousand`
 * but the schema wants a number").
 */
export const BulkUploadRowErrorSchema = z.object({
  row_number: z.number().int(),
  column: z.string().nullable().optional(),
  message: z.string(),
  raw_row: z.record(z.string(), z.string()).optional().default({}),
});

/**
 * Wire shape for the response of `POST /api/v1/products/bulk-upload`.
 *
 * Mirrors the backend's `BulkUploadUploadResult` DTO (PR1 backend). Used
 * by `useBulkUploadProducts` (in `./products.ts`) and the
 * `BulkUploadErrorModal` to decide whether to show partial-failure UI.
 */
export const BulkUploadUploadResultSchema = z.object({
  upload_id: z.string().uuid(),
  total_rows: z.number().int(),
  created_count: z.number().int(),
  failed_count: z.number().int(),
  errors: z.array(BulkUploadRowErrorSchema),
});

export type BulkUploadRowError = z.infer<typeof BulkUploadRowErrorSchema>;
export type BulkUploadUploadResult = z.infer<
  typeof BulkUploadUploadResultSchema
>;
