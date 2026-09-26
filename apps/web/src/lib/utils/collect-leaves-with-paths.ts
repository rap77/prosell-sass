/**
 * collectLeavesWithPaths — walks the category tree nested under each vertical
 * and returns the leaves with their breadcrumb path (parent names), excluding
 * the vertical root and the leaf itself.
 *
 * Why this exists: the catalog `CategorySelector` used to render the first
 * level of categories under each vertical (e.g. "Vehículos Terrestres"), but
 * the actual selectable leaves are nested one or two levels deeper (e.g.
 * "Carros y Camionetas"). The previous behavior hid leaves from the dropdown.
 *
 * A leaf is a node with no children (`children` undefined or empty array).
 *
 * The returned `path` array carries the names of intermediate ancestors
 * between the vertical root and the leaf (the leaf itself is reachable via
 * `leaf.name`, the vertical root is implicit and excluded by design). With
 * the path above, the UI renders
 *   "Vehículos Terrestres / Carros y Camionetas · 12 productos".
 *
 * If the vertical has only one category and it is itself a leaf (e.g. a
 * `motos` vertical with no sub-categories), `path` is empty and the label
 * becomes "Motos · 5 productos".
 */
import type { CategoryNode, VerticalResponse } from "@/types/category";

export interface LeafWithPath {
  leaf: CategoryNode;
  /** Intermediate ancestor names between the vertical root and the leaf. */
  path: string[];
}

function isLeaf(node: CategoryNode): boolean {
  return !node.children || node.children.length === 0;
}

function walk(
  nodes: CategoryNode[],
  inheritedPath: string[],
  out: LeafWithPath[],
): void {
  for (const node of nodes) {
    if (isLeaf(node)) {
      out.push({ leaf: node, path: inheritedPath });
    } else {
      walk(node.children ?? [], [...inheritedPath, node.name], out);
    }
  }
}

export function collectLeavesWithPaths(
  verticals: VerticalResponse[],
): LeafWithPath[] {
  const out: LeafWithPath[] = [];
  for (const vertical of verticals) {
    walk(vertical.categories, [], out);
  }
  return out;
}
