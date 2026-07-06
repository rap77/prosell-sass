/**
 * Unit tests for buildCategoryTree utility.
 */
import { describe, it, expect } from "vitest";
import { buildCategoryTree } from "@/lib/utils/build-category-tree";
import type { Category } from "@/types/category";

function mockCategory(
  overrides: Partial<Category> & { id: string; name: string; slug: string },
): Category {
  return {
    parent_id: null,
    level: 0,
    sort_order: 0,
    icon: null,
    description: null,
    image_url: null,
    attribute_schema: {},
    attribute_groups: [],
    presentation: null,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("buildCategoryTree", () => {
  it("returns empty array for empty input", () => {
    expect(buildCategoryTree([])).toEqual([]);
  });

  it("builds flat list as roots when all parent_id are null", () => {
    const cats = [
      mockCategory({ id: "1", name: "A", slug: "a", sort_order: 1 }),
      mockCategory({ id: "2", name: "B", slug: "b", sort_order: 0 }),
    ];

    const tree = buildCategoryTree(cats);

    expect(tree).toHaveLength(2);
    // Sorted by sort_order
    expect(tree[0].name).toBe("B");
    expect(tree[1].name).toBe("A");
    expect(tree[0].children).toEqual([]);
  });

  it("nests children under their parent", () => {
    const cats = [
      mockCategory({ id: "root", name: "Root", slug: "root", sort_order: 0 }),
      mockCategory({
        id: "child1",
        name: "Child1",
        slug: "child1",
        parent_id: "root",
        level: 1,
        sort_order: 1,
      }),
      mockCategory({
        id: "child2",
        name: "Child2",
        slug: "child2",
        parent_id: "root",
        level: 1,
        sort_order: 0,
      }),
    ];

    const tree = buildCategoryTree(cats);

    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe("Root");
    expect(tree[0].children).toHaveLength(2);
    // Children sorted by sort_order
    expect(tree[0].children[0].name).toBe("Child2");
    expect(tree[0].children[1].name).toBe("Child1");
  });

  it("handles multi-level nesting", () => {
    const cats = [
      mockCategory({ id: "l0", name: "L0", slug: "l0" }),
      mockCategory({
        id: "l1",
        name: "L1",
        slug: "l1",
        parent_id: "l0",
        level: 1,
      }),
      mockCategory({
        id: "l2",
        name: "L2",
        slug: "l2",
        parent_id: "l1",
        level: 2,
      }),
    ];

    const tree = buildCategoryTree(cats);

    expect(tree[0].name).toBe("L0");
    expect(tree[0].children[0].name).toBe("L1");
    expect(tree[0].children[0].children[0].name).toBe("L2");
    expect(tree[0].children[0].children[0].children).toEqual([]);
  });
});
