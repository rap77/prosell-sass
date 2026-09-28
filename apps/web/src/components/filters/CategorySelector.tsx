"use client";

import { useEffect } from "react";
import type { CategoryNode } from "@/types/category";
import type { LeafWithPath } from "@/lib/utils/collect-leaves-with-paths";

interface CategorySelectorProps {
  /**
   * Leaf categories (no children) with their breadcrumb path. Pass the
   * result of `collectLeavesWithPaths(verticals)` from the catalog page;
   * passing only the top-level categories (the previous behavior) hid
   * leaves nested one or two levels deeper.
   */
  leaves: LeafWithPath[];
  /** Currently selected category id. */
  value: string | null;
  /** Called with the selected leaf's id. */
  onChange: (id: string) => void;
  /**
   * Map of category_id → product count for the user's catalog. When
   * provided, leaves with count 0 are filtered out so the dropdown never
   * offers an empty category. Counts feed the option label suffix
   * ("· 12 productos").
   */
  productCounts?: Record<string, number>;
}

/**
 * Build the visible `<option>` label from a leaf + its breadcrumb path and
 * the product count. Path is shown joined by " / ", the leaf's name
 * follows, then " · N producto(s)". An empty path renders just the leaf
 * name with the same suffix.
 */
function formatLabel(
  leaf: CategoryNode,
  path: string[],
  count: number,
): string {
  const noun = count === 1 ? "producto" : "productos";
  if (path.length === 0) {
    return `${leaf.name} · ${count} ${noun}`;
  }
  return `${path.join(" / ")} / ${leaf.name} · ${count} ${noun}`;
}

export function CategorySelector({
  leaves,
  value,
  onChange,
  productCounts,
}: CategorySelectorProps) {
  // Filter leaves with at least one product when counts are provided.
  // Cheap inline computation — React Compiler handles memoization (the
  // project's PR #24 convention; see project.md "useMemo removal").
  const visibleLeaves = productCounts
    ? leaves.filter((entry) => (productCounts[entry.leaf.id] ?? 0) > 0)
    : leaves;

  // Auto-select when exactly one leaf has products and the caller hasn't
  // picked one yet. Same pattern as the previous implementation, just
  // gated on the filtered (visible) list so empty categories can't keep
  // auto-selection from firing.
  useEffect(() => {
    if (visibleLeaves.length === 1 && value === null) {
      onChange(visibleLeaves[0].leaf.id);
    }
  }, [visibleLeaves, value, onChange]);

  if (visibleLeaves.length === 0) {
    return (
      <p
        data-testid="category-selector-empty"
        className="text-[13px] text-ps-text-secondary"
      >
        No hay categorías con productos todavía
      </p>
    );
  }

  return (
    <select
      aria-label="Category"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-10 w-full rounded-md border border-ps-border-default bg-ps-input-bg px-3 py-2 text-sm text-ps-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ps-border-active focus-visible:ring-offset-2"
    >
      <option value="" disabled>
        Seleccioná una categoría
      </option>
      {visibleLeaves.map(({ leaf, path }) => {
        const count = productCounts?.[leaf.id] ?? 0;
        return (
          <option key={leaf.id} value={leaf.id}>
            {formatLabel(leaf, path, count)}
          </option>
        );
      })}
    </select>
  );
}
