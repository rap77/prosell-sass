"use client";

/**
 * CategoryAdminClient — admin panel for managing category hierarchy.
 *
 * Features:
 * - Tree view of categories with expand/collapse
 * - Drag & drop reordering within same parent level
 * - Create/edit/delete categories via modal
 */

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCategories } from "@/lib/api/categories";
import { useAuth } from "@/hooks/useAuth";
import { buildCategoryTree } from "@/lib/utils/build-category-tree";
import { CategoryTree } from "@/components/admin/category-tree";
import { CategoryFormModal } from "@/components/admin/category-form-modal";
import type { Category } from "@/types/category";

type ModalMode =
  | { type: "closed" }
  | { type: "create"; parentId: string | null }
  | { type: "edit"; category: Category };

export function CategoryAdminClient() {
  const { data: categories, isLoading, isError } = useCategories();
  const { isSuperAdmin } = useAuth();
  const [modal, setModal] = useState<ModalMode>({ type: "closed" });

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Cargando categorías...</p>
    );
  }

  if (isError || !categories) {
    return (
      <p className="text-sm text-destructive">Error al cargar categorías</p>
    );
  }

  const tree = buildCategoryTree(categories);

  const handleCreate = (parentId: string | null = null) => {
    setModal({ type: "create", parentId });
  };

  const handleEdit = (category: Category) => {
    setModal({ type: "edit", category });
  };

  const handleClose = () => {
    setModal({ type: "closed" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Categorías</h1>
          <p className="text-sm text-muted-foreground">
            Administra la jerarquía de categorías del catálogo
          </p>
        </div>
        {isSuperAdmin && (
          <Button onClick={() => handleCreate(null)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva categoría
          </Button>
        )}
      </div>

      {!isSuperAdmin && (
        <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          La edición de categorías está restringida a administradores de
          plataforma.
        </div>
      )}

      <div className="rounded-lg border bg-card">
        <CategoryTree
          nodes={tree}
          isReadOnly={!isSuperAdmin}
          onEdit={handleEdit}
          onAddChild={handleCreate}
        />
      </div>

      {modal.type !== "closed" && (
        <CategoryFormModal
          mode={modal.type}
          category={modal.type === "edit" ? modal.category : undefined}
          parentId={modal.type === "create" ? modal.parentId : undefined}
          categories={categories}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
