"use client";

/**
 * CategoryTree — hierarchical tree view with drag-and-drop reordering.
 *
 * Uses @dnd-kit/sortable for drag-and-drop within same parent level.
 * Reorder fires N parallel PATCH requests (small N, simple approach).
 */

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { useReorderCategories } from "@/lib/api/categories";
import type { CategoryTreeNode } from "@/lib/utils/build-category-tree";
import type { Category } from "@/types/category";
import { CategoryRow } from "./category-row";

/** ponytail: derive stable key from node order for change detection */
function getNodesKey(nodes: CategoryTreeNode[]): string {
  return nodes.map((n) => n.id).join(",");
}

interface CategoryTreeProps {
  nodes: CategoryTreeNode[];
  isReadOnly: boolean;
  onEdit: (category: Category) => void;
  onAddChild: (parentId: string | null) => void;
}

export function CategoryTree({
  nodes,
  isReadOnly,
  onEdit,
  onAddChild,
}: CategoryTreeProps) {
  // ponytail: local state for optimistic reorder, sync when server order changes
  const [localNodes, setLocalNodes] = useState(nodes);
  const [prevKey, setPrevKey] = useState(() => getNodesKey(nodes));
  const reorder = useReorderCategories();
  const sensors = useSensors(useSensor(PointerSensor));

  // ponytail: sync only when server order differs (avoids flash on same-order refetch)
  const currentKey = getNodesKey(nodes);
  if (!reorder.isPending && currentKey !== prevKey) {
    setLocalNodes(nodes);
    setPrevKey(currentKey);
  }

  const handleDragEnd = (event: DragEndEvent, siblings: CategoryTreeNode[]) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = siblings.findIndex((n) => n.id === active.id);
    const newIndex = siblings.findIndex((n) => n.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(siblings, oldIndex, newIndex);

    // Optimistic update
    setLocalNodes((prev) =>
      updateSiblings(prev, siblings[0].parent_id, reordered),
    );

    // Fire PATCH requests
    const updates = reordered.map((node, idx) => ({
      id: node.id,
      sort_order: idx,
    }));
    reorder.mutate(updates);
  };

  return (
    <div className="divide-y">
      <TreeLevel
        nodes={localNodes}
        depth={0}
        isReadOnly={isReadOnly}
        onEdit={onEdit}
        onAddChild={onAddChild}
        sensors={sensors}
        onDragEnd={handleDragEnd}
      />
      {localNodes.length === 0 && (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          No hay categorías. Crea la primera usando el botón de arriba.
        </p>
      )}
    </div>
  );
}

interface TreeLevelProps {
  nodes: CategoryTreeNode[];
  depth: number;
  isReadOnly: boolean;
  onEdit: (category: Category) => void;
  onAddChild: (parentId: string | null) => void;
  sensors: ReturnType<typeof useSensors>;
  onDragEnd: (event: DragEndEvent, siblings: CategoryTreeNode[]) => void;
}

function TreeLevel({
  nodes,
  depth,
  isReadOnly,
  onEdit,
  onAddChild,
  sensors,
  onDragEnd,
}: TreeLevelProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={(e) => onDragEnd(e, nodes)}
    >
      <SortableContext
        items={nodes.map((n) => n.id)}
        strategy={verticalListSortingStrategy}
      >
        {nodes.map((node) => (
          <div key={node.id}>
            <CategoryRow
              node={node}
              depth={depth}
              isReadOnly={isReadOnly}
              isExpanded={expanded.has(node.id)}
              onToggle={() => toggleExpand(node.id)}
              onEdit={() => onEdit(node)}
              onAddChild={() => onAddChild(node.id)}
            />
            {expanded.has(node.id) && node.children.length > 0 && (
              <TreeLevel
                nodes={node.children}
                depth={depth + 1}
                isReadOnly={isReadOnly}
                onEdit={onEdit}
                onAddChild={onAddChild}
                sensors={sensors}
                onDragEnd={onDragEnd}
              />
            )}
          </div>
        ))}
      </SortableContext>
    </DndContext>
  );
}

/**
 * Update a specific level of siblings in the tree (for optimistic update)
 */
function updateSiblings(
  tree: CategoryTreeNode[],
  parentId: string | null,
  newSiblings: CategoryTreeNode[],
): CategoryTreeNode[] {
  if (parentId === null) return newSiblings;

  return tree.map((node) => {
    if (node.id === parentId) {
      return { ...node, children: newSiblings };
    }
    if (node.children.length > 0) {
      return {
        ...node,
        children: updateSiblings(node.children, parentId, newSiblings),
      };
    }
    return node;
  });
}
