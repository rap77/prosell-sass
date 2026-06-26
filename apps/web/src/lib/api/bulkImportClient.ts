/**
 * F01 — Client CSV Bulk Import hooks.
 *
 * Two TanStack Query mutations:
 *   - usePreviewBulkUpload: dry-run analysis via POST /bulk-upload/preview
 *   - useBulkUploadVehicles: real import via POST /bulk-upload/with-images
 *
 * Both send multipart/form-data (CSV file + optional ZIP for /with-images).
 * Both validate the response with a Zod parse before returning — never
 * unvalidated `as X` casts (see CLAUDE.md "Zero unvalidated `as X` casts").
 */

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import {
  parseBulkUploadPreview,
  parseBulkUploadVehicles,
  type BulkUploadPreview,
  type BulkUploadVehicles,
} from "./schemas/bulkImportClient";

const ErrorBodySchema = z.object({ detail: z.string().optional() });
function parseErrorDetail(body: unknown): string | undefined {
  return ErrorBodySchema.safeParse(body).data?.detail;
}

// ─── Preview (dry-run) ───────────────────────────────────────────────────────

/**
 * POST /api/v1/products/bulk-upload/preview
 *
 * Sends a CSV file to the backend. Backend runs the field mapper and image
 * mapper (if ZIP provided) and returns per-row analysis WITHOUT writing to
 * the DB. The caller renders the preview table and decides whether to
 * proceed with the real import.
 *
 * @param csvFile CSV file from the client (semicolon-delimited, 24 columns)
 * @param imagesZip Optional ZIP archive of vehicle images
 * @returns BulkUploadPreview
 */
export function usePreviewBulkUpload() {
  return useMutation<
    BulkUploadPreview,
    Error,
    { csv: File; zip?: File | null }
  >({
    mutationFn: async ({ csv, zip }) => {
      const formData = new FormData();
      formData.append("csv_file", csv);
      if (zip) {
        formData.append("images_zip", zip);
      }

      const res = await fetch("/api/v1/products/bulk-upload/preview", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(parseErrorDetail(body) ?? "Preview failed");
      }

      return parseBulkUploadPreview(await res.json());
    },

    onError: (err) => {
      toast.error(err.message || "Failed to preview CSV");
    },
  });
}

// ─── Real import ─────────────────────────────────────────────────────────────

export interface BulkUploadVehiclesInput {
  csv: File;
  zip?: File | null;
  organizationId: string;
  categoryId: string;
}

/**
 * POST /api/v1/products/bulk-upload/with-images
 *
 * Real import. Backend upserts products by VIN (UPDATE if exists, INSERT
 * otherwise), uploads matched images to DO Spaces, and records the
 * associations in `product_images`.
 *
 * Requires super_admin role (gated at the page level; backend also
 * enforces via JWT roles).
 *
 * @returns BulkUploadVehicles with per-row results
 */
export function useBulkUploadVehicles() {
  const queryClient = useQueryClient();

  return useMutation<BulkUploadVehicles, Error, BulkUploadVehiclesInput>({
    mutationFn: async ({ csv, zip, organizationId, categoryId }) => {
      const formData = new FormData();
      formData.append("csv_file", csv);
      if (zip) {
        formData.append("images_zip", zip);
      }
      formData.append("organization_id", organizationId);
      formData.append("category_id", categoryId);

      const res = await fetch("/api/v1/products/bulk-upload/with-images", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(parseErrorDetail(body) ?? "Import failed");
      }

      return parseBulkUploadVehicles(await res.json());
    },

    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["catalog"] });

      const total = result.imported_count + result.updated_count;
      if (result.failed_count === 0) {
        toast.success(
          `Importación completa: ${result.imported_count} nuevos, ${result.updated_count} actualizados`,
        );
      } else {
        toast.warning(
          `Importación parcial: ${total} OK, ${result.failed_count} fallaron`,
        );
      }
    },

    onError: (err) => {
      toast.error(err.message || "Failed to import vehicles");
    },
  });
}
