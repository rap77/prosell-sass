"use client";

import { useEffect } from "react";
import type { CategoryNode } from "@/types/category";

interface CategorySelectorProps {
  categories: CategoryNode[];
  value: string | null;
  onChange: (id: string) => void;
}

export function CategorySelector({
  categories,
  value,
  onChange,
}: CategorySelectorProps) {
  useEffect(() => {
    if (categories.length === 1 && value === null) {
      onChange(categories[0].id);
    }
  }, [categories, value, onChange]);

  return (
    <select
      aria-label="Category"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <option value="" disabled>
        Select a category
      </option>
      {categories.map((category) => (
        <option key={category.id} value={category.id}>
          {category.name}
        </option>
      ))}
    </select>
  );
}
