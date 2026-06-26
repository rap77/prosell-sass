import { z } from "zod";

/**
 * Wire shape of a decoded vehicle from `POST /api/v1/vehicles/decode-vin`.
 *
 * Mirrors the backend's `DecodedVehicle` Pydantic DTO. Optional fields
 * tolerate the NHTSA decoder returning partial data for incomplete VINs.
 */
export const DecodedVehicleSchema = z.object({
  vin: z.string(),
  year: z.number().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  trim: z.string().optional(),
  body_type: z.string().optional(),
  drivetrain: z.string().optional(),
  transmission: z.string().optional(),
  fuel_type: z.string().optional(),
  engine: z.string().optional(),
});

/**
 * Wire shape of the full response from `POST /api/v1/vehicles/decode-vin`.
 */
export const DecodeVinResponseSchema = z.object({
  vehicle: DecodedVehicleSchema,
});

export type DecodedVehicle = z.infer<typeof DecodedVehicleSchema>;
