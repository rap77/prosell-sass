"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CategoryNode } from "@/types/category";

interface CategorySelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryNode[];
  onSelect: (category: CategoryNode) => void;
}

export function CategorySelectorModal({
  open,
  onOpenChange,
  categories,
  onSelect,
}: CategorySelectorModalProps) {
  function handleSelect(category: CategoryNode) {
    onSelect(category);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>¿Qué tipo de producto querés publicar?</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 pt-2">
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => handleSelect(category)}
              className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card p-6 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {category.name}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
