"use client";

/**
 * CatalogPage — ProSell Inventario screen.
 *
 * 4 view modes toggled via tab bar in the header:
 *   grilla  → card grid (default)
 *   tabla   → DataGrid (TanStack Table + virtualizer)
 *   estado  → vehicles grouped by status
 *   carga   → inline BulkUploadCSV
 *
 * Data: useInfiniteVehicles + useDeleteVehicle
 * Filters: useVehicleFilters (URL state)
 * Design: var(--ps-*) tokens throughout
 */

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  LayoutGrid,
  TableIcon,
  Layers,
  Upload,
  Plus,
  Search,
  Car,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { DataGrid } from "@/components/datagrid/DataGrid";
import { DataGridSkeleton } from "@/components/datagrid/DataGridSkeleton";
import { FilterSidebar } from "@/components/filters/FilterSidebar";
import { FilterPills } from "@/components/filters/FilterPills";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { BulkUploadCSV } from "@/components/upload/BulkUploadCSV";
import { BulkBranchAssign } from "@/components/branches/BulkBranchAssign";
import { CatalogErrorBoundary } from "@/components/catalog/CatalogErrorBoundary";
import {
  StatusBadge,
  type VehicleStatus,
} from "@/components/datagrid/StatusBadge";
import { useVehicleFilters } from "@/lib/hooks/useVehicleFilters";
import {
  useInfiniteProducts,
  useDeleteProduct,
  transformProductToVehicle,
} from "@/lib/api/products";
import { useCurrentOrganizationProfile } from "@/lib/api/userApi";
import { useOrgVerticals } from "@/lib/api/verticals";
import { useProductImageUrlsBatch } from "@/lib/api/productImageUrlsBatch";
import { ProductCard } from "@/components/catalog/ProductCard";
import { mapProductStatusToVehicleStatus } from "@/lib/utils/mapProductStatusToVehicleStatus";
import { getApiStatus } from "@/lib/utils/getApiStatus";
import { getAttributeMap, type Product } from "@/types/product";
import type { CategoryPresentation, AttributeSchemaEntry } from "@/types/category";

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewMode = "grilla" | "tabla" | "estado" | "carga";

const TABS: { id: ViewMode; label: string; icon: React.ElementType }[] = [
  { id: "grilla", label: "Grilla", icon: LayoutGrid },
  { id: "tabla", label: "Tabla", icon: TableIcon },
  { id: "estado", label: "Por estado", icon: Layers },
  { id: "carga", label: "Carga masiva", icon: Upload },
];

const STATUS_ORDER: VehicleStatus[] = [
  "published",
  "online",
  "pending",
  "draft",
  "expired",
  "failed",
  "sold",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({
  hasFilters,
  onAdd,
  onBulk,
}: {
  hasFilters: boolean;
  onAdd: () => void;
  onBulk: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        height: "100%",
        padding: 48,
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "var(--ps-bg-elevated)",
          border: "1px solid var(--ps-border-default)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Car
          size={28}
          style={{ color: "var(--ps-text-tertiary)" }}
          strokeWidth={1.5}
        />
      </div>
      <div style={{ maxWidth: 320 }}>
        <p
          style={{
            margin: "0 0 6px",
            fontSize: 16,
            fontWeight: 600,
            color: "var(--ps-text-primary)",
          }}
        >
          {hasFilters ? "Sin resultados" : "Tu catálogo está vacío"}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: "var(--ps-text-secondary)",
            lineHeight: 1.6,
          }}
        >
          {hasFilters
            ? "Ajustá los filtros o el término de búsqueda."
            : "Agregá tu primer producto o cargá un CSV masivo para empezar."}
        </p>
      </div>
      {!hasFilters && (
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={onAdd}
            style={{
              height: 38,
              padding: "0 18px",
              background: "var(--ps-cyan)",
              color: "var(--ps-bg-base)",
              border: 0,
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Agregar producto
          </button>
          <button
            type="button"
            onClick={onBulk}
            style={{
              height: 38,
              padding: "0 18px",
              background: "transparent",
              color: "var(--ps-text-secondary)",
              border: "1px solid var(--ps-input-border)",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Upload size={14} strokeWidth={2} />
            Carga masiva
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        padding: 48,
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "var(--ps-error-bg)",
          border: "1px solid rgba(240,68,56,0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <AlertCircle
          size={28}
          style={{ color: "var(--ps-error)" }}
          strokeWidth={1.5}
        />
      </div>
      <div style={{ maxWidth: 320 }}>
        <p
          style={{
            margin: "0 0 6px",
            fontSize: 15,
            fontWeight: 600,
            color: "var(--ps-text-primary)",
          }}
        >
          Error al cargar productos
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: "var(--ps-text-secondary)",
            lineHeight: 1.6,
          }}
        >
          {message}
        </p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        style={{
          height: 38,
          padding: "0 18px",
          background: "var(--ps-cyan)",
          color: "var(--ps-bg-base)",
          border: 0,
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <RefreshCw size={14} strokeWidth={2} />
        Reintentar
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CatalogPage() {
  const router = useRouter();
  const { filters, setFilter } = useVehicleFilters();
  const deleteProduct = useDeleteProduct();
  const [viewMode, setViewMode] = useState<ViewMode>("grilla");
  const [showBulkBranchAssign, setShowBulkBranchAssign] = useState(false);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);

  const apiFilters = {
    search: filters.search || undefined,
    status: getApiStatus(filters.status[0]),
    make: filters.brand[0] || undefined,
    year_min: filters.year[0] !== 2010 ? filters.year[0] : undefined,
    year_max: filters.year[1] !== 2026 ? filters.year[1] : undefined,
  };

  const {
    data,
    isLoading,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteProducts(apiFilters, 50);

  // Vertical contracts: presentation + attribute_schema per category.
  // (Subsystem A — replaces the legacy `isVehicleProduct` filter with a
  // generic category-driven model. The map is keyed by `category_id` so each
  // product can resolve its category's presentation, attribute schema, and
  // vertical slug in O(1).)
  const { data: orgProfile } = useCurrentOrganizationProfile();
  const organizationId = orgProfile?.id ?? null;
  const { data: verticalsData } = useOrgVerticals(organizationId);

  // Image URLs for the visible products (batched; see T7a-0).
  // We resolve URLs at the container instead of letting the card fetch
  // per-product (the legacy VehicleCard did the latter). ProductCard is
  // a pure presentational function of its props; the container is the
  // source of truth for the signed cover URL.
  const { urls: productImageUrls } = useProductImageUrlsBatch(
    (data?.pages[0]?.items ?? []).map((p) => p.id),
  );

  // category_id → { presentation, schema, verticalSlug }.
  // Fallback chain per the foundation spec: category-level presentation
  // wins, else the vertical-level default, else null (card renders the
  // default fields). Built inline — React Compiler handles memoization
  // for this small per-render computation (PR #24: useMemo removal convention).
  const categoryPresentationMap = new Map<
    string,
    {
      presentation: CategoryPresentation | null;
      schema: Record<string, AttributeSchemaEntry>;
      verticalSlug: string | null;
    }
  >();
  for (const vertical of verticalsData?.verticals ?? []) {
    for (const cat of vertical.categories) {
      categoryPresentationMap.set(cat.id, {
        presentation: cat.presentation ?? vertical.presentation ?? null,
        schema: cat.attribute_schema,
        verticalSlug: vertical.slug,
      });
    }
  }

  // T7a: removed `.filter(isVehicleProduct)` — the catalog is now generic
  // (Subsystem A: a product is a product; presentation is driven by the
  // category's vertical contract, not by a hardcoded `category: 'vehicle'`
  // check). `vehicles` is kept as the legacy transform for the tabla view
  // (DataGrid expects the transformed shape with `price: number` and
  // `status: VehicleStatus`).
  const products = data?.pages[0]?.items ?? [];
  // Transform to vehicle-like for views that need it
  const vehicles = products.map(transformProductToVehicle);

  // T7b: per-product view model for the generic ProductCard. Resolves
  // presentation + schema + verticalSlug + imageUrl for each product
  // in a single pass. The container is the source of truth for the
  // signed cover URL (via the batch hook from T7a-0) — ProductCard
  // stays a pure presentational function of its props, matching the
  // spec §3 "container/presentational" invariant.
  // Built inline — React Compiler handles memoization (PR #24 convention).
  const viewModels = products.map((product) => {
    const meta = categoryPresentationMap.get(product.category_id);
    return {
      product,
      presentation: meta?.presentation ?? null,
      attributeSchema: meta?.schema ?? {},
      productAttributes: getAttributeMap(product.attributes),
      verticalSlug: meta?.verticalSlug ?? null,
      imageUrl: productImageUrls.get(product.id) ?? null,
    };
  });

  const hasFilters = !!(
    filters.search ||
    filters.status.length > 0 ||
    filters.brand.length > 0
  );

  const handleEdit = (id: string) => router.push(`/catalog/${id}/edit`);
  const handleView = (id: string) => router.push(`/catalog/${id}`);
  const handleDelete = (id: string) => deleteProduct.mutate(id);
  const handlePublish = (_id: string) =>
    toast.info("Publicación múltiple disponible en la Fase 4.");

  const handleBulkAssignBranch = (ids: string[]) => {
    setSelectedVehicleIds(ids);
    setShowBulkBranchAssign(true);
  };

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage)
          fetchNextPage();
      },
      { threshold: 1.0 },
    );
    obs.observe(el);
    return () => obs.unobserve(el);
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // ── Bulk upload handler ──────────────────────────────────────────────────
  // ── Grouped by status (estado view) ─────────────────────────────────────
  // T7c: groups viewModels (not raw products) by mapped status. Uses
  // the generic `mapProductStatusToVehicleStatus` mapper from T6a
  // instead of the legacy `transformProductToVehicle().status` indirection.
  const viewModelsByStatus = Object.fromEntries(
    STATUS_ORDER.map((s) => [
      s,
      viewModels.filter(
        (vm) => mapProductStatusToVehicleStatus(vm.product.status) === s,
      ),
    ]),
  );

  return (
    <CatalogErrorBoundary>
      <div
        style={{
          display: "flex",
          height: "calc(100vh - 4rem)",
          overflow: "hidden",
        }}
      >
        {/* ── Left filter sidebar ──────────────────────────────────────────── */}
        <FilterSidebar />

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "20px 24px 0",
              borderBottom: "1px solid var(--ps-border-subtle)",
              background: "var(--ps-bg-base)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 16,
                marginBottom: 16,
              }}
            >
              {/* Title + count */}
              <div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: 22,
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    color: "var(--ps-text-primary)",
                    lineHeight: 1.2,
                  }}
                >
                  Catálogo
                </h1>
                <p
                  style={{
                    margin: "3px 0 0",
                    fontSize: 13,
                    color: "var(--ps-text-secondary)",
                  }}
                >
                  {isLoading
                    ? "Cargando..."
                    : `${vehicles.length} producto${vehicles.length !== 1 ? "s" : ""}`}
                </p>
              </div>

              {/* Search + CTA */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: 11,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--ps-text-tertiary)",
                      pointerEvents: "none",
                      display: "inline-flex",
                    }}
                  >
                    <Search size={14} strokeWidth={2} />
                  </span>
                  <input
                    type="search"
                    placeholder="Buscar producto..."
                    value={filters.search}
                    onChange={(e) => setFilter("search", e.target.value)}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "var(--ps-cyan)";
                      e.currentTarget.style.boxShadow =
                        "0 0 0 3px var(--ps-input-focus-shadow)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor =
                        "var(--ps-input-border)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                    style={{
                      height: 36,
                      width: 220,
                      paddingLeft: 32,
                      paddingRight: 12,
                      background: "var(--ps-input-bg)",
                      border: "1px solid var(--ps-input-border)",
                      borderRadius: 8,
                      color: "var(--ps-text-primary)",
                      fontSize: 13,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/catalog/create")}
                  style={{
                    height: 36,
                    padding: "0 14px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "var(--ps-cyan)",
                    color: "var(--ps-bg-base)",
                    border: 0,
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Plus size={14} strokeWidth={2.5} />
                  Agregar producto
                </button>
              </div>
            </div>

            {/* View mode tabs */}
            <div style={{ display: "flex", gap: 2 }}>
              {TABS.map(({ id, label, icon: Icon }) => {
                const active = viewMode === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setViewMode(id)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      height: 36,
                      padding: "0 14px",
                      background: "transparent",
                      border: 0,
                      borderRadius: "8px 8px 0 0",
                      fontSize: 13,
                      fontWeight: active ? 600 : 400,
                      color: active
                        ? "var(--ps-cyan)"
                        : "var(--ps-text-secondary)",
                      cursor: "pointer",
                      borderBottom: active
                        ? "2px solid var(--ps-cyan)"
                        : "2px solid transparent",
                      transition: "color 150ms",
                    }}
                  >
                    <Icon size={14} strokeWidth={active ? 2.5 : 2} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active filter pills */}
          <FilterPills />

          {/* ── Content area ─────────────────────────────────────────────── */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: viewMode === "tabla" ? 0 : 24,
            }}
          >
            {/* CARGA MASIVA */}
            {viewMode === "carga" && (
              <BulkUploadCSV
                onSuccess={() => {
                  toast.success("Carga completada");
                  setViewMode("grilla");
                }}
                onCancel={() => setViewMode("grilla")}
              />
            )}

            {/* DATA VIEWS: grilla / tabla / estado */}
            {viewMode !== "carga" && (
              <>
                {isLoading && <DataGridSkeleton />}

                {!isLoading && error && (
                  <ErrorState
                    message={
                      error instanceof Error
                        ? error.message
                        : "Error inesperado."
                    }
                    onRetry={() => {
                      void refetch();
                    }}
                  />
                )}

                {!isLoading && !error && vehicles.length === 0 && (
                  <EmptyState
                    hasFilters={hasFilters}
                    onAdd={() => router.push("/catalog/create")}
                    onBulk={() => setViewMode("carga")}
                  />
                )}

                {!isLoading && !error && vehicles.length > 0 && (
                  <>
                    {/* GRILLA */}
                    {viewMode === "grilla" && (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fill, minmax(240px, 1fr))",
                          gap: 16,
                        }}
                      >
                        {viewModels.map((vm) => (
                          <ProductCard
                            key={vm.product.id}
                            product={vm.product}
                            presentation={vm.presentation}
                            attributeSchema={vm.attributeSchema}
                            productAttributes={vm.productAttributes}
                            verticalSlug={vm.verticalSlug}
                            imageUrl={vm.imageUrl}
                            onView={() => handleView(vm.product.id)}
                            onEdit={() => handleEdit(vm.product.id)}
                            onDelete={() => handleDelete(vm.product.id)}
                          />
                        ))}
                      </div>
                    )}

                    {/* TABLA */}
                    {viewMode === "tabla" && (
                      <div style={{ padding: 24 }}>
                        <DataGrid
                          data={vehicles}
                          onPublish={handlePublish}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onBulkAssignBranch={handleBulkAssignBranch}
                          onRowClick={handleView}
                        />
                      </div>
                    )}

                    {/* ESTADO — grouped by status */}
                    {viewMode === "estado" && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 32,
                        }}
                      >
                        {STATUS_ORDER.filter(
                          (s) => viewModelsByStatus[s].length > 0,
                        ).map((status) => (
                          <section key={status}>
                            {/* Group header */}
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                marginBottom: 14,
                              }}
                            >
                              <StatusBadge status={status} />
                              <span
                                style={{
                                  fontSize: 13,
                                  color: "var(--ps-text-secondary)",
                                  fontWeight: 500,
                                }}
                              >
                                {viewModelsByStatus[status].length} producto
                                {viewModelsByStatus[status].length !== 1
                                  ? "s"
                                  : ""}
                              </span>
                              <span
                                style={{
                                  flex: 1,
                                  height: 1,
                                  background: "var(--ps-border-subtle)",
                                }}
                              />
                            </div>
                            {/* Grid of cards */}
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "repeat(auto-fill, minmax(220px, 1fr))",
                                gap: 12,
                              }}
                            >
                              {viewModelsByStatus[status].map((vm) => (
                                <ProductCard
                                  key={vm.product.id}
                                  product={vm.product}
                                  presentation={vm.presentation}
                                  attributeSchema={vm.attributeSchema}
                                  productAttributes={vm.productAttributes}
                                  verticalSlug={vm.verticalSlug}
                                  imageUrl={vm.imageUrl}
                                  onView={() => handleView(vm.product.id)}
                                  onEdit={() => handleEdit(vm.product.id)}
                                  onDelete={() => handleDelete(vm.product.id)}
                                />
                              ))}
                            </div>
                          </section>
                        ))}
                      </div>
                    )}

                    {/* Infinite scroll sentinel */}
                    {hasNextPage && viewMode !== "tabla" && (
                      <div
                        ref={sentinelRef}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 20,
                          gap: 8,
                        }}
                      >
                        {isFetchingNextPage && (
                          <>
                            <div
                              style={{
                                width: 16,
                                height: 16,
                                borderRadius: "50%",
                                border: "2px solid transparent",
                                borderTopColor: "var(--ps-cyan)",
                                animation: "spin 0.8s linear infinite",
                              }}
                            />
                            <span
                              style={{
                                fontSize: 13,
                                color: "var(--ps-text-secondary)",
                              }}
                            >
                              Cargando más...
                            </span>
                          </>
                        )}
                      </div>
                    )}

                    {!hasNextPage &&
                      vehicles.length > 0 &&
                      viewMode !== "tabla" && (
                        <p
                          style={{
                            textAlign: "center",
                            fontSize: 12,
                            color: "var(--ps-text-tertiary)",
                            padding: "16px 0",
                          }}
                        >
                          {vehicles.length} producto
                          {vehicles.length !== 1 ? "s" : ""} en total
                        </p>
                      )}
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Command palette */}
        <CommandPalette vehicles={vehicles} />

        {/* Bulk Branch Assign modal */}
        <BulkBranchAssign
          open={showBulkBranchAssign}
          onOpenChange={setShowBulkBranchAssign}
          productIds={selectedVehicleIds}
          productCount={selectedVehicleIds.length}
        />
      </div>
    </CatalogErrorBoundary>
  );
}
