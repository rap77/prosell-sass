import { z } from "zod";

/**
 * Wire shape of a decoded vehicle from `POST /api/v1/vehicles/decode-vin`.
 *
 * Mirrors the backend's `DecodedVehicle` Pydantic DTO (28 fields, 10 groups).
 * Optional/nullable fields tolerate NHTSA returning partial data.
 */
export const DecodedVehicleSchema = z.object({
  // basic
  year: z.number().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  trim: z.string().nullable().optional(),

  // engine
  engine: z.string().nullable().optional(),
  fuel_type: z.string().nullable().optional(),
  cylinders: z.number().nullable().optional(),
  displacement_l: z.number().nullable().optional(),
  horsepower: z.number().nullable().optional(),
  engine_kw: z.number().nullable().optional(),
  turbo: z.boolean().nullable().optional(),
  transmission: z.string().nullable().optional(),

  // dimensions
  body_type: z.string().nullable().optional(),
  drivetrain: z.string().nullable().optional(),
  doors: z.number().nullable().optional(),
  windows: z.number().nullable().optional(),
  wheelbase_type: z.string().nullable().optional(),
  bed_type: z.string().nullable().optional(),
  cab_type: z.string().nullable().optional(),

  // capacity
  seats: z.number().nullable().optional(),
  seat_rows: z.number().nullable().optional(),
  seatbelts: z.number().nullable().optional(),
  gvwr: z.number().nullable().optional(),

  // electric
  electrification_level: z.string().nullable().optional(),
  battery_kwh: z.number().nullable().optional(),
  battery_type: z.string().nullable().optional(),
  charger_level: z.string().nullable().optional(),
  charger_power_kw: z.number().nullable().optional(),
  ev_drive_unit: z.string().nullable().optional(),

  // manufacturing
  manufacturer: z.string().nullable().optional(),
  plant_city: z.string().nullable().optional(),
  plant_state: z.string().nullable().optional(),
  plant_country: z.string().nullable().optional(),
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
