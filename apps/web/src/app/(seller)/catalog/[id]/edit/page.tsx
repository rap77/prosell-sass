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
import { useEffect, useMemo } from "react";

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
  const category = useMemo(() => {
    if (!categoryId || !verticals) return null;
    return findCategoryById(verticals, categoryId);
  }, [categoryId, verticals]);

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
      <div
        style={{
          maxWidth: 896,
          margin: "0 auto",
          display: "flex",
          justifyContent: "center",
          padding: 64,
        }}
      >
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ maxWidth: 896, margin: "0 auto" }}>
        <p>Producto no encontrado.</p>
      </div>
    );
  }

  if (!category) {
    return (
      <div style={{ maxWidth: 896, margin: "0 auto" }}>
        <p>
          Categoría no encontrada. El producto puede pertenecer a una categoría
          deshabilitada.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 896, margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 16,
          marginBottom: 28,
        }}
      >
        <Link
          href="/catalog"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            height: 36,
            padding: "0 12px",
            marginTop: 2,
            background: "var(--ps-bg-elevated)",
            border: "1px solid var(--ps-border-default)",
            borderRadius: 8,
            color: "var(--ps-text-secondary)",
            fontSize: 13,
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={13} strokeWidth={2} />
          Volver
        </Link>

        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--ps-text-primary)",
            }}
          >
            Editar {category.name}
          </h1>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 13,
              color: "var(--ps-text-secondary)",
            }}
          >
            Actualizá la información y las fotos del producto.
          </p>
        </div>
      </div>

      <UnifiedProductForm
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
