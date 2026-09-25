import { z } from "zod";

/**
 * Wire shape of `GET /api/v1/vehicles/models?make=...`.
 *
 * Mirrors the backend's `VehicleModelsResponse` Pydantic DTO
 * (vehicle_router.py) — the make -> model dependent select's data
 * source, backed by NHTSA vPIC's `GetModelsForMake`.
 */
export const VehicleModelsResponseSchema = z.object({
  make: z.string(),
  models: z.array(z.string()),
  cached: z.boolean(),
});

export type VehicleModelsResponse = z.infer<typeof VehicleModelsResponseSchema>;
