"use client";

/**
 * CatalogPage — ProSell Inventario screen.
 *
 * 4 view modes toggled via tab bar in the header:
 *   grilla  → card grid (default)
 *   tabla   → DataGrid (TanStack Table + virtualizer)
 *   estado  → rows grouped by status
 *   carga   → inline BulkUploadCSV
 *
 * Data: useInfiniteVehicles + useDeleteVehicle
 * Filters: useCatalogFilters, driven by the selected category's filter_fields
 * Design: var(--ps-*) tokens throughout
 */

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  LayoutGrid,
  TableIcon,
  Layers,
  Upload,
  Plus,
  Search,
  Package,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { DataGrid } from "@/components/datagrid/DataGrid";
import { DataGridSkeleton } from "@/components/datagrid/DataGridSkeleton";
import { FilterSidebar } from "@/components/filters/FilterSidebar";
import { FilterPills } from "@/components/filters/FilterPills";
import { CategorySelector } from "@/components/filters/CategorySelector";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { BulkUploadCSV } from "@/components/upload/BulkUploadCSV";
import { BulkBranchAssign } from "@/components/branches/BulkBranchAssign";
import { CatalogErrorBoundary } from "@/components/catalog/CatalogErrorBoundary";
import {
  StatusBadge,
  type VehicleStatus,
} from "@/components/datagrid/StatusBadge";
import { useCatalogFilters } from "@/lib/hooks/useCatalogFilters";
import {
  useInfiniteProducts,
  useDeleteProduct,
  transformProductToVehicle,
} from "@/lib/api/products";
import { useCurrentOrganizationProfile } from "@/lib/api/userApi";
import { useOrgVerticals, useFilterValues } from "@/lib/api/verticals";
import { useProductImageUrlsBatch } from "@/lib/api/productImageUrlsBatch";
import { ProductCard } from "@/components/catalog/ProductCard";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import { mapProductStatusToVehicleStatus } from "@/lib/utils/mapProductStatusToVehicleStatus";
import { getApiStatus } from "@/lib/utils/getApiStatus";
import { getAttributeMap } from "@/types/product";
import { cn } from "@/lib/utils";
import type {
  CategoryPresentation,
  AttributeSchemaEntry,
} from "@/types/category";

// ─── Types ────────────────────────────────────────────────────────────────────

const VIEW_MODE = {
  GRID: "grilla",
  TABLE: "tabla",
  STATUS: "estado",
  BULK: "carga",
} as const;

type ViewMode = (typeof VIEW_MODE)[keyof typeof VIEW_MODE];

const TABS: { id: ViewMode; label: string; icon: React.ElementType }[] = [
  { id: VIEW_MODE.GRID, label: "Grilla", icon: LayoutGrid },
  { id: VIEW_MODE.TABLE, label: "Tabla", icon: TableIcon },
  { id: VIEW_MODE.STATUS, label: "Por estado", icon: Layers },
  { id: VIEW_MODE.BULK, label: "Carga masiva", icon: Upload },
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
    <div className="flex flex-col items-center justify-center gap-4 h-full p-12 text-center">
      <div className="w-16 h-16 rounded-full bg-ps-elevated border border-ps-border-default flex items-center justify-center">
        <Package size={28} className="text-ps-tertiary" strokeWidth={1.5} />
      </div>
      <div className="max-w-[320px]">
        <p className="m-0 mb-[6px] text-base font-semibold text-ps-text-primary">
          {hasFilters ? "Sin resultados" : "Tu catálogo está vacío"}
        </p>
        <p className="m-0 text-[13px] text-ps-text-secondary leading-relaxed">
          {hasFilters
            ? "Ajustá los filtros o el término de búsqueda."
            : "Agregá tu primer producto o cargá un CSV masivo para empezar."}
        </p>
      </div>
      {!hasFilters && (
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onAdd}
            className="h-[38px] px-[18px] bg-ps-cyan text-ps-base border-0 rounded-lg text-[13px] font-semibold cursor-pointer"
          >
            Agregar producto
          </button>
          <button
            type="button"
            onClick={onBulk}
            className="h-[38px] px-[18px] bg-transparent text-ps-text-secondary border border-ps-border-default rounded-lg text-[13px] font-medium cursor-pointer inline-flex items-center gap-[6px]"
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
    <div className="flex flex-col items-center gap-4 p-12 text-center">
      <div
        className="w-16 h-16 rounded-full bg-ps-error-bg border flex items-center justify-center"
        style={{ borderColor: "rgba(240,68,56,0.25)" }}
      >
        <AlertCircle
          size={28}
          className="text-ps-tertiary"
          style={{ color: "var(--ps-error)" }}
          strokeWidth={1.5}
        />
      </div>
      <div className="max-w-[320px]">
        <p className="m-0 mb-[6px] text-[15px] font-semibold text-ps-text-primary">
          Error al cargar productos
        </p>
        <p className="m-0 text-[13px] text-ps-text-secondary leading-relaxed">
          {message}
        </p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="h-[38px] px-[18px] bg-ps-cyan text-ps-base border-0 rounded-lg text-[13px] font-semibold cursor-pointer inline-flex items-center gap-[6px]"
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
  const searchParams = useSearchParams();
  const deleteProduct = useDeleteProduct();
  const [viewMode, setViewMode] = useState<ViewMode>("grilla");
  const [showBulkBranchAssign, setShowBulkBranchAssign] = useState(false);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  // Vertical contracts: presentation + attribute_schema per category.
  // (Subsystem A — replaces the legacy `isVehicleProduct` filter with a
  // generic category-driven model. The map is keyed by `category_id` so each
  // product can resolve its category's presentation, attribute schema, and
  // vertical slug in O(1).)
  const { data: orgProfile } = useCurrentOrganizationProfile();
  const organizationId = orgProfile?.id ?? null;
  const { data: verticalsData } = useOrgVerticals(organizationId);
  const allCategories = (verticalsData?.verticals ?? []).flatMap(
    (vertical) => vertical.categories,
  );
  const selectedCategory =
    allCategories.find((c) => c.id === selectedCategoryId) ?? null;
  const filterFields = selectedCategory?.filter_fields ?? [];

  const { values, setFilter } = useCatalogFilters(filterFields);
  const { data: facetValues = {} } = useFilterValues(selectedCategoryId);

  const search = searchParams.get("search") ?? "";
  const status = getApiStatus(searchParams.get("status") ?? undefined);
  const attributes: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value) attributes[key] = value;
  }

  const apiFilters = {
    search: search || undefined,
    status,
    category_id: selectedCategoryId ?? undefined,
    attributes,
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

  // Image URLs for the visible products (batched; see T7a-0).
  // We resolve URLs at the container instead of letting the card fetch
  // per-product (the legacy VehicleCard did the latter). ProductCard is
  // a pure presentational function of its props; the container is the
  // source of truth for the signed cover URL.
  // ponytail: flatten all pages for infinite scroll support
  const allProducts = data?.pages.flatMap((page) => page.items) ?? [];
  const { urls: productImageUrls } = useProductImageUrlsBatch(
    allProducts.map((p) => p.id),
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
  // check). `rows` is kept as the legacy transform for the tabla view
  // (DataGrid expects the transformed shape with `price: number` and
  // `status: VehicleStatus`).
  const products = allProducts;
  // Transform to the generic catalog-row shape the table view needs
  const rows = products.map(transformProductToVehicle);

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
    search ||
    status ||
    Object.values(values).some(Boolean)
  );

  const handleEdit = (id: string) => router.push(`/catalog/${id}/edit`);
  const handleView = (id: string) => router.push(`/catalog/${id}`);
  const handleDeleteClick = (id: string, title: string) =>
    setDeleteTarget({ id, title });
  const handleDeleteById = (id: string) => {
    const product = products.find((p) => p.id === id);
    setDeleteTarget({ id, title: product?.title ?? "este producto" });
  };
  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      deleteProduct.mutate(deleteTarget.id);
      setDeleteTarget(null);
    }
  };
  const handlePublish = (_id: string) =>
    toast.info("Publicación múltiple disponible en la Fase 4.");

  const handleBulkAssignBranch = (ids: string[]) => {
    setSelectedVehicleIds(ids);
    setShowBulkBranchAssign(true);
  };

  const handleBulkUploadSuccess = () => {
    toast.success("Carga completada");
    setViewMode("grilla");
  };

  const handleBulkUploadCancel = () => {
    setViewMode("grilla");
  };

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || !hasNextPage || isFetchingNextPage) {
          return;
        }
        void fetchNextPage();
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
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        {/* ── Left filter sidebar ──────────────────────────────────────────── */}
        <FilterSidebar
          fields={filterFields}
          schema={selectedCategory?.attribute_schema ?? {}}
          facetValues={facetValues}
        />

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="pt-5 px-6 pb-0 border-b border-ps-border-subtle bg-ps-base">
            <div className="max-w-[280px] mb-4">
              <CategorySelector
                categories={allCategories}
                value={selectedCategoryId}
                onChange={setSelectedCategoryId}
              />
            </div>

            <div className="flex items-start justify-between gap-4 mb-4">
              {/* Title + count */}
              <div>
                <h1 className="m-0 text-[22px] font-bold tracking-[-0.02em] text-ps-text-primary leading-tight">
                  Catálogo
                </h1>
                <p className="mt-[3px] mb-0 text-[13px] text-ps-text-secondary">
                  {isLoading
                    ? "Cargando..."
                    : `${rows.length} producto${rows.length !== 1 ? "s" : ""}`}
                </p>
              </div>

              {/* Search + CTA */}
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <span className="absolute left-[11px] top-1/2 -translate-y-1/2 text-ps-tertiary pointer-events-none inline-flex">
                    <Search size={14} strokeWidth={2} />
                  </span>
                  <input
                    type="search"
                    placeholder="Buscar producto..."
                    value={search}
                    onChange={(e) => setFilter("search", e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                    className={cn(
                      "h-9 w-[220px] pl-8 pr-3 border rounded-lg text-ps-text-primary text-[13px] outline-none box-border",
                      searchFocused
                        ? "border-ps-border-active shadow-input-focus"
                        : "border-ps-border-default",
                    )}
                    style={{ background: "var(--ps-input-bg)" }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/catalog/create")}
                  className="h-9 px-[14px] inline-flex items-center gap-[6px] bg-ps-cyan text-ps-base border-0 rounded-lg text-[13px] font-semibold cursor-pointer whitespace-nowrap"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  Agregar producto
                </button>
              </div>
            </div>

            {/* View mode tabs */}
            <div className="flex gap-0.5">
              {TABS.map(({ id, label, icon: Icon }) => {
                const active = viewMode === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setViewMode(id)}
                    className={cn(
                      "inline-flex items-center gap-[6px] h-9 px-[14px] bg-transparent border-0 rounded-t-lg text-[13px] cursor-pointer border-b-2 transition-colors duration-150",
                      active
                        ? "font-semibold text-ps-cyan border-b-ps-border-active"
                        : "font-normal text-ps-text-secondary border-b-transparent",
                    )}
                  >
                    <Icon size={14} strokeWidth={active ? 2.5 : 2} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active filter pills */}
          <FilterPills fields={filterFields} />

          {/* ── Content area ─────────────────────────────────────────────── */}
          <div
            className={cn(
              "flex-1 overflow-y-auto",
              viewMode === "tabla" ? "p-0" : "p-6",
            )}
          >
            {/* CARGA MASIVA */}
            {viewMode === "carga" && (
              <BulkUploadCSV
                onSuccess={handleBulkUploadSuccess}
                onCancel={handleBulkUploadCancel}
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

                {!isLoading && !error && rows.length === 0 && (
                  <EmptyState
                    hasFilters={hasFilters}
                    onAdd={() => router.push("/catalog/create")}
                    onBulk={() => setViewMode("carga")}
                  />
                )}

                {!isLoading && !error && rows.length > 0 && (
                  <>
                    {/* GRILLA */}
                    {viewMode === "grilla" && (
                      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
                        {viewModels.map((vm) => (
                          <ProductCard
                            key={vm.product.id}
                            product={vm.product}
                            presentation={vm.presentation}
                            attributeSchema={vm.attributeSchema}
                            productAttributes={vm.productAttributes}
                            verticalSlug={vm.verticalSlug}
                            imageUrl={vm.imageUrl}
                            orgCode={vm.product.org_code}
                            orgColor={vm.product.org_color}
                            onView={() => handleView(vm.product.id)}
                            onEdit={() => handleEdit(vm.product.id)}
                            onDelete={() =>
                              handleDeleteClick(vm.product.id, vm.product.title)
                            }
                          />
                        ))}
                      </div>
                    )}

                    {/* TABLA */}
                    {viewMode === "tabla" && (
                      <div className="p-6">
                        <DataGrid
                          data={rows}
                          onPublish={handlePublish}
                          onEdit={handleEdit}
                          onDelete={handleDeleteById}
                          onBulkAssignBranch={handleBulkAssignBranch}
                          onRowClick={handleView}
                        />
                      </div>
                    )}

                    {/* ESTADO — grouped by status */}
                    {viewMode === "estado" && (
                      <div className="flex flex-col gap-8">
                        {STATUS_ORDER.filter(
                          (s) => viewModelsByStatus[s].length > 0,
                        ).map((status) => (
                          <section key={status}>
                            {/* Group header */}
                            <div className="flex items-center gap-2.5 mb-[14px]">
                              <StatusBadge status={status} />
                              <span className="text-[13px] text-ps-text-secondary font-medium">
                                {viewModelsByStatus[status].length} producto
                                {viewModelsByStatus[status].length !== 1
                                  ? "s"
                                  : ""}
                              </span>
                              <span className="flex-1 h-px bg-ps-border-subtle" />
                            </div>
                            {/* Grid of cards */}
                            <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
                              {viewModelsByStatus[status].map((vm) => (
                                <ProductCard
                                  key={vm.product.id}
                                  product={vm.product}
                                  presentation={vm.presentation}
                                  attributeSchema={vm.attributeSchema}
                                  productAttributes={vm.productAttributes}
                                  verticalSlug={vm.verticalSlug}
                                  imageUrl={vm.imageUrl}
                                  orgCode={vm.product.org_code}
                                  orgColor={vm.product.org_color}
                                  onView={() => handleView(vm.product.id)}
                                  onEdit={() => handleEdit(vm.product.id)}
                                  onDelete={() =>
                                    handleDeleteClick(
                                      vm.product.id,
                                      vm.product.title,
                                    )
                                  }
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
                        className="flex items-center justify-center p-5 gap-2"
                      >
                        {isFetchingNextPage && (
                          <>
                            <div
                              className="w-4 h-4 rounded-full border-2 border-transparent"
                              style={{
                                borderTopColor: "var(--ps-cyan)",
                                animation: "spin 0.8s linear infinite",
                              }}
                            />
                            <span className="text-[13px] text-ps-text-secondary">
                              Cargando más...
                            </span>
                          </>
                        )}
                      </div>
                    )}

                    {!hasNextPage &&
                      rows.length > 0 &&
                      viewMode !== "tabla" && (
                        <p className="text-center text-[12px] text-ps-tertiary py-4">
                          {rows.length} producto
                          {rows.length !== 1 ? "s" : ""} en total
                        </p>
                      )}
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Command palette */}
        {/* Prop name kept as `vehicles` (CommandPalette API), value comes
            from the generic `rows` view-model built above. */}
        <CommandPalette vehicles={rows} />

        {/* Bulk Branch Assign modal */}
        <BulkBranchAssign
          open={showBulkBranchAssign}
          onOpenChange={setShowBulkBranchAssign}
          productIds={selectedVehicleIds}
          productCount={selectedVehicleIds.length}
        />

        {/* Delete confirmation dialog */}
        <DeleteConfirmDialog
          open={deleteTarget !== null}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          itemTitle={deleteTarget?.title ?? ""}
          onConfirm={handleDeleteConfirm}
          isDeleting={deleteProduct.isPending}
        />
      </div>
    </CatalogErrorBoundary>
  );
}
