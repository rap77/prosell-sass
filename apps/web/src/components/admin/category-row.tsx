"use client";

/**
 * CategoryRow — single row in the category tree.
 *
 * Uses useSortable for drag handle. Shows expand chevron, name, badges, actions.
 */

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDeleteCategory } from "@/lib/api/categories";
import type { CategoryTreeNode } from "@/lib/utils/build-category-tree";

interface CategoryRowProps {
  node: CategoryTreeNode;
  depth: number;
  isReadOnly: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onAddChild: () => void;
}

export function CategoryRow({
  node,
  depth,
  isReadOnly,
  isExpanded,
  onToggle,
  onEdit,
  onAddChild,
}: CategoryRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id, disabled: isReadOnly });

  const deleteCategory = useDeleteCategory();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleDelete = () => {
    if (node.children.length > 0) {
      alert(
        "No se puede eliminar una categoría con hijos. Elimina los hijos primero.",
      );
      return;
    }
    if (confirm(`¿Eliminar "${node.name}"?`)) {
      deleteCategory.mutate(node.id);
    }
  };

  const hasChildren = node.children.length > 0;
  const indentPx = depth * 24;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 border-b px-4 py-3 ${isDragging ? "opacity-50" : ""}`}
    >
      {/* Drag handle */}
      {!isReadOnly && (
        <button
          type="button"
          aria-label="Arrastrar para reordenar"
          className="cursor-grab text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}

      {/* Indent spacer */}
      <div style={{ width: indentPx }} />

      {/* Expand/collapse chevron */}
      <button
        type="button"
        onClick={onToggle}
        className={`p-1 ${hasChildren ? "text-muted-foreground hover:text-foreground" : "invisible"}`}
        aria-label={isExpanded ? "Colapsar" : "Expandir"}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>

      {/* Icon + Name */}
      <div className="flex flex-1 items-center gap-2">
        {node.icon && <span className="text-lg">{node.icon}</span>}
        <span className="font-medium">{node.name}</span>
        <span className="text-xs text-muted-foreground">/{node.slug}</span>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2">
        {!node.is_active && (
          <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            Inactiva
          </span>
        )}
        {hasChildren && (
          <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {node.children.length} hijos
          </span>
        )}
      </div>

      {/* Actions menu */}
      {!isReadOnly && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAddChild}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar hijo
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
