/**
 * Tests for `getAttributeMap` (Subsystem A typed widening).
 *
 * Pins the contract of the only safe way to bridge
 * `ProductAttributes` (a discriminated union of VehicleAttributes |
 * RealEstateAttributes | GenericProductAttributes) into a flat
 * `Record<string, unknown>` for generic consumers (ProductCard, the
 * catalog filters, etc.).
 *
 * If a new attribute variant is added to `ProductAttributes`, this
 * file MUST be updated — the cast at page.tsx was the previous
 * "implicit" test, and it allowed widening that hid real type leaks.
 */

import { describe, it, expect } from "vitest";
import { getAttributeMap, type Product } from "@/types/product";
import type { VehicleAttributes, RealEstateAttributes } from "@/types/vehicle";

const baseFields = {
  id: "p1",
  tenant_id: "t1",
  organization_id: "o1",
  category_id: "c1",
  is_featured: false,
  view_count: 0,
  favorite_count: 0,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
} as const;

const vehicleProduct: Product = {
  ...baseFields,
  id: "p1",
  title: "Toyota Corolla 2020",
  price_cents: 1850000,
  currency: "USD",
  condition: "used",
  status: "published",
  attributes: {
    category: "vehicle",
    vin: "1HGCM82633A123456",
    make: "Toyota",
    model: "Corolla",
    year: 2020,
    mileage: 50000,
  } satisfies VehicleAttributes,
};

const realEstateProduct: Product = {
  ...baseFields,
  id: "p2",
  category_id: "c2",
  title: "Departamento 3 amb",
  price_cents: 12000000,
  currency: "USD",
  condition: "used",
  status: "published",
  attributes: {
    category: "real_estate",
    property_type: "apartment",
    sq_meters: 75,
    rooms: 3,
    bathrooms: 2,
  } satisfies RealEstateAttributes,
};

const genericProduct: Product = {
  ...baseFields,
  id: "p3",
  category_id: "c3",
  title: "Artículo genérico",
  price_cents: 5000,
  currency: "USD",
  condition: "new",
  status: "published",
  attributes: {
    category: "generic",
  },
};

describe("getAttributeMap", () => {
  it("returns a flat record for vehicle attributes", () => {
    const map = getAttributeMap(vehicleProduct.attributes);
    expect(map.category).toBe("vehicle");
    expect(map.vin).toBe("1HGCM82633A123456");
    expect(map.make).toBe("Toyota");
    expect(map.model).toBe("Corolla");
    expect(map.year).toBe(2020);
  });

  it("returns a flat record for real-estate attributes", () => {
    const map = getAttributeMap(realEstateProduct.attributes);
    expect(map.category).toBe("real_estate");
    expect(map.sq_meters).toBe(75);
    expect(map.rooms).toBe(3);
    expect(map.bathrooms).toBe(2);
  });

  it("returns a flat record for generic attributes", () => {
    const map = getAttributeMap(genericProduct.attributes);
    expect(map.category).toBe("generic");
  });

  it("returns a new object each call (no shared mutable state)", () => {
    // This is the property that makes the widening safe to use as
    // `viewModel.productAttributes` in the catalog container — the
    // card shouldn't accidentally mutate the original product's
    // attributes through the map.
    const a = getAttributeMap(vehicleProduct.attributes);
    const b = getAttributeMap(vehicleProduct.attributes);
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});
