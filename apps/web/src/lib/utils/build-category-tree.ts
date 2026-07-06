/**
 * Converts a flat list of categories into a hierarchical tree structure.
 * Categories are grouped by parent_id and sorted by sort_order within each level.
 */

import type { Category } from "@/types/category";

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}

export function buildCategoryTree(categories: Category[]): CategoryTreeNode[] {
  const map = new Map<string | null, CategoryTreeNode[]>();

  // Group by parent_id
  for (const cat of categories) {
    const parentId = cat.parent_id;
    if (!map.has(parentId)) map.set(parentId, []);
    map.get(parentId)!.push({ ...cat, children: [] });
  }

  // Sort each group by sort_order
  for (const children of map.values()) {
    children.sort((a, b) => a.sort_order - b.sort_order);
  }

  // Build tree recursively
  function attachChildren(node: CategoryTreeNode): void {
    node.children = map.get(node.id) ?? [];
    node.children.forEach(attachChildren);
  }

  const roots = map.get(null) ?? [];
  roots.forEach(attachChildren);
  return roots;
}
