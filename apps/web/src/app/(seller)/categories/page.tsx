'use client'

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useCreateCategory, useCategories } from "@/lib/api/categories";
import type { Category } from "@/types/category";

export default function CategoriesPage() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
  });

  const { data: categories, isLoading, error } = useCategories();
  const createCategory = useCreateCategory();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createCategory.mutateAsync(formData);
      setShowForm(false);
      setFormData({ name: "", slug: "", description: "" });
    } catch (err) {
      // Error is handled by the mutation hook
    }
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: prev.slug || name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
    }));
  };

  if (isLoading) {
    return (
      <main className="p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-lg" />
          ))}
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-6">
        <div className="text-center py-12">
          <p className="text-destructive">Failed to load categories</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="text-sm text-muted-foreground">
            {categories?.length || 0} categories found
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Category
        </button>
      </div>

      {showForm && (
        <div className="mb-6 p-4 border rounded-lg bg-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Name
              </label>
              <input
                id="name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Category name"
              />
            </div>

            <div>
              <label htmlFor="slug" className="block text-sm font-medium mb-1">
                Slug
              </label>
              <input
                id="slug"
                type="text"
                required
                value={formData.slug}
                onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="category-slug"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Category description"
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createCategory.isPending}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {createCategory.isPending ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-accent"
              >
                Cancel
              </button>
            </div>

            {createCategory.error && (
              <p className="text-sm text-destructive">
                {createCategory.error.message}
              </p>
            )}
          </form>
        </div>
      )}

      {categories && categories.length > 0 ? (
        <div className="space-y-2">
          {categories.map((category) => (
            <div
              key={category.id}
              className="p-4 border rounded-lg bg-card flex items-center justify-between"
            >
              <div>
                <h3 className="font-medium">{category.name}</h3>
                <p className="text-sm text-muted-foreground">{category.slug}</p>
              </div>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-accent rounded-md">
                  <Pencil className="h-4 w-4" />
                </button>
                <button className="p-2 hover:bg-accent rounded-md text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No categories found</p>
          <p className="text-sm text-muted-foreground mt-2">
            Create your first category to get started.
          </p>
        </div>
      )}
    </main>
  );
}
