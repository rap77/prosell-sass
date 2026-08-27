import { describe, expect, it, vi } from "vitest";
import { mapDecodedToForm } from "./VinDecodeField";
import type { AttributeSchemaEntry } from "@/types/category";
import type { DecodedVehicle } from "@/lib/api/vehicles";

// FR6.1/FR6.2: Title Case applies to free-text VIN-decoded fields (no
// `options`), never to Select-backed fields — those must keep matching
// Facebook Marketplace's controlled vocabulary (nhtsa_normalizer.py).
describe("mapDecodedToForm", () => {
  it("title-cases a free-text field that has no options (e.g. make)", () => {
    const setValue = vi.fn();
    const schema: Record<string, AttributeSchemaEntry> = {
      make: { type: "string", filter_type: "select", vin_decode_key: "make" },
    };
    const decoded = { make: "toyota" } as unknown as DecodedVehicle;

    mapDecodedToForm(decoded, schema, setValue);

    expect(setValue).toHaveBeenCalledWith("make", "Toyota");
  });

  it("leaves a select-backed field's value untouched (e.g. fuel_type)", () => {
    const setValue = vi.fn();
    const schema: Record<string, AttributeSchemaEntry> = {
      fuel_type: {
        type: "string",
        filter_type: "select",
        options: ["gasoline", "diesel", "hybrid"],
        vin_decode_key: "fuel_type",
      },
    };
    const decoded = { fuel_type: "gasoline" } as unknown as DecodedVehicle;

    mapDecodedToForm(decoded, schema, setValue);

    expect(setValue).toHaveBeenCalledWith("fuel_type", "gasoline");
  });

  it("passes non-string values through unchanged", () => {
    const setValue = vi.fn();
    const schema: Record<string, AttributeSchemaEntry> = {
      year: { type: "number", filter_type: "range", vin_decode_key: "year" },
    };
    const decoded = { year: 2020 } as unknown as DecodedVehicle;

    mapDecodedToForm(decoded, schema, setValue);

    expect(setValue).toHaveBeenCalledWith("year", 2020);
  });
});
