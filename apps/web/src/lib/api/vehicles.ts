/**
 * Vehicle-specific hooks that are NOT covered by `lib/api/products.ts`:
 *   - VIN decode (`/api/v1/vehicles/decode-vin`)
 *   - Bulk product upload from CSV
 *
 * All list/get/create/update/delete operations for vehicles now live in
 * `lib/api/products.ts` (the backend exposes a single `/api/v1/products`
 * endpoint with `attributes.category === 'vehicle'` for the vehicle
 * view). The old `/api/v1/vehicles` list endpoint is deprecated.
 *
 * This file used to also export `useVehicles`, `useInfiniteVehicles`,
 * `useVehicle`, `useFeaturedVehicles`, `useUpdateVehicle`,
 * `useDeleteVehicle`, `useCreateVehicle`, `useBulkUploadVehicles`, and
 * the `transformProductToVehicle` / `transformVehicleWithProduct`
 * helpers. They were dead code (the production catalog page uses the
 * equivalents in `lib/api/products.ts`) and have been removed.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { parse } from "csv-parse/sync";
import type { VehicleAttributes } from "@/types/vehicle";

export interface DecodedVehicle {
  vin: string;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  body_type?: string;
  drivetrain?: string;
  transmission?: string;
  fuel_type?: string;
  engine?: string;
}

/**
 * Decode VIN to get vehicle details
 */
export function useDecodeVin() {
  return useMutation({
    mutationFn: async (vin: string) => {
      const res = await fetch(`/api/v1/vehicles/decode-vin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ vin }),
      });

      if (!res.ok) {
        const error = await res
          .json()
          .catch(() => ({ message: "Failed to decode VIN" }));
        throw new Error(error.message || "Failed to decode VIN");
      }

      const data = (await res.json()) as { vehicle: DecodedVehicle };
      return data.vehicle;
    },

    onSuccess: (decodedVehicle) => {
      toast.success("VIN decoded successfully");
      return decodedVehicle;
    },

    onError: (err) => {
      toast.error(err.message || "Failed to decode VIN");
    },
  });
}

/**
 * Bulk upload products via CSV file
 * Maps CSV rows to products with attributes.vin for auto-vehicle creation
 */
export function useBulkUploadProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      // Parse CSV file
      const text = await file.text();
      const records = parse(text, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      }) as Array<Record<string, string>>;

      // Map CSV records to products array
      const products = records.map((row) => ({
        title: row.title || `${row.year} ${row.make} ${row.model}`.trim(),
        price_cents: Math.round(Number(row.price) * 100),
        category_id: row.category_id || "default-category-id", // TODO: Make configurable
        attributes: {
          category: "vehicle" as const,
          vin: row.vin, // REQUIRED - triggers vehicle auto-creation
          year: Number(row.year),
          make: row.make,
          model: row.model,
          trim: row.trim,
          body_type: row.body_type || row.body_style,
          mileage: Number(row.mileage),
          exterior_color: row.exterior_color,
          interior_color: row.interior_color,
          transmission: row.transmission,
          fuel_type: row.fuel_type,
          drivetrain: row.drivetrain,
          engine: row.engine,
        } as VehicleAttributes,
      }));

      // Send to products bulk endpoint
      const res = await fetch("/api/v1/products/bulk", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ products }),
      });

      if (!res.ok) {
        const error = await res
          .json()
          .catch(() => ({ message: "Failed to upload products" }));
        throw new Error(error.message || "Failed to upload products");
      }

      return res.json() as Promise<{
        total_rows: number;
        created_count: number;
        failed_count: number;
        errors: Array<{ row_number: number; vin: string; error: string }>;
      }>;
    },

    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });

      if (result.errors.length === 0) {
        toast.success(`Successfully uploaded ${result.created_count} vehicles`);
      } else {
        toast.error(
          `Uploaded ${result.created_count} vehicles, ${result.failed_count} failed. Check errors below.`,
        );
      }
    },

    onError: (err) => {
      toast.error(err.message || "Failed to upload vehicles");
    },
  });
}
