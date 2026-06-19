/**
 * Shape tests for the Category presentation contract (Subsystem A).
 *
 * Pins the frontend types to the Foundation read-API contract:
 *   docs/superpowers/specs/2026-06-06-category-presentation-foundation-design.md
 *
 * Scope: types only — the `Product.status` ↔ `VehicleStatus` alignment
 * is intentionally NOT pinned here (they are different shapes by design
 * — domain vs display). The runtime "mapper is total" test for the
 * `mapProductStatusToVehicleStatus` switch lives in T7a (catalog
 * container), not T1.
 */
import { describe, it, expect, expectTypeOf } from "vitest";
import type {
  AttributeSchemaEntry,
  CategoryPresentation,
  CardField,
  Category,
  VerticalResponse,
  CategoryNode,
  OrgVerticalsResponse,
} from "./category";
import { filterFieldSchema } from "@/lib/api/schemas/category";

describe("AttributeSchemaEntry", () => {
  it("models type, filter_type, and unit", () => {
    const entry: AttributeSchemaEntry = {
      type: "number",
      filter_type: "range",
      unit: "km",
    };
    expect(entry.type).toBe("number");
  });
});

describe("CategoryPresentation", () => {
  it("models card_fields, subtitle_template, and filter_fields", () => {
    const p: CategoryPresentation = {
      card_fields: [
        { key: "mileage", source: "attributes.mileage" },
        { key: "year", source: "attributes.year" },
      ],
      subtitle_template: "{year} · {make} · {model}",
      filter_fields: [
        { key: "mileage", filter_type: "range", label: "Kilometraje" },
      ],
    };
    expect(p.card_fields).toHaveLength(2);
  });

  it("allows nullable fields for categories without a presentation contract", () => {
    const p: CategoryPresentation | null = null;
    expect(p).toBeNull();
  });
});

describe("CardField", () => {
  it("supports a max 4 fields invariant via type-level comment", () => {
    const fields: CardField[] = [
      { key: "a", source: "attributes.a" },
      { key: "b", source: "attributes.b" },
      { key: "c", source: "attributes.c" },
      { key: "d", source: "attributes.d" },
    ];
    expect(fields).toHaveLength(4);
  });
});

describe("Category", () => {
  it("exposes presentation (or null) and attribute_schema as a record of AttributeSchemaEntry", () => {
    const c: Category = {
      id: "c1",
      name: "Autos",
      slug: "autos",
      attribute_schema: {
        mileage: { type: "number", filter_type: "range", unit: "km" },
        year: { type: "number", filter_type: "range" },
      },
      presentation: {
        card_fields: [{ key: "mileage", source: "attributes.mileage" }],
        subtitle_template: "{year}",
        filter_fields: [],
      },
      is_active: true,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };
    expectTypeOf(
      c.attribute_schema["mileage"],
    ).toMatchTypeOf<AttributeSchemaEntry>();
  });
});

describe("OrgVerticalsResponse", () => {
  it("models the full read-API contract", () => {
    const r: OrgVerticalsResponse = {
      verticals: [
        {
          id: "v1",
          name: "Vehículos y transporte",
          slug: "vehiculos-y-transporte",
          presentation: {
            card_fields: [{ key: "mileage", source: "attributes.mileage" }],
            subtitle_template: "{year} · {make} · {model}",
            filter_fields: [],
          },
          categories: [
            {
              id: "c1",
              name: "Autos",
              slug: "autos",
              attribute_schema: {
                mileage: { type: "number", filter_type: "range" },
              },
              presentation: {
                card_fields: [{ key: "mileage", source: "attributes.mileage" }],
                subtitle_template: "{year} · {make} · {model}",
                filter_fields: [],
              },
              filter_fields: [],
            },
          ],
        },
      ],
    };
    expect(r.verticals[0].categories[0].presentation?.card_fields).toHaveLength(
      1,
    );
  });
});

describe("VerticalResponse and CategoryNode", () => {
  it("allow null presentation at the root (legacy verticals without contract)", () => {
    const v: VerticalResponse = {
      id: "v1",
      name: "Legacy",
      slug: "legacy",
      presentation: null,
      categories: [],
    };
    expect(v.presentation).toBeNull();
  });

  it("CategoryNode has its own presentation that defaults from vertical if null", () => {
    const node: CategoryNode = {
      id: "c1",
      name: "X",
      slug: "x",
      attribute_schema: {},
      presentation: null, // inherits from vertical
      filter_fields: [],
    };
    expect(node.presentation).toBeNull();
  });
});

// Note: `Product.status` (8 domain literals) ↔ `VehicleStatus` (7 display
// literals) alignment is intentionally NOT tested here. The mapper that
// bridges them (`mapProductStatusToVehicleStatus` in
// `lib/api/products.ts`) is exercised in T7a as a runtime test that
// fails the moment a new ProductStatus lands on the backend without a
// matching case in the switch.

describe("filterFieldSchema (Subsystem B G1)", () => {
  it("accepts text filter_type and key-shaped FilterField", () => {
    const parsed = filterFieldSchema.safeParse({
      key: "model",
      filter_type: "text",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects the legacy field-shaped payload", () => {
    const parsed = filterFieldSchema.safeParse({
      field: "model",
      filter_type: "text",
    });
    expect(parsed.success).toBe(false);
  });
});
