import { describe, expect, it } from "vitest";
import { buildGroupsWithFieldOrder } from "./category-schema-editor";

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
