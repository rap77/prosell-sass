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
// editor for render_as="select" fields, so the admin can populate the
// values a select field offers from the same UI that declares it a select.
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

  it("drops options when render_as is not select", () => {
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
        options: ["stale", "leftover"],
      },
    ];

    expect(toSchemaMap(rows, new Set()).mileage.options).toBeUndefined();
  });
});
