"use client";

import { useState } from "react";
import { useCurrentOrganizationProfile } from "@/lib/api/userApi";
import { useOrgVerticals } from "@/lib/api/verticals";
import { ProductForm } from "@/components/forms/ProductForm";
import { GenericProductForm } from "@/components/forms/GenericProductForm";
import { CategorySelectorModal } from "@/components/forms/CategorySelectorModal";
import type { CategoryNode } from "@/types/category";

function isVehicleCategory(category: CategoryNode): boolean {
  return "vin" in (category.attribute_schema ?? {});
}

export default function CreateProductPage() {
  const { data: orgProfile } = useCurrentOrganizationProfile();
  const organizationId = orgProfile?.id ?? null;
  const { data: verticalsData } = useOrgVerticals(organizationId);

  const [selectedCategory, setSelectedCategory] = useState<CategoryNode | null>(
    null,
  );

  const verticals = verticalsData?.verticals ?? [];

  return (
    <div style={{ maxWidth: 896, margin: "0 auto" }}>
      {selectedCategory ? (
        <>
          <div style={{ marginBottom: 28 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "var(--ps-text-primary)",
              }}
            >
              Agregar {selectedCategory.name}
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13 }}>
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  color: "var(--ps-text-secondary)",
                  textDecoration: "underline",
                  fontSize: 13,
                }}
              >
                Cambiar categoría
              </button>
            </p>
          </div>

          {isVehicleCategory(selectedCategory) ? (
            <ProductForm mode="create" />
          ) : (
            <GenericProductForm category={selectedCategory} />
          )}
        </>
      ) : (
        <>
          <div style={{ marginBottom: 28 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "var(--ps-text-primary)",
              }}
            >
              Agregar producto
            </h1>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 13,
                color: "var(--ps-text-secondary)",
              }}
            >
              Seleccioná una categoría para comenzar.
            </p>
          </div>

          <CategorySelectorModal
            verticals={verticals}
            onSelect={setSelectedCategory}
          />
        </>
      )}
    </div>
  );
}
