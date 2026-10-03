/**
 * catalogFilterLogic.ts — shared non-component logic for the catalog's
 * quick filters (status options, the tri-state parser). The URL
 * round-trip behavior these feed into lives in `CatalogPage`
 * (`CatalogFilterPanel.test.tsx` covers that); this file tests the pure
 * logic in isolation.
 */

import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import type { Product } from "@/types/product";
import type { ProductAttributes } from "@/types/vehicle";
import { parseTriState, useAppliedStatuses } from "./catalogFilterLogic";

function makeProduct(status: Product["status"]): Product {
  return {
    id: `id-${status}`,
    tenant_id: "tenant",
    organization_id: "org",
    category_id: "cat",
    title: `T-${status}`,
    price_cents: 100,
    currency: "USD",
    condition: "used",
    status,
    attributes: {} as ProductAttributes,
    image_urls: [],
    is_featured: false,
    published_to_marketplace: false,
    view_count: 0,
    favorite_count: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    version: 1,
  };
}

const STATUS_ORDER = [
  "published",
  "reserved",
  "online",
  "pending",
  "draft",
  "expired",
  "failed",
  "sold",
] as const;

describe("parseTriState", () => {
  it("maps the raw string params to the tri-state shape", () => {
    expect(parseTriState("true")).toBe("true");
    expect(parseTriState("false")).toBe("false");
    expect(parseTriState(null)).toBe("any");
    expect(parseTriState("garbage")).toBe("any");
  });
});

describe("useAppliedStatuses", () => {
  it("on first load (no active status filter), captures and returns only the statuses present in the loaded products", () => {
    const products = [
      makeProduct("draft"),
      makeProduct("draft"),
      makeProduct("published"),
      makeProduct("sold"),
    ];
    const { result } = renderHook(() =>
      useAppliedStatuses(products, STATUS_ORDER, false),
    );
    expect(result.current).toEqual(["published", "draft", "sold"]);
  });

  it("keeps the captured list stable across re-renders (no self-collapse)", () => {
    const initialProducts = [
      makeProduct("draft"),
      makeProduct("published"),
      makeProduct("sold"),
    ];
    const { result, rerender } = renderHook(
      ({ products, statusFilterActive }) =>
        useAppliedStatuses(products, STATUS_ORDER, statusFilterActive),
      {
        initialProps: {
          products: initialProducts,
          statusFilterActive: false,
        },
      },
    );
    expect(result.current).toEqual(["published", "draft", "sold"]);

    // Picking a status filters products down to just that status — the
    // captured list must stay stable so the seller can switch between
    // applied statuses without first clearing the filter.
    rerender({
      products: [makeProduct("published")],
      statusFilterActive: true,
    });
    expect(result.current).toEqual(["published", "draft", "sold"]);
  });

  it("falls back to the full statusOrder while products are still loading", () => {
    const { result } = renderHook(() =>
      useAppliedStatuses([], STATUS_ORDER, false),
    );
    expect(result.current).toEqual([...STATUS_ORDER]);
  });

  it("falls back to the full statusOrder while a status filter is already active in the URL", () => {
    const products = [makeProduct("draft"), makeProduct("published")];
    const { result } = renderHook(() =>
      useAppliedStatuses(products, STATUS_ORDER, true),
    );
    expect(result.current).toEqual([...STATUS_ORDER]);
  });

  it("uses the caller's statusOrder so a custom order reads consistently", () => {
    const customOrder = ["draft", "published"] as const;
    const products = [makeProduct("draft"), makeProduct("published")];
    const { result } = renderHook(() =>
      useAppliedStatuses(products, customOrder, false),
    );
    expect(result.current).toEqual(["draft", "published"]);
  });
});
