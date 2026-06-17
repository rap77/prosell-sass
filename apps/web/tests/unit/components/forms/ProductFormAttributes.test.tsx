/**
 * Unit tests for `shouldShowField` (Subsystem A post-T1 contract).
 *
 * The old contract used `Record<string, boolean>` where `true` meant
 * "show" and `false` meant "hide". The new contract uses
 * `Record<string, AttributeSchemaEntry>` where *presence* in the schema
 * means the field exists in this vertical. To hide a field, omit it
 * from the schema entirely.
 *
 * Behavior summary (tested below):
 * - No category (undefined)            -> show
 * - Schema is undefined                -> show
 * - Schema is empty {}                 -> show
 * - Field listed in schema             -> show
 * - Field NOT listed in non-empty schema -> hide
 */

import { describe, it, expect } from "vitest";
import { shouldShowField } from "@/components/forms/ProductFormAttributes";
import type { AttributeSchemaEntry, Category } from "@/types/category";

/** Helper to build a minimal Category with the given attribute_schema. */
function categoryWithSchema(
  attribute_schema: Record<string, AttributeSchemaEntry> | undefined,
): Category {
  return {
    id: "cat-1",
    name: "Sedans",
    slug: "sedans",
    attribute_schema: attribute_schema as Record<string, AttributeSchemaEntry>,
    presentation: null,
    is_active: true,
    created_at: "2026-04-26T00:00:00Z",
    updated_at: "2026-04-26T00:00:00Z",
  };
}

describe("shouldShowField", () => {
  it("shows the field when no category is selected (backward compat)", () => {
    expect(shouldShowField("mileage", undefined)).toBe(true);
  });

  it("shows the field when attribute_schema is undefined (backward compat)", () => {
    const cat = categoryWithSchema(undefined);
    expect(shouldShowField("mileage", cat)).toBe(true);
  });

  it("shows the field when attribute_schema is empty (backward compat)", () => {
    const cat = categoryWithSchema({});
    expect(shouldShowField("mileage", cat)).toBe(true);
  });

  it("shows the field when it is present in the schema (new contract: presence = field exists)", () => {
    const cat = categoryWithSchema({
      year: { type: "number", filter_type: "range" },
      mileage: { type: "number", filter_type: "range", unit: "km" },
    });
    expect(shouldShowField("year", cat)).toBe(true);
    expect(shouldShowField("mileage", cat)).toBe(true);
  });

  it("hides the field when it is NOT in the schema (new contract: schema is the source of truth)", () => {
    const cat = categoryWithSchema({
      year: { type: "number", filter_type: "range" },
    });
    expect(shouldShowField("mileage", cat)).toBe(false);
  });
});
