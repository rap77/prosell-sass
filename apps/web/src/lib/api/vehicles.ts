/**
 * Vehicle-specific hooks that are NOT covered by `lib/api/products.ts`:
 *   - VIN decode (`/api/v1/vehicles/decode-vin`)
 *
 * All list/get/create/update/delete operations for vehicles now live in
 * `lib/api/products.ts` (the backend exposes a single `/api/v1/products`
 * endpoint with `attributes.category === 'vehicle'` for the vehicle
 * view). The old `/api/v1/vehicles` list endpoint is deprecated.
 *
 * Bulk CSV upload also lives in `lib/api/products.ts` as
 * `useBulkUploadProducts` (schema-aware, PR2 — moved out of this file
 * because the old client-side vehicle-only parser was dead on arrival
 * after the backend PR1 schema-aware rewrite).
 *
 * This file used to also export `useVehicles`, `useInfiniteVehicles`,
 * `useVehicle`, `useFeaturedVehicles`, `useUpdateVehicle`,
 * `useDeleteVehicle`, `useCreateVehicle`, `useBulkUploadVehicles`, and
 * the `transformProductToVehicle` / `transformVehicleWithProduct`
 * helpers. They were dead code (the production catalog page uses the
 * equivalents in `lib/api/products.ts`) and have been removed.
 */

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  DecodeVinResponseSchema,
  type DecodedVehicle,
} from "@/lib/api/schemas/decodeVin";

// Re-export so existing `import type { DecodedVehicle } from "@/lib/api/vehicles"`
// callers keep compiling. The canonical type lives in the schema module.
export type { DecodedVehicle };

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

      const data = DecodeVinResponseSchema.parse(await res.json());
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
