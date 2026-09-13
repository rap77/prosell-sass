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
  Download,
  Building2,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  StatusBadge,
  type VehicleStatus,
} from "@/components/datagrid/StatusBadge";
import { useCatalogFilters } from "@/lib/hooks/useCatalogFilters";
import {
  useInfiniteProducts,
  useDeleteProduct,
  transformProductToVehicle,
  exportCatalogCsv,
  exportCatalogClientFormat,
} from "@/lib/api/products";
import { extractErrorMessage } from "@/lib/api/extractErrorMessage";
import { useCurrentOrganizationProfile } from "@/lib/api/userApi";
import { useOrganization, useOrganizations } from "@/lib/api/organizations";
import { useOrgVerticals, useFilterValues } from "@/lib/api/verticals";
import { useProductImageUrlsBatch } from "@/lib/api/productImageUrlsBatch";
import { useOrganizationStore } from "@/stores/organizationStore";
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
import type { ElementType } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

const VIEW_MODE = {
  GRID: "grilla",
  TABLE: "tabla",
  STATUS: "estado",
  BULK: "carga",
} as const;

type ViewMode = (typeof VIEW_MODE)[keyof typeof VIEW_MODE];

// u1-export-org-confirmation: which organization's catalog the export
// summary banner/confirmation is about. "own" = the caller's own
// organization (default, no badge). "loading"/"cross-org" only occur when
// `organizationStore.viewingOrgId` is set to a specific organization
// (ORG_ADMIN_VIEW_ALL) — "loading" covers both "name not resolved yet" and
// "organization deleted/inaccessible" (per refined-mockups/interaction-spec.md
// Q2). "all-orgs" (u2-cross-org-export-ui, FR2/FR5.1) occurs when
// `viewingOrgId === "ALL_ORGS"` — `count` is the number of organizations
// with published catalog (`product_count > 0`), same criterion as the
// picker's own filter.
type ExportOrganization =
  | { kind: "own" }
  | { kind: "loading" }
  | { kind: "cross-org"; name: string }
  | { kind: "all-orgs"; count: number };

function resolveExportOrganization(
  viewingOrgId: string | "ALL_ORGS" | null,
  viewingOrganizationName: string | undefined,
  allOrganizationsCount: number,
): ExportOrganization {
  if (viewingOrgId === "ALL_ORGS") {
    return { kind: "all-orgs", count: allOrganizationsCount };
  }
  if (!viewingOrgId) return { kind: "own" };
  if (viewingOrganizationName) {
    return { kind: "cross-org", name: viewingOrganizationName };
  }
  return { kind: "loading" };
}

// u1-export-org-confirmation — AC2.1.1/AC2.1.2: the empty-catalog (404)
// message names the target organization for a cross-org export, uses a
// generic fallback when its name hasn't resolved (or it's gone/inaccessible),
// and keeps the pre-existing own-organization string unchanged.
// u2-cross-org-export-ui — "all-orgs" gets a platform-wide generic message
// (there is no single organization name to mention).
function emptyCatalogExportMessage(organization: ExportOrganization): string {
  if (organization.kind === "cross-org") {
    return `${organization.name} no tiene catálogo publicado para exportar.`;
  }
  if (organization.kind === "loading") {
    return "Esta organización no tiene catálogo publicado para exportar.";
  }
  if (organization.kind === "all-orgs") {
    return "Ninguna organización tiene catálogo publicado para exportar.";
  }
  return "No hay productos publicados para exportar.";
}

const TABS: { id: ViewMode; label: string; icon: ElementType }[] = [
  { id: VIEW_MODE.GRID, label: "Grilla", icon: LayoutGrid },
  { id: VIEW_MODE.TABLE, label: "Tabla", icon: TableIcon },
  { id: VIEW_MODE.STATUS, label: "Por estado", icon: Layers },
  { id: VIEW_MODE.BULK, label: "Carga masiva", icon: Upload },
];

const STATUS_ORDER: VehicleStatus[] = [
  "published",
  "reserved",
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

// ─── Export summary banner ──────────────────────────────────────────────────

function ExportSummaryBanner({
  onContinue,
  onCancel,
  organization,
  isExporting,
}: {
  onContinue: () => void;
  onCancel: () => void;
  organization: ExportOrganization;
  isExporting: boolean;
}) {
  // u2-cross-org-export-ui, FR5.1/Practices Discovery Q2b: "todas las
  // organizaciones" has a strictly larger blast radius than a single
  // cross-org export (one permission-check failure exposes every
  // organization's catalog, not just one), so it gets an explicit warning
  // callout naming the count N — same Continuar/Cancelar mechanism, no
  // typed confirmation word (already decided against in Practices Discovery).
  const isAllOrgs = organization.kind === "all-orgs";
  return (
    <div
      role="status"
      data-testid="export-summary-banner"
      className="flex flex-col gap-2 px-6 py-3 border-b border-ps-border-subtle bg-ps-elevated"
    >
      {organization.kind !== "own" && (
        <div
          data-testid="export-summary-org-badge"
          className="inline-flex w-fit items-center gap-1.5 px-2.5 py-1 rounded-full bg-ps-cyan/10 text-ps-cyan text-[12px] font-semibold"
        >
          <Building2 size={13} strokeWidth={2.5} />
          {organization.kind === "loading" ? (
            <span
              data-testid="export-summary-org-badge-skeleton"
              className="inline-block h-[14px] w-24 rounded bg-ps-cyan/25 animate-pulse"
            />
          ) : isAllOrgs ? (
            <span data-testid="export-summary-all-orgs-count">
              Exportando catálogo de TODAS las organizaciones (
              {organization.count} en total)
            </span>
          ) : (
            <span>Exportando catálogo de: {organization.name}</span>
          )}
        </div>
      )}
      {isAllOrgs && (
        <div
          data-testid="export-summary-all-orgs-warning"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-ps-error-bg text-ps-error text-[12px] font-medium"
        >
          <AlertCircle size={13} strokeWidth={2.5} />
          <span>
            Vas a exportar el catálogo de TODAS las organizaciones (
            {organization.count} en total), no solo la tuya.
          </span>
        </div>
      )}
      <div className="flex items-center justify-between gap-4">
        <p className="m-0 text-[13px] text-ps-text-primary">
          {isExporting
            ? "Exportando catálogo, no cierres esta pestaña..."
            : isAllOrgs
              ? "Se exportará el catálogo completo de productos publicados de todas las organizaciones de la plataforma."
              : "Se exportará el catálogo completo de productos publicados de tu organización."}
        </p>
        {isExporting ? (
          // FR8/refined-mockups Q2: while the real export request is in
          // flight, the banner switches to a distinguishable "exporting"
          // state instead of unmounting — no Continuar/Cancelar to click
          // twice mid-export.
          <span
            data-testid={
              isAllOrgs
                ? "export-summary-state-exporting-all"
                : "export-summary-state-exporting-single"
            }
            className="shrink-0 text-[13px] font-semibold text-ps-cyan"
          >
            Exportando...
          </span>
        ) : (
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={onContinue}
              data-testid="export-summary-continue-button"
              className="h-8 px-3 bg-ps-cyan text-ps-base border-0 rounded-lg text-[13px] font-semibold cursor-pointer"
            >
              Continuar
            </button>
            <button
              type="button"
              onClick={onCancel}
              data-testid="export-summary-cancel-button"
              className="h-8 px-3 bg-transparent text-ps-text-secondary border border-ps-border-default rounded-lg text-[13px] font-medium cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
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
      <div className="w-16 h-16 rounded-full bg-ps-error-bg border border-ps-error/25 flex items-center justify-center">
        <AlertCircle size={28} className="text-ps-error" strokeWidth={1.5} />
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
  const [isExportingClientFormat, setIsExportingClientFormat] = useState(false);
  const [showExportSummary, setShowExportSummary] = useState(false);

  // Vertical contracts: presentation + attribute_schema per category.
  // (Subsystem A — replaces the legacy `isVehicleProduct` filter with a
  // generic category-driven model. The map is keyed by `category_id` so each
  // product can resolve its category's presentation, attribute schema, and
  // vertical slug in O(1).)
  const { data: orgProfile } = useCurrentOrganizationProfile();
  const organizationId = orgProfile?.id ?? null;

  // u1-export-org-confirmation: which organization the client-format export
  // targets. `viewingOrgId` is the same global "view as" state the Header's
  // `OrganizationPicker` writes — reading it here introduces no second,
  // parallel state mechanism. `useOrganization` reuses the SAME cached
  // TanStack Query `OrganizationPicker` already fires (no new network
  // request, see nfr-design/performance-design.md).
  const viewingOrgId = useOrganizationStore((state) => state.viewingOrgId);
  const { organization: viewingOrganization } = useOrganization(
    viewingOrgId && viewingOrgId !== "ALL_ORGS" ? viewingOrgId : undefined,
  );
  // u2-cross-org-export-ui — same cached list (and same product_count > 0
  // criterion) the picker already uses; no new network request (TanStack
  // Query dedupes by queryKey).
  const { data: organizationsForExportCount = [] } = useOrganizations();
  const allOrganizationsCount = organizationsForExportCount.filter(
    (organization) => (organization.product_count ?? 0) > 0,
  ).length;
  const exportOrganization = resolveExportOrganization(
    viewingOrgId,
    viewingOrganization?.name,
    allOrganizationsCount,
  );
  const { data: verticalsData } = useOrgVerticals(organizationId);
  const allCategories = (verticalsData?.verticals ?? []).flatMap(
    (vertical) => vertical.categories,
  );
  const selectedCategory =
    allCategories.find((c) => c.id === selectedCategoryId) ?? null;
  const filterFields = selectedCategory?.filter_fields ?? [];

  const { values } = useCatalogFilters(filterFields);
  const { data: facetValues = {} } = useFilterValues(selectedCategoryId);

  const search = searchParams.get("search") ?? "";
  const status = getApiStatus(searchParams.get("status") ?? undefined);

  // ponytail: view mode lives in the URL (not local state) so it survives
  // navigating to a product's detail page and back — a plain useState
  // reset to "grilla" on every remount.
  const viewModeParam = searchParams.get("view");

  function isViewMode(v: string | null): v is ViewMode {
    return (
      v === VIEW_MODE.GRID ||
      v === VIEW_MODE.TABLE ||
      v === VIEW_MODE.STATUS ||
      v === VIEW_MODE.BULK
    );
  }

  const viewMode: ViewMode = isViewMode(viewModeParam)
    ? viewModeParam
    : "grilla";

  // ponytail: search param handler (separate from sidebar filters)
  const handleSearchChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set("search", value);
    else params.delete("search");
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleViewModeChange = (mode: ViewMode) => {
    const params = new URLSearchParams(searchParams);
    if (mode === "grilla") params.delete("view");
    else params.set("view", mode);
    router.push(`?${params.toString()}`, { scroll: false });
  };
  const attributes: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value) attributes[key] = value;
  }

  // u2-cross-org-export-ui, FR3 — per the `consumer_contract` in
  // `contract-summary.md` Contract 1: NEVER omitted in the default case
  // (`viewingOrgId === null`) — the caller's own organization is sent
  // explicitly, so an admin with `ORG_ADMIN_VIEW_ALL` doesn't silently
  // inherit `list_products`' "no organization_id ⇒ every organization"
  // behavior without having chosen "Todas las organizaciones" explicitly.
  const apiFilters = {
    search: search || undefined,
    status,
    category_id: selectedCategoryId ?? undefined,
    attributes,
    organization_id:
      viewingOrgId === "ALL_ORGS"
        ? undefined
        : (viewingOrgId ?? organizationId ?? undefined),
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

  // Navigate to detail view where AvailabilityActions handles the full flow
  const handleSubmitForReview = (id: string) => router.push(`/catalog/${id}`);

  const handleBulkAssignBranch = (ids: string[]) => {
    setSelectedVehicleIds(ids);
    setShowBulkBranchAssign(true);
  };

  const handleBulkUploadSuccess = () => {
    toast.success("Carga completada");
    handleViewModeChange("grilla");
  };

  const handleBulkUploadCancel = () => {
    handleViewModeChange("grilla");
  };

  const handleExportCsv = async () => {
    if (!selectedCategoryId) {
      toast.error("Elegí una categoría para exportar su catálogo a CSV");
      return;
    }
    // FR8.3 — the browser cannot write to an arbitrary local path; this is
    // only shown back to the seller so they know where to place the image
    // folders named by the CSV's `image_folder_path` column.
    const destinationFolderPath = window.prompt(
      "Carpeta destino para las imágenes (referencia — no se usa para escribir archivos):",
    );
    if (destinationFolderPath === null) return;
    await exportCatalogCsv(selectedCategoryId);
    toast.success(
      destinationFolderPath
        ? `CSV exportado. Guardá las carpetas de imágenes en: ${destinationFolderPath}`
        : "CSV exportado",
    );
  };

  // Guard lives in the click handler (not only the `disabled` prop) so a
  // reopened menu item can't re-enter the flow while a previous export is
  // still in flight.
  const handleOpenExportSummary = () => {
    if (isExportingClientFormat) return;
    setShowExportSummary(true);
  };

  const handleCancelExportSummary = () => {
    setShowExportSummary(false);
  };

  const handleExportClientFormat = async (
    fileName: string,
    baseFolder: string,
    facebookGroupsFallback: string,
  ) => {
    setIsExportingClientFormat(true);
    try {
      const res = await exportCatalogClientFormat({
        // u2-cross-org-export-ui: organizationId only for a specific
        // cross-org target (whether its name has resolved yet or not —
        // same criterion "today" applied before "all-orgs" existed, since
        // both "cross-org" and "loading" share the same underlying
        // viewingOrgId). Never sent for "own" or "all-orgs".
        organizationId:
          exportOrganization.kind === "cross-org" ||
          exportOrganization.kind === "loading"
            ? (viewingOrgId ?? undefined)
            : undefined,
        allOrganizations: viewingOrgId === "ALL_ORGS",
        baseFolder,
        facebookGroupsFallback,
      });
      if (res.status === 404) {
        toast.error(emptyCatalogExportMessage(exportOrganization));
        return;
      }
      if (res.status === 403) {
        const body = await res.json().catch(() => null);
        toast.error(
          extractErrorMessage(
            body,
            "No tenés permiso para realizar esta exportación.",
          ),
        );
        return;
      }
      if (res.status === 413) {
        const body = await res.json().catch(() => null);
        toast.error(
          extractErrorMessage(
            body,
            "El catálogo supera el límite soportado por request.",
          ),
        );
        return;
      }
      if (!res.ok) {
        toast.error("No se pudo exportar el catálogo.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Catálogo exportado");
    } catch {
      toast.error("No se pudo exportar el catálogo. Verificá tu conexión.");
    } finally {
      setIsExportingClientFormat(false);
    }
  };

  const handleConfirmExportSummary = () => {
    setShowExportSummary(false);
    // FR3.1/FR3.2 — editable suggested name; the browser prompt itself is
    // the only input surface for this flow (no dedicated form component).
    const suggestedName = `catalogo-formato-cliente-${new Date().toISOString().slice(0, 10)}`;
    const fileName = window.prompt(
      "Nombre sugerido para el archivo exportado (formato cliente):",
      suggestedName,
    );
    if (fileName === null) return;

    // FR8.2 — u2-cross-org-export-ui: carpeta base de imágenes, se
    // concatena con el código de organización y la carpeta del producto
    // para completar la columna `path` del CSV. Cualquier cancelación en
    // esta secuencia de 3 popups aborta el flujo completo (AC8.1.2).
    const baseFolder = window.prompt(
      "Carpeta base de imágenes:",
      "Users/juanl/proy/facebook-auto-post/IMG/Vehiculos/",
    );
    if (baseFolder === null) return;

    // FR9.2 — u2-cross-org-export-ui: grupos de Facebook, usados SOLO
    // como fallback para productos sin `facebook_groups` propio
    // (AC9.1.2/AC9.1.3).
    const facebookGroupsFallback = window.prompt(
      "Grupos de Facebook (separados por coma):",
      "1,2,3",
    );
    if (facebookGroupsFallback === null) return;

    void handleExportClientFormat(
      fileName || suggestedName,
      baseFolder,
      facebookGroupsFallback,
    );
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

            {/* ponytail: vertical layout on mobile (flex-col), horizontal on desktop (md:flex-row) to prevent overflow */}
            <div className="flex flex-col gap-3 mb-4 md:flex-row md:items-start md:justify-between md:gap-4">
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

              {/* Search + CTA — ponytail: full width on mobile, auto width on desktop */}
              <div className="flex items-center gap-2.5 w-full md:w-auto">
                <div className="relative flex-1 md:flex-initial">
                  <span className="absolute left-[11px] top-1/2 -translate-y-1/2 text-ps-tertiary pointer-events-none inline-flex">
                    <Search size={14} strokeWidth={2} />
                  </span>
                  <input
                    type="search"
                    placeholder="Buscar producto..."
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                    className={cn(
                      "h-9 w-full pl-8 pr-3 border rounded-lg bg-ps-input-bg text-ps-text-primary text-[13px] outline-none box-border md:w-[220px]",
                      searchFocused
                        ? "border-ps-border-active shadow-input-focus"
                        : "border-ps-border-default",
                    )}
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="h-9 px-[14px] inline-flex items-center gap-[6px] bg-transparent text-ps-text-primary border border-ps-border-default rounded-lg text-[13px] font-semibold cursor-pointer whitespace-nowrap shrink-0"
                      aria-label="Exportar catálogo"
                      data-testid="export-catalog-menu-trigger"
                    >
                      <Download size={14} strokeWidth={2.5} />
                      <span className="hidden md:inline">Exportar</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={handleExportCsv}
                      disabled={!selectedCategoryId}
                      data-testid="export-catalog-csv-button"
                    >
                      Exportar CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleOpenExportSummary}
                      disabled={isExportingClientFormat}
                      data-testid="export-catalog-client-format-button"
                    >
                      Exportar catálogo (formato cliente)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <button
                  type="button"
                  onClick={() => router.push("/catalog/create")}
                  className="h-9 px-[14px] inline-flex items-center gap-[6px] bg-ps-cyan text-ps-base border-0 rounded-lg text-[13px] font-semibold cursor-pointer whitespace-nowrap shrink-0"
                  aria-label="Agregar producto"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  {/* ponytail: hide text on mobile (icon only), show on desktop */}
                  <span className="hidden md:inline">Agregar producto</span>
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
                    onClick={() => handleViewModeChange(id)}
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

          {/* Export (formato cliente) summary — inline, no modal.
              Stays mounted through the real export request (not just the
              confirm step) so the "exporting" state (FR8/refined-mockups
              Q2) has a banner to render into. */}
          {(showExportSummary || isExportingClientFormat) && (
            <ExportSummaryBanner
              onContinue={handleConfirmExportSummary}
              onCancel={handleCancelExportSummary}
              organization={exportOrganization}
              isExporting={isExportingClientFormat}
            />
          )}

          {/* Active filter pills */}
          <FilterPills fields={filterFields} />

          {/* ── Content area ─────────────────────────────────────────────── */}
          <div
            className={cn(
              "sidebar-scrollbar flex-1 overflow-y-auto",
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
                    onBulk={() => handleViewModeChange("carga")}
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
                            onSubmitForReview={() =>
                              handleSubmitForReview(vm.product.id)
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
                                  onSubmitForReview={() =>
                                    handleSubmitForReview(vm.product.id)
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
                            <div className="w-4 h-4 rounded-full border-2 border-transparent border-t-ps-cyan animate-spin" />
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
