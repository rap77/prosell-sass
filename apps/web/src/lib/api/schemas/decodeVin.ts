import { z } from "zod";

/**
 * Wire shape of a decoded vehicle from `POST /api/v1/vehicles/decode-vin`.
 *
 * Mirrors the backend's `DecodedVehicle` Pydantic DTO. Optional fields
 * tolerate the NHTSA decoder returning partial data for incomplete VINs.
 */
export const DecodedVehicleSchema = z.object({
  year: z.number().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  trim: z.string().optional(),
  body_type: z.string().optional(),
  drivetrain: z.string().nullable().optional(),
  transmission: z.string().nullable().optional(),
  fuel_type: z.string().nullable().optional(),
  engine: z.string().nullable().optional(),
});

/**
 * Wire shape of the full response from `POST /api/v1/vehicles/decode-vin`.
 * `vin` lives at the top level of the response, not inside `vehicle`.
 */
export const DecodeVinResponseSchema = z.object({
  vin: z.string(),
  vehicle: DecodedVehicleSchema,
});

// vin is at the top level of the response and merged in by the hook
export type DecodedVehicle = z.infer<typeof DecodedVehicleSchema> & {
  vin: string;
};
