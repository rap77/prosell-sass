import { describe, expect, it } from "vitest";
import {
  buildGroupsWithFieldOrder,
  toSchemaMap,
} from "./category-schema-editor";

describe("buildGroupsWithFieldOrder", () => {
  it("persists the visual field order for each group", () => {
    const groups = [
      { _id: "basic", key: "basic", label: "Basic", order: 0 },
      { _id: "engine", key: "engine", label: "Engine", order: 1 },
    ];
    const rows = [
      { _id: "model", key: "model", group: "basic" },
      { _id: "year", key: "year", group: "basic" },
      { _id: "fuel", key: "fuel", group: "engine" },
    ];

    expect(buildGroupsWithFieldOrder(groups, rows)).toEqual([
      {
        key: "basic",
        label: "Basic",
        order: 0,
        fields: ["model", "year"],
      },
      { key: "engine", label: "Engine", order: 1, fields: ["fuel"] },
    ]);
  });
});

// FR3.1/FR3.2: the unified schema contract carries `options` through the
// editor whenever present. The product-form renderer (SchemaFieldRenderer)
// decides to show a select purely from `options.length > 0`, never from
// render_as — most select fields in the vehicles seed (fuel_type,
// transmission, etc.) only set filter_type: "select" and never set
// render_as at all. Gating persistence on render_as === "select" silently
// dropped `options` on every save for those fields (confirmed root cause
// of select fields turning into plain text inputs after a schema save).
describe("toSchemaMap", () => {
  it("includes options when render_as is select", () => {
    const rows = [
      {
        key: "body_type",
        type: "string" as const,
        required: false,
        label: "Body Type",
        description: undefined,
        group: undefined,
        render_as: "select" as const,
        vin_decode_key: undefined,
        options: ["Sedan", "Hatchback", "SUV"],
      },
    ];

    expect(toSchemaMap(rows, new Set())).toEqual({
      body_type: {
        type: "string",
        required: false,
        label: "Body Type",
        description: undefined,
        group: undefined,
        render_as: "select",
        vin_decode_key: undefined,
        options: ["Sedan", "Hatchback", "SUV"],
      },
    });
  });

  it("includes options even when render_as is unset", () => {
    const rows = [
      {
        key: "fuel_type",
        type: "string" as const,
        required: false,
        label: "Fuel Type",
        description: undefined,
        group: undefined,
        render_as: undefined,
        vin_decode_key: undefined,
        options: ["gasoline", "diesel", "hybrid", "electric"],
      },
    ];

    expect(toSchemaMap(rows, new Set()).fuel_type.options).toEqual([
      "gasoline",
      "diesel",
      "hybrid",
      "electric",
    ]);
  });

  it("drops options when the field has none", () => {
    const rows = [
      {
        key: "mileage",
        type: "number" as const,
        required: false,
        label: "Mileage",
        description: undefined,
        group: undefined,
        render_as: undefined,
        vin_decode_key: undefined,
        options: undefined,
      },
    ];

    expect(toSchemaMap(rows, new Set()).mileage.options).toBeUndefined();
  });
});
