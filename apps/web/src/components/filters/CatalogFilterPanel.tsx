/**
 * CatalogFilterPanel — collapsible, staged filter panel for the catalog
 * page. Used on BOTH mobile and desktop (same component, no viewport
 * branching) — collapsed by default, showing a one-line summary of what's
 * currently applied; expands into an inline panel where Estado,
 * "Aprobado para Marketplace", "Tiene imágenes" and Organizaciones are
 * edited as a DRAFT, with a live "Ver N resultados" count (same pattern
 * MercadoLibre-style filter sheets use) before committing. Search stays
 * outside this panel — it's the single most frequent action on this
 * screen, so it keeps applying instantly, same as before.
 *
 * Pure presentational: all state (expanded/collapsed, the staged draft,
 * the live count) is owned by `CatalogPage`, which also owns the merge
 * with search/category/organization-precedence needed to compute an
 * accurate count. This component only renders what it's given and calls
 * back on every edit — same container/presentational split as
 * `ProductCard`.
 */

"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import type { Product } from "@/types/product";
import type { VehicleStatus } from "@/components/datagrid/StatusBadge";
import { Slider } from "@/components/ui/slider";
import { StatusSelect, TriStateToggle } from "./QuickFilters";
import { useAppliedStatuses, type TriState } from "./catalogFilterLogic";
import {
  OrganizationMultiSelectFilter,
  type OrganizationMultiSelectOption,
} from "@/components/catalog/OrganizationMultiSelectFilter";

export interface StagedCatalogFilters {
  status: string | null;
  published: TriState;
  hasImages: TriState;
  orgIds: string[];
  /** Cents. `null` = unconstrained (no price filter). */
  priceMin: number | null;
  priceMax: number | null;
}

/** Absolute track bounds (cents) for the price slider — NOT a staged
 * value. `null` while loading, or when nothing matches to size against. */
export interface PriceBounds {
  min: number;
  max: number;
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

function applyButtonLabel(
  isLoading: boolean,
  resultCount: number | undefined,
): string {
  if (isLoading) return "Calculando...";
  if (resultCount === undefined) return "Ver resultados";
  return `Ver ${resultCount} resultado${resultCount === 1 ? "" : "s"}`;
}

interface CatalogFilterPanelProps {
  products: Product[];
  statusOrder: readonly VehicleStatus[];
  organizations: OrganizationMultiSelectOption[];
  isOrgFilterVisible: boolean;

  /** Absolute [min,max] the slider's track spans — not staged, just the
   * reference range. `null` while loading or when no product matches. */
  priceBounds: PriceBounds | null;
  isPriceBoundsLoading: boolean;

  expanded: boolean;
  onOpen: () => void;
  onClose: () => void;

  /** What's actually applied right now — drives the collapsed summary. */
  applied: StagedCatalogFilters;

  /** The draft being edited while expanded. */
  staged: StagedCatalogFilters;
  onStagedChange: (patch: Partial<StagedCatalogFilters>) => void;

  resultCount: number | undefined;
  isResultCountLoading: boolean;
  onApply: () => void;
  onClear: () => void;
}

function countActive(f: StagedCatalogFilters): number {
  let n = 0;
  if (f.status) n += 1;
  if (f.published !== "any") n += 1;
  if (f.hasImages !== "any") n += 1;
  if (f.orgIds.length > 0) n += 1;
  if (f.priceMin !== null || f.priceMax !== null) n += 1;
  return n;
}

export function CatalogFilterPanel({
  products,
  statusOrder,
  organizations,
  isOrgFilterVisible,
  priceBounds,
  isPriceBoundsLoading,
  expanded,
  onOpen,
  onClose,
  applied,
  staged,
  onStagedChange,
  resultCount,
  isResultCountLoading,
  onApply,
  onClear,
}: CatalogFilterPanelProps) {
  // Gated on the APPLIED status (what actually shaped `products`), not the
  // staged draft — editing the draft without applying must not re-arm the
  // one-time capture against a product list that hasn't changed yet.
  const statusOptions = useAppliedStatuses(
    products,
    statusOrder,
    !!applied.status,
  );
  const activeCount = countActive(applied);

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={onOpen}
        data-testid="catalog-filter-panel-open"
        className="flex w-full items-center justify-between gap-2 h-11 px-3.5 rounded-lg border border-ps-border-default bg-ps-input-bg text-left cursor-pointer"
      >
        <span className="text-[13px] font-medium text-ps-text-primary">
          {activeCount === 0
            ? "Filtros"
            : `${activeCount} filtro${activeCount === 1 ? "" : "s"} activo${activeCount === 1 ? "" : "s"}`}
        </span>
        <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-ps-cyan">
          Editar <ChevronDown size={14} strokeWidth={2.5} />
        </span>
      </button>
    );
  }

  return (
    <div
      data-testid="catalog-filter-panel-expanded"
      className="flex flex-col gap-3 p-3.5 rounded-lg border border-ps-border-default bg-ps-elevated"
    >
      <div className="flex items-center justify-between">
        <h2 className="m-0 text-[13px] font-semibold text-ps-text-primary">
          Filtros
        </h2>
        <button
          type="button"
          onClick={onClose}
          data-testid="catalog-filter-panel-close"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-ps-text-secondary cursor-pointer"
        >
          Ocultar <ChevronUp size={14} strokeWidth={2} />
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <StatusSelect
          value={staged.status}
          onChange={(value) => onStagedChange({ status: value || null })}
          options={statusOptions}
          testId="catalog-filter-panel-status-select"
        />

        {isOrgFilterVisible && (
          <OrganizationMultiSelectFilter
            organizations={organizations}
            selectedIds={staged.orgIds}
            onChange={(orgIds) => onStagedChange({ orgIds })}
          />
        )}

        <TriStateToggle
          label="Aprobado para Marketplace"
          value={staged.published}
          onChange={(published) => onStagedChange({ published })}
          testIdPrefix="catalog-filter-panel-published"
        />

        <TriStateToggle
          label="Tiene imágenes"
          value={staged.hasImages}
          onChange={(hasImages) => onStagedChange({ hasImages })}
          testIdPrefix="catalog-filter-panel-has-images"
        />
      </div>

      {isPriceBoundsLoading && (
        <p className="m-0 text-[12px] text-ps-text-secondary">
          Cargando rango de precios...
        </p>
      )}

      {!isPriceBoundsLoading &&
        priceBounds &&
        priceBounds.min < priceBounds.max && (
          <div
            className="flex flex-col gap-2"
            data-testid="catalog-filter-panel-price"
          >
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-ps-text-secondary">
                Precio
              </span>
              <span className="text-[12px] font-medium text-ps-text-primary">
                {formatPrice(staged.priceMin ?? priceBounds.min)} —{" "}
                {formatPrice(staged.priceMax ?? priceBounds.max)}
              </span>
            </div>
            <Slider
              aria-label="Rango de precio"
              data-testid="catalog-filter-panel-price-slider"
              min={priceBounds.min}
              max={priceBounds.max}
              step={Math.max(
                1,
                Math.round((priceBounds.max - priceBounds.min) / 100),
              )}
              value={[
                staged.priceMin ?? priceBounds.min,
                staged.priceMax ?? priceBounds.max,
              ]}
              onValueChange={([priceMin, priceMax]) =>
                onStagedChange({ priceMin, priceMax })
              }
            />
          </div>
        )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onClear}
          data-testid="catalog-filter-panel-clear"
          className="h-9 px-3 rounded-lg border border-ps-border-default bg-transparent text-[13px] font-medium text-ps-text-secondary cursor-pointer"
        >
          Limpiar
        </button>
        <button
          type="button"
          onClick={onApply}
          data-testid="catalog-filter-panel-apply"
          className="flex-1 h-9 rounded-lg border-0 bg-ps-cyan text-[13px] font-semibold text-ps-base cursor-pointer"
        >
          {applyButtonLabel(isResultCountLoading, resultCount)}
        </button>
      </div>
    </div>
  );
}
