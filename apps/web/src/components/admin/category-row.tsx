"use client";

/**
 * CategoryRow — single row in the category tree.
 *
 * Uses useSortable for drag handle. Shows expand chevron, name, badges, actions.
 */

import { useState } from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showHasChildrenDialog, setShowHasChildrenDialog] = useState(false);

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
    // ponytail: smooth transition for drag + layout changes
    transition: transition || "transform 200ms ease, opacity 200ms ease",
  };

  const handleDeleteClick = () => {
    if (node.children.length > 0) {
      setShowHasChildrenDialog(true);
      return;
    }
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    deleteCategory.mutate(node.id);
    setShowDeleteDialog(false);
  };

  const hasChildren = node.children.length > 0;
  const indentPx = depth * 24;

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`flex items-center gap-2 border-b px-4 py-3 ${isDragging ? "opacity-50" : "opacity-100"}`}
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
                onClick={handleDeleteClick}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar <strong>&quot;{node.name}&quot;</strong>
              . Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Has children warning dialog */}
      <AlertDialog
        open={showHasChildrenDialog}
        onOpenChange={setShowHasChildrenDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>No se puede eliminar</AlertDialogTitle>
            <AlertDialogDescription>
              La categoría <strong>&quot;{node.name}&quot;</strong> tiene{" "}
              {node.children.length} subcategoría(s). Elimina los hijos primero.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Entendido</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
