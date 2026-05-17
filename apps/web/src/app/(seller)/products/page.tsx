'use client'

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Filter } from "lucide-react";
import { useProducts, useCreateProduct, useUpdateProductStatus } from "@/lib/api/products";
import { useCategoryOptions } from "@/lib/api/categories";
import type { Product } from "@/types/product";
import { formatCurrency } from "@/lib/utils/format";

export default function ProductsPage() {
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    condition: "",
    category_id: "",
  });

  const { data: products, isLoading, error } = useProducts();
  const { data: categoryOptions } = useCategoryOptions();
  const createProduct = useCreateProduct();
  const updateStatus = useUpdateProductStatus();

  const filteredProducts = products?.filter(
    (p: Product) => statusFilter === "all" || p.status === statusFilter
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.category_id) {
      alert("Please select a category");
      return;
    }

    try {
      await createProduct.mutateAsync({
        title: formData.title,
        price_cents: parseFloat(formData.price) * 100,
        category_id: formData.category_id,
        tenant_id: "", // Will be filled by API middleware
        organization_id: "", // Will be filled by API middleware
        attributes: {
          category: "generic" as const,
          condition: formData.condition,
          description: formData.description,
        },
      });
      setShowForm(false);
      setFormData({ title: "", description: "", price: "", condition: "", category_id: "" });
    } catch (err) {
      // Error is handled by the mutation hook
    }
  };

  const handleSubmitForApproval = async (productId: string) => {
    await updateStatus.mutateAsync({ productId, status: "published" });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-destructive">Failed to load products</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-sm text-muted-foreground">
            {filteredProducts?.length || 0} products found
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Product
        </button>
      </div>

      {/* Status Filter */}
      <nav className="mb-4 flex items-center gap-2" aria-label="Product status filter">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          aria-label="Filter by status"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="sold">Sold</option>
        </select>
      </nav>

      {showForm && (
        <div className="mb-6 p-4 border rounded-lg bg-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-1">
                Title
              </label>
              <input
                id="title"
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Product title"
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
                placeholder="Product description"
                rows={3}
              />
            </div>

            <div>
              <label htmlFor="price" className="block text-sm font-medium mb-1">
                Price
              </label>
              <input
                id="price"
                type="number"
                min="0"
                required
                value={formData.price}
                onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="0.00"
              />
            </div>

            <div>
              <label htmlFor="condition" className="block text-sm font-medium mb-1">
                Condition
              </label>
              <select
                id="condition"
                value={formData.condition}
                onChange={(e) => setFormData((prev) => ({ ...prev, condition: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                aria-label="Condition"
              >
                <option value="">Select condition</option>
                <option value="new">New</option>
                <option value="like_new">Like New</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium mb-1">
                Category
              </label>
              <select
                id="category"
                required
                value={formData.category_id}
                onChange={(e) => setFormData((prev) => ({ ...prev, category_id: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                aria-label="Category"
              >
                <option value="">Select category</option>
                {categoryOptions?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createProduct.isPending}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {createProduct.isPending ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-accent"
              >
                Cancel
              </button>
            </div>

            {createProduct.error && (
              <p className="text-sm text-destructive">
                {createProduct.error.message}
              </p>
            )}
          </form>
        </div>
      )}

      {filteredProducts && filteredProducts.length > 0 ? (
        <>
          <h2 className="sr-only">Products List</h2>
          <ul className="space-y-2">
          {filteredProducts.map((product: Product) => (
            <li
              key={product.id}
              className="p-4 border rounded-lg bg-card flex items-center justify-between"
            >
              <div>
                <h3 className="font-medium">{product.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(product.price_cents / 100)} • {product.status}
                </p>
              </div>
              <div className="flex gap-2">
                {product.status === "draft" && (
                  <button
                    onClick={() => handleSubmitForApproval(product.id)}
                    disabled={updateStatus.isPending}
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    aria-label={`Submit product ${product.title} for approval`}
                  >
                    Submit
                  </button>
                )}
              </div>
            </li>
          ))}
          </ul>
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No products found</p>
          <p className="text-sm text-muted-foreground mt-2">
            Create your first product to get started.
          </p>
        </div>
      )}
    </div>
  );
}
