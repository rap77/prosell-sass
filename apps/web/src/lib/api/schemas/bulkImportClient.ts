/**
 * F01 — Client CSV Bulk Import Zod schemas.
 *
 * Mirrors the backend DTOs in
 * apps/api/src/prosell/application/dto/product/bulk_upload.py
 *
 * Used by the F01 frontend (preview wizard + ZIP-based image upload)
 * to validate responses from:
 *   POST /api/v1/products/bulk-upload/preview
 *   POST /api/v1/products/bulk-upload/with-images
 *
 * Convention: every Zod schema here has a corresponding parse helper
 * called from the hooks (safeParse → throw if invalid).
 */

import { z } from "zod";

// ─── Preview endpoint schemas ────────────────────────────────────────────────

/**
 * One row of the preview response. Shows what the backend WOULD do for
 * the row, without actually doing it.
 */
export const PreviewRowSchema = z.object({
  row_number: z.number().int(),
  vin: z.string(),
  title: z.string(),
  importable: z.boolean(),
  mapped_fields: z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
  ),
  missing_fields: z.array(z.string()),
  unmapped_csv_columns: z.array(z.string()),
  images_found: z.array(z.string()),
  errors: z.array(z.string()),
});

export type PreviewRow = z.infer<typeof PreviewRowSchema>;

export const PreviewSummarySchema = z.object({
  importable_count: z.number().int(),
  error_count: z.number().int(),
  images_count: z.number().int(),
});

export type PreviewSummary = z.infer<typeof PreviewSummarySchema>;

export const BulkUploadPreviewSchema = z.object({
  total_rows: z.number().int(),
  rows: z.array(PreviewRowSchema),
  summary: PreviewSummarySchema,
});

export type BulkUploadPreview = z.infer<typeof BulkUploadPreviewSchema>;

function parseBulkUploadPreview(raw: unknown): BulkUploadPreview {
  return BulkUploadPreviewSchema.parse(raw);
}

// ─── Import endpoint schemas ────────────────────────────────────────────────

export const VehicleImportRowSchema = z.object({
  row_number: z.number().int(),
  vin: z.string(),
  product_id: z.string().nullable(),
  images_uploaded: z.number().int(),
  status: z.enum(["imported", "updated", "failed"]),
  errors: z.array(z.string()),
});

export type VehicleImportRow = z.infer<typeof VehicleImportRowSchema>;

export const BulkUploadVehiclesSchema = z.object({
  total_rows: z.number().int(),
  imported_count: z.number().int(),
  updated_count: z.number().int(),
  failed_count: z.number().int(),
  results: z.array(VehicleImportRowSchema),
});

export type BulkUploadVehicles = z.infer<typeof BulkUploadVehiclesSchema>;

function parseBulkUploadVehicles(raw: unknown): BulkUploadVehicles {
  return BulkUploadVehiclesSchema.parse(raw);
}

// ─── Public surface ─────────────────────────────────────────────────────────

export { parseBulkUploadPreview, parseBulkUploadVehicles };
