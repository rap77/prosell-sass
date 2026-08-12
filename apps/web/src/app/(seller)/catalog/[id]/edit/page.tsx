"use client";

/**
 * Catalog › Editar producto — Schema-driven product edit form.
 *
 * Wraps UnifiedProductForm in edit mode with product + category pre-loading.
 * On success → redirect to /catalog.
 */

import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useEffect } from "react";

import { UnifiedProductForm } from "@/components/forms/UnifiedProductForm";
import { useCategory } from "@/lib/api/categories";
import { useProduct } from "@/lib/api/products";
import { useOrgVerticals } from "@/lib/api/verticals";
import { useBreadcrumbStore } from "@/lib/stores/breadcrumbStore";
import type { Category, CategoryNode } from "@/types/category";

function findCategoryById(
  verticals: { categories: CategoryNode[] }[],
  categoryId: string,
): CategoryNode | null {
  for (const vertical of verticals) {
    const found = findInTree(vertical.categories, categoryId);
    if (found) return found;
  }
  return null;
}

function findInTree(nodes: CategoryNode[], id: string): CategoryNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children?.length) {
      const found = findInTree(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

function toCategoryNode(category: Category): CategoryNode {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    attribute_schema: category.attribute_schema,
    attribute_groups: category.attribute_groups,
    presentation: category.presentation,
    filter_fields: [],
  };
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = typeof params.id === "string" ? params.id : "";

  // Fetch product
  const { data: product, isLoading: isLoadingProduct } = useProduct(
    productId || undefined,
    { internal: true },
  );

  // The verticals tree holds the effective category configuration used by the
  // form. A direct lookup is only the fallback for a soft-deleted category,
  // which navigation intentionally excludes.
  const { data: verticalsData, isLoading: isLoadingVerticals } =
    useOrgVerticals(product?.organization_id ?? null);
  const { data: categoryData, isLoading: isLoadingCategory } = useCategory(
    product?.category_id,
  );
  const categoryFromVerticals = product?.category_id
    ? findCategoryById(verticalsData?.verticals ?? [], product.category_id)
    : null;
  const category =
    categoryFromVerticals ??
    (categoryData ? toCategoryNode(categoryData) : null);

  // Breadcrumb
  const setBreadcrumbLabel = useBreadcrumbStore((state) => state.setLabel);
  const clearBreadcrumbLabel = useBreadcrumbStore((state) => state.clearLabel);

  useEffect(() => {
    const title = product?.title;
    if (!title || !productId) return;
    setBreadcrumbLabel(productId, title);
    return () => clearBreadcrumbLabel(productId);
  }, [product?.title, productId, setBreadcrumbLabel, clearBreadcrumbLabel]);

  // Wait for the effective schema; only wait for the direct lookup when the
  // category is absent from the active navigation tree.
  const isLoading =
    isLoadingProduct ||
    isLoadingVerticals ||
    (product && !categoryFromVerticals && (isLoadingCategory || !categoryData));

  if (isLoading) {
    return (
      <div className="flex justify-center p-16">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div>
        <p>Producto no encontrado.</p>
      </div>
    );
  }

  if (!category) {
    return (
      <div>
        <p>Categoría no encontrada.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start gap-4 mb-7 max-w-4xl">
        <Link
          href="/catalog"
          className="inline-flex items-center gap-1.5 h-9 px-3 mt-0.5 bg-bg-elevated border border-border-default rounded-lg text-text-secondary text-sm no-underline flex-shrink-0"
        >
          <ArrowLeft size={13} strokeWidth={2} />
          Volver
        </Link>

        <div>
          <h1 className="m-0 text-2xl font-bold tracking-tight text-text-primary">
            Editar {product.title}
          </h1>
          <p className="m-0 mt-1 text-sm text-text-secondary">
            Actualizá la información y las fotos del producto.
          </p>
        </div>
      </div>

      <UnifiedProductForm
        key={productId}
        category={category}
        mode="edit"
        productId={productId}
        onSuccess={() => {
          router.push("/catalog");
          router.refresh();
        }}
      />
    </div>
  );
}
