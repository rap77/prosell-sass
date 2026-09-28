import { describe, expect, it } from "vitest";
import type { CategoryNode, VerticalResponse } from "@/types/category";
import { collectLeavesWithPaths } from "./collect-leaves-with-paths";

function makeVertical(
  id: string,
  name: string,
  categories: CategoryNode[],
): VerticalResponse {
  return {
    id,
    name,
    slug: id,
    presentation: null,
    categories,
  };
}

function makeLeaf(id: string, name: string): CategoryNode {
  return {
    id,
    name,
    slug: id,
    attribute_schema: {},
    attribute_groups: [],
    presentation: null,
    filter_fields: [],
    // explicit empty children — leaves have no descendants
    children: [],
  };
}

function makeBranch(
  id: string,
  name: string,
  children: CategoryNode[],
): CategoryNode {
  return {
    id,
    name,
    slug: id,
    attribute_schema: {},
    attribute_groups: [],
    presentation: null,
    filter_fields: [],
    children,
  };
}

describe("collectLeavesWithPaths", () => {
  it("returns an empty array for no verticals", () => {
    expect(collectLeavesWithPaths([])).toEqual([]);
  });

  it("returns an empty array for a vertical with no categories", () => {
    expect(collectLeavesWithPaths([makeVertical("v", "V", [])])).toEqual([]);
  });

  it("returns the single leaf when a vertical has one leaf and no branch", () => {
    const leaf = makeLeaf("c1", "Motos");
    const verticals = [makeVertical("v1", "Vehículos", [leaf])];
    expect(collectLeavesWithPaths(verticals)).toEqual([{ leaf, path: [] }]);
  });

  it("walks one level of nesting (parent + leaf)", () => {
    const leaf = makeLeaf("c2", "Carros y Camionetas");
    const parent = makeBranch("c1", "Vehículos Terrestres", [leaf]);
    const verticals = [makeVertical("v1", "Vehículos", [parent])];
    expect(collectLeavesWithPaths(verticals)).toEqual([
      { leaf, path: ["Vehículos Terrestres"] },
    ]);
  });

  it("walks a 3-level tree and produces the full breadcrumb excluding the vertical root and the leaf itself", () => {
    const leaf = makeLeaf("c3", "Sedan");
    const mid = makeBranch("c2", "Carros", [leaf]);
    const top = makeBranch("c1", "Vehículos Terrestres", [mid]);
    const verticals = [makeVertical("v1", "Vehículos", [top])];
    expect(collectLeavesWithPaths(verticals)).toEqual([
      { leaf, path: ["Vehículos Terrestres", "Carros"] },
    ]);
  });

  it("preserves order across multiple verticals and multiple leaves", () => {
    const leafA1 = makeLeaf("a1", "Sedan");
    const branchA = makeBranch("a", "Carros", [leafA1]);
    const leafB1 = makeLeaf("b1", "Manuales");
    const leafB2 = makeLeaf("b2", "Automáticas");
    const branchB = makeBranch("b", "Transmisión", [leafB1, leafB2]);
    const verticals = [
      makeVertical("v1", "Vehículos", [branchA]),
      makeVertical("v2", "Otros", [branchB]),
    ];
    expect(collectLeavesWithPaths(verticals)).toEqual([
      { leaf: leafA1, path: ["Carros"] },
      { leaf: leafB1, path: ["Transmisión"] },
      { leaf: leafB2, path: ["Transmisión"] },
    ]);
  });

  it("treats a node with `children: undefined` as a leaf", () => {
    const node: CategoryNode = {
      id: "c1",
      name: "Sin children",
      slug: "c1",
      attribute_schema: {},
      attribute_groups: [],
      presentation: null,
      filter_fields: [],
      // children intentionally undefined
    };
    const verticals = [makeVertical("v1", "V", [node])];
    expect(collectLeavesWithPaths(verticals)).toEqual([
      { leaf: node, path: [] },
    ]);
  });
});
