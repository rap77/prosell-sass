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
import { useProduct } from "@/lib/api/products";
import { useCurrentOrganizationProfile } from "@/lib/api/userApi";
import { useOrgVerticals } from "@/lib/api/verticals";
import { useBreadcrumbStore } from "@/lib/stores/breadcrumbStore";
import type { CategoryNode } from "@/types/category";

/**
 * Recursively find a category node by ID in the verticals tree.
 */
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

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = typeof params.id === "string" ? params.id : "";

  // Fetch product
  const { data: product, isLoading: isLoadingProduct } = useProduct(
    productId || undefined,
    { internal: true },
  );

  // Fetch org verticals to get category schema
  const { data: orgProfile } = useCurrentOrganizationProfile();
  const { data: verticalsData, isLoading: isLoadingVerticals } =
    useOrgVerticals(orgProfile?.id ?? null);

  // Find the category in the verticals tree
  const categoryId = product?.category_id;
  const verticals = verticalsData?.verticals;
  const category =
    categoryId && verticals ? findCategoryById(verticals, categoryId) : null;

  // Breadcrumb
  const setBreadcrumbLabel = useBreadcrumbStore((state) => state.setLabel);
  const clearBreadcrumbLabel = useBreadcrumbStore((state) => state.clearLabel);

  useEffect(() => {
    const title = product?.title;
    if (!title || !productId) return;
    setBreadcrumbLabel(productId, title);
    return () => clearBreadcrumbLabel(productId);
  }, [product?.title, productId, setBreadcrumbLabel, clearBreadcrumbLabel]);

  const isLoading = isLoadingProduct || isLoadingVerticals;

  if (isLoading) {
    return (
      <div className="max-w-[896px] mx-auto flex justify-center p-16">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-[896px] mx-auto">
        <p>Producto no encontrado.</p>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="max-w-[896px] mx-auto">
        <p>
          Categoría no encontrada. El producto puede pertenecer a una categoría
          deshabilitada.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[896px] mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4 mb-7">
        <Link
          href="/catalog"
          className="inline-flex items-center gap-1.5 h-9 px-3 mt-0.5 bg-bg-elevated border border-border-default rounded-lg text-text-secondary text-sm no-underline flex-shrink-0"
        >
          <ArrowLeft size={13} strokeWidth={2} />
          Volver
        </Link>

        <div>
          <h1 className="m-0 text-2xl font-bold tracking-tight text-text-primary">
            Editar {category.name}
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
