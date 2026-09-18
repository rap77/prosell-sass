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

    mapDecodedToForm(decoded, schema, setValue, []);

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

    mapDecodedToForm(decoded, schema, setValue, []);

    expect(setValue).toHaveBeenCalledWith("fuel_type", "gasoline");
  });

  it("passes non-string values through unchanged", () => {
    const setValue = vi.fn();
    const schema: Record<string, AttributeSchemaEntry> = {
      year: { type: "number", filter_type: "range", vin_decode_key: "year" },
    };
    const decoded = { year: 2020 } as unknown as DecodedVehicle;

    mapDecodedToForm(decoded, schema, setValue, []);

    expect(setValue).toHaveBeenCalledWith("year", 2020);
  });

  // AC1.1.1/AC1.1.2 (u2-vehicle-catalog-ui): mapDecodedToForm writes the
  // RHF virtual "_unmatchedFields" channel that SchemaFieldRenderer's
  // select blocks read via useWatch to show the mismatch indicator.
  it("writes the _unmatchedFields channel with an empty array when every field reconciled (AC1.1.1)", () => {
    const setValue = vi.fn();
    const schema: Record<string, AttributeSchemaEntry> = {
      fuel_type: {
        type: "string",
        filter_type: "select",
        options: ["gasoline", "diesel"],
        vin_decode_key: "fuel_type",
      },
    };
    const decoded = { fuel_type: "gasoline" } as unknown as DecodedVehicle;

    mapDecodedToForm(decoded, schema, setValue, []);

    expect(setValue).toHaveBeenCalledWith("_unmatchedFields", []);
  });

  it("writes the _unmatchedFields channel with the backend's unmatched field keys (AC1.1.2)", () => {
    const setValue = vi.fn();
    const schema: Record<string, AttributeSchemaEntry> = {
      body_type: {
        type: "string",
        filter_type: "select",
        options: ["sedan", "suv"],
        vin_decode_key: "body_type",
      },
    };
    const decoded = { body_type: null } as unknown as DecodedVehicle;

    mapDecodedToForm(decoded, schema, setValue, ["body_type"]);

    expect(setValue).toHaveBeenCalledWith("_unmatchedFields", ["body_type"]);
    // AC1.1.2: a null decoded value leaves the field itself untouched
    // (existing behavior) — only the shared channel gets the new value.
    expect(setValue).not.toHaveBeenCalledWith("body_type", expect.anything());
  });
});
