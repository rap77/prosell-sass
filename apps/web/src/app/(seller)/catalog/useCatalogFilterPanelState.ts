"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Product } from "@/types/product";
import {
  parseTriState,
  type TriState,
} from "@/components/filters/catalogFilterLogic";
import type { StagedCatalogFilters } from "@/components/filters/CatalogFilterPanel";
import { usePriceRange, useProductsCount } from "@/lib/api/products";
import { getProductStatus } from "@/lib/utils/getApiStatus";

function triStateToBool(t: TriState): boolean | undefined {
  if (t === "any") return undefined;
  return t === "true";
}

interface UseCatalogFilterPanelStateParams {
  search: string;
  status: Product["status"] | undefined;
  selectedCategoryId: string | null;
  /** Raw `useCatalogFilters` values — the hook strips empties into `attr.*`. */
  attributeValues: Record<string, string>;
  selectedOrgIds: string[];
  setSelectedOrgIds: (ids: string[]) => void;
  viewingOrgId: string | "ALL_ORGS" | null;
  organizationId: string | null;
  publishedToMarketplace: boolean | undefined;
  hasImages: boolean | undefined;
}

/**
 * Everything CatalogFilterPanel needs: applied-vs-staged state, the
 * collapse/expand toggle, the price slider's track bounds, the live
 * "Ver N resultados" count, and the handlers that seed/clear/commit the
 * draft. Split out of CatalogPage (react-doctor
 * no-high-complexity-react-function) — this is a self-contained concern
 * that only reads a handful of values CatalogPage already computes.
 */
export function useCatalogFilterPanelState({
  search,
  status,
  selectedCategoryId,
  attributeValues,
  selectedOrgIds,
  setSelectedOrgIds,
  viewingOrgId,
  organizationId,
  publishedToMarketplace,
  hasImages,
}: UseCatalogFilterPanelStateParams) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const attributes: Record<string, string> = {};
  for (const [key, value] of Object.entries(attributeValues)) {
    if (value) attributes[key] = value;
  }

  const publishedRaw = searchParams.get("published");
  const hasImagesRaw = searchParams.get("has_images");
  const minPriceParam = searchParams.get("min_price");
  const maxPriceParam = searchParams.get("max_price");

  // What's actually applied right now — drives the collapsed-bar summary
  // and re-seeds `stagedFilters` every time the panel opens.
  const appliedFilters: StagedCatalogFilters = {
    status: searchParams.get("status"),
    published: parseTriState(publishedRaw),
    hasImages: parseTriState(hasImagesRaw),
    orgIds: selectedOrgIds,
    priceMin: minPriceParam ? Number(minPriceParam) : null,
    priceMax: maxPriceParam ? Number(maxPriceParam) : null,
  };

  const [panelExpanded, setPanelExpanded] = useState(false);
  const [stagedFilters, setStagedFilters] =
    useState<StagedCatalogFilters>(appliedFilters);

  // Absolute track bounds for the price slider — scoped by every OTHER
  // applied (not staged) filter, so dragging the slider itself never
  // narrows its own track. Only fetched while the panel is open.
  const { data: priceBounds, isLoading: isPriceBoundsLoading } = usePriceRange(
    {
      search: search || undefined,
      status,
      category_id: selectedCategoryId ?? undefined,
      organization_id:
        selectedOrgIds.length > 0 || viewingOrgId === "ALL_ORGS"
          ? undefined
          : (viewingOrgId ?? organizationId ?? undefined),
      organization_ids: selectedOrgIds.length > 0 ? selectedOrgIds : undefined,
      published_to_marketplace: publishedToMarketplace,
      has_images: hasImages,
    },
    { enabled: panelExpanded },
  );

  // Same shape as CatalogPage's `apiFilters`, but with the 5 panel-owned
  // fields swapped for the STAGED draft — this is what "Ver N resultados"
  // counts against, before the user applies anything.
  const previewFilters = {
    search: search || undefined,
    status: getProductStatus(stagedFilters.status ?? undefined),
    category_id: selectedCategoryId ?? undefined,
    attributes,
    organization_id:
      stagedFilters.orgIds.length > 0 || viewingOrgId === "ALL_ORGS"
        ? undefined
        : (viewingOrgId ?? organizationId ?? undefined),
    organization_ids:
      stagedFilters.orgIds.length > 0 ? stagedFilters.orgIds : undefined,
    published_to_marketplace: triStateToBool(stagedFilters.published),
    has_images: triStateToBool(stagedFilters.hasImages),
    min_price: stagedFilters.priceMin ?? undefined,
    max_price: stagedFilters.priceMax ?? undefined,
  };
  const { data: previewCount, isLoading: isPreviewCountLoading } =
    useProductsCount(previewFilters, { enabled: panelExpanded });

  const openFilterPanel = () => {
    setStagedFilters(appliedFilters);
    setPanelExpanded(true);
  };
  const closeFilterPanel = () => setPanelExpanded(false);
  const clearFilterPanel = () =>
    setStagedFilters({
      status: null,
      published: "any",
      hasImages: "any",
      orgIds: [],
      priceMin: null,
      priceMax: null,
    });
  const updateStagedFilters = (patch: Partial<StagedCatalogFilters>) =>
    setStagedFilters((prev) => ({ ...prev, ...patch }));
  const applyFilterPanel = () => {
    const params = new URLSearchParams(searchParams);
    if (stagedFilters.status) params.set("status", stagedFilters.status);
    else params.delete("status");
    if (stagedFilters.published !== "any")
      params.set("published", stagedFilters.published);
    else params.delete("published");
    if (stagedFilters.hasImages !== "any")
      params.set("has_images", stagedFilters.hasImages);
    else params.delete("has_images");
    // Only sent when it actually narrows the track — a handle resting
    // exactly on priceBounds.min/max means "unconstrained," same as
    // every other filter's "omit = no filter" convention.
    if (
      stagedFilters.priceMin !== null &&
      stagedFilters.priceMin > (priceBounds?.min ?? -Infinity)
    ) {
      params.set("min_price", String(stagedFilters.priceMin));
    } else {
      params.delete("min_price");
    }
    if (
      stagedFilters.priceMax !== null &&
      stagedFilters.priceMax < (priceBounds?.max ?? Infinity)
    ) {
      params.set("max_price", String(stagedFilters.priceMax));
    } else {
      params.delete("max_price");
    }
    router.push(`?${params.toString()}`, { scroll: false });
    setSelectedOrgIds(stagedFilters.orgIds);
    setPanelExpanded(false);
  };

  return {
    attributes,
    appliedFilters,
    stagedFilters,
    panelExpanded,
    priceBounds: priceBounds ?? null,
    isPriceBoundsLoading,
    previewCount,
    isPreviewCountLoading,
    openFilterPanel,
    closeFilterPanel,
    clearFilterPanel,
    updateStagedFilters,
    applyFilterPanel,
  };
}
