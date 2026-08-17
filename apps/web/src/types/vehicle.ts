/**
 * Vehicle attribute types matching backend Pydantic models
 *
 * Matches: apps/api/src/prosell/application/dto/product/attributes.py
 */

/**
 * Vehicle-specific product attributes
 *
 * Validates all vehicle-related fields with proper constraints.
 * Uses strict mode to ensure data integrity.
 */
export interface VehicleAttributes {
  category: "vehicle";

  // Basic vehicle info
  vin: string; // 17 chars, pattern: ^[A-HJ-NPR-Z0-9]{17}$
  make: string; // 1-100 chars
  model: string; // 1-100 chars
  year: number; // 1900-2100
  trim?: string; // 0-100 chars
  body_type?: string; // 0-50 chars (e.g., Sedan, SUV, Truck, Coupe)

  // Drivetrain and transmission
  drivetrain?: string; // 0-50 chars (e.g., FWD, RWD, AWD, 4WD)
  transmission?: string; // 0-50 chars (e.g., Automatic, Manual, CVT)

  // Engine and fuel
  engine?: string; // 0-100 chars (e.g., 2.5L 4-Cylinder)
  fuel_type?: string; // 0-50 chars (e.g., Gasoline, Hybrid, Electric, Diesel)

  // Fuel economy (MPG)
  mpg_city?: number; // 0-150
  mpg_highway?: number; // 0-150
  mpg_combined?: number; // 0-150

  // Mileage
  mileage: number; // >= 0
  mileage_unit?: "miles" | "km"; // default: 'miles'

  // Colors
  exterior_color?: string; // 0-100 chars
  interior_color?: string; // 0-100 chars

  // Features (boolean flags)
  has_sunroof?: boolean; // default: false
  has_navigation?: boolean; // default: false
  has_leather?: boolean; // default: false
  has_backup_camera?: boolean; // default: false
  has_bluetooth?: boolean; // default: false
  has_remote_start?: boolean; // default: false

  // Seat material
  seat_material?: string; // 0-50 chars (e.g., Cloth, Leather, Vinyl)

  // Branch info
  stock_number?: string; // 0-100 chars
  vin_verified?: boolean; // default: false
}

/**
 * Real estate-specific product attributes
 */
export interface RealEstateAttributes {
  category: "real_estate";

  property_type: string; // 1-50 chars
  sq_meters: number; // >= 0
  rooms: number; // 0-50
  bathrooms: number; // 0-20
  year_built?: number; // 1800-2100

  parking_spaces?: number; // 0-20

  has_pool?: boolean;
  has_garden?: boolean;
}

/**
 * Generic product attributes for non-vehicle, non-real-estate categories
 */
export interface GenericProductAttributes {
  category: "generic";
  [key: string]: unknown; // Allow any additional fields
}

/**
 * Discriminated union of all product attribute types
 */
export type ProductAttributes =
  VehicleAttributes | RealEstateAttributes | GenericProductAttributes;

/**
 * Type guard to check if attributes are vehicle attributes
 *
 * Two accepted shapes:
 *  1. **Discriminated** (form-driven creation): `{ category: "vehicle", vin, make, ... }`
 *  2. **Legacy / bulk-upload** (no discriminator): `{ vin, make, year, model, mileage, ... }`
 *
 * The bulk-upload CSV flow does NOT stamp `category: "vehicle"` on the
 * attributes JSONB column, so the strict `category === "vehicle"` check would
 * silently filter out every bulk-uploaded product from the vehicle attribute
 * renderer. We treat the presence of the canonical vehicle core (`vin` + `make`
 * + `year` + `model`) as a positive signal instead — the fields are
 * `Required<VehicleAttributes>` minus the discriminator, so anything that
 * has all four of them is unambiguously a vehicle record.
 */
export function isVehicleAttributes(
  attrs: unknown,
): attrs is VehicleAttributes {
  if (typeof attrs !== "object" || attrs === null) return false;
  if ("category" in attrs) {
    return (attrs as { category: unknown }).category === "vehicle";
  }
  // ponytail: bulk-upload fallback — accept any record that has the four
  // canonical vehicle fields. Real-estate and generic schemas never carry
  // `vin` + `make` + `year` + `model` together, so this is collision-free.
  const a = attrs as Record<string, unknown>;
  return (
    typeof a.vin === "string" &&
    a.vin.length > 0 &&
    typeof a.make === "string" &&
    a.make.length > 0 &&
    typeof a.model === "string" &&
    a.model.length > 0 &&
    typeof a.year === "number"
  );
}

/**
 * Type guard to check if attributes are real estate attributes
 */
export function isRealEstateAttributes(
  attrs: unknown,
): attrs is RealEstateAttributes {
  return (
    typeof attrs === "object" &&
    attrs !== null &&
    "category" in attrs &&
    (attrs as RealEstateAttributes).category === "real_estate"
  );
}

/**
 * Type guard to check if attributes are generic attributes.
 * Also serves as fallback when category is missing or unrecognized.
 */
export function isGenericAttributes(
  attrs: unknown,
): attrs is GenericProductAttributes {
  if (typeof attrs !== "object" || attrs === null) return false;
  // Explicit generic
  if (
    "category" in attrs &&
    (attrs as GenericProductAttributes).category === "generic"
  ) {
    return true;
  }
  // Fallback: no category field or unrecognized category → treat as generic
  // ponytail: legacy products may lack category discriminator
  if (!("category" in attrs)) return true;
  const cat = (attrs as { category: unknown }).category;
  return cat !== "vehicle" && cat !== "real_estate";
}
