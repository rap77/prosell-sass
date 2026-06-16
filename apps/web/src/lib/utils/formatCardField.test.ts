import { describe, it, expect } from "vitest";
import { formatCardField } from "./formatCardField";
import type { CardField, AttributeSchemaEntry } from "@/types/category";

const mileageField: CardField = { key: "mileage", source: "attributes.mileage" };
const yearField: CardField = { key: "year", source: "attributes.year" };
const priceField: CardField = { key: "price", source: "attributes.price" };
const areaField: CardField = { key: "area_m2", source: "attributes.area_m2" };
const customLabelField: CardField = { key: "foo", source: "attributes.foo" };

const numberSchema = (unit?: string): AttributeSchemaEntry => ({
  type: "number",
  filter_type: "range",
  unit,
});

describe("formatCardField — label", () => {
  it("returns the schema-provided label when present", () => {
    const out = formatCardField(
      customLabelField,
      "bar",
      { foo: { type: "string", filter_type: "exact", label: "Custom Label" } },
    );
    expect(out.label).toBe("Custom Label");
  });

  it("uses the known-label dictionary for `mileage` → `Kilometraje`", () => {
    const out = formatCardField(mileageField, 100000, {
      mileage: numberSchema("km"),
    });
    expect(out.label).toBe("Kilometraje");
  });

  it("uses the known-label dictionary for `area_m2` → `Superficie`", () => {
    const out = formatCardField(areaField, 75, { area_m2: numberSchema("m²") });
    expect(out.label).toBe("Superficie");
  });

  it("humanizes the key as a fallback (snake_case → Capitalized words)", () => {
    const out = formatCardField(
      { key: "engine_size", source: "attributes.engine_size" },
      2.0,
      { engine_size: numberSchema("L") },
    );
    expect(out.label).toBe("Engine Size");
  });
});

describe("formatCardField — value formatting", () => {
  it("formats a number with the unit suffix (es-AR locale, thousands separator)", () => {
    const out = formatCardField(mileageField, 100000, {
      mileage: numberSchema("km"),
    });
    expect(out.value).toBe("100.000 km");
  });

  it("formats a currency-like value as a price (uses Intl.NumberFormat)", () => {
    const out = formatCardField(priceField, 1234567, {
      price: { type: "string", filter_type: "exact" }, // not "number" → not formatted as number
    });
    // Since type is "string", the value is returned as-is (raw).
    expect(out.value).toBe("1234567");
  });

  it("formats a number without unit as plain localized number", () => {
    const out = formatCardField(yearField, 2020, { year: numberSchema() });
    expect(out.value).toBe("2020");
  });

  it("returns a string value as-is", () => {
    const out = formatCardField(
      customLabelField,
      "Toyota",
      { foo: { type: "string", filter_type: "exact" } },
    );
    expect(out.value).toBe("Toyota");
  });

  it("returns null when value is missing (caller decides to skip the cell)", () => {
    const out = formatCardField(mileageField, undefined, {
      mileage: numberSchema("km"),
    });
    expect(out.value).toBeNull();
  });
});
