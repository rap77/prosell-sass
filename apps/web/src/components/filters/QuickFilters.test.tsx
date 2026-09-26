/**
 * QuickFilters — header catalog filters.
 *
 * Spec: 5th deliverable of the catalog header refactor — three URL-driven
 * controls: status (existing param), published, has_images. Behavior is
 * pure round-trip with `useSearchParams`/`router.push`, so the test only
 * needs to assert on `data-testid` attributes and the resulting URL.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Product } from "@/types/product";
import type { ProductAttributes } from "@/types/vehicle";
import { QuickFilters } from "./QuickFilters";
import { useRouter, useSearchParams } from "next/navigation";

// The page hooks `next/navigation`'s router/searchParams. Mock both so the
// component can update URLs synchronously without a real Next runtime.
const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}));

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

describe("QuickFilters", () => {
  beforeEach(() => {
    pushMock.mockClear();
    vi.mocked(useRouter).mockReturnValue({
      push: pushMock,
      replace: vi.fn(),
      refresh: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      prefetch: vi.fn(),
    } as unknown as ReturnType<typeof useRouter>);
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams() as unknown as ReturnType<typeof useSearchParams>,
    );
  });

  it("lists only statuses present in the loaded products, in the caller's order", () => {
    const products = [
      makeProduct("draft"),
      makeProduct("draft"),
      makeProduct("published"),
      makeProduct("sold"),
    ];
    render(<QuickFilters products={products} statusOrder={STATUS_ORDER} />);

    const select = screen.getByTestId("quick-filters-status-select");
    const optionTexts = Array.from(select.querySelectorAll("option")).map(
      (opt) => opt.textContent,
    );
    // Status labels match `mapProductStatusToVehicleStatus` (no collapsed
    // workflow-only statuses present in the seed data here).
    expect(optionTexts).toEqual([
      "Cualquier",
      "Publicado",
      "Borrador",
      "Vendido",
    ]);
  });

  it("excludes statuses that no loaded product carries (filter keeps list tight)", () => {
    const products = [makeProduct("draft")];
    render(<QuickFilters products={products} statusOrder={STATUS_ORDER} />);
    const select = screen.getByTestId("quick-filters-status-select");
    const optionTexts = Array.from(select.querySelectorAll("option")).map(
      (opt) => opt.textContent,
    );
    expect(optionTexts).toEqual(["Cualquier", "Borrador"]);
  });

  it("renders an empty status list (plus 'Cualquier') when no products are loaded", () => {
    render(<QuickFilters products={[]} statusOrder={STATUS_ORDER} />);
    const select = screen.getByTestId("quick-filters-status-select");
    const optionTexts = Array.from(select.querySelectorAll("option")).map(
      (opt) => opt.textContent,
    );
    expect(optionTexts).toEqual(["Cualquier"]);
  });

  it("picking a status writes the `status` URL param", async () => {
    const user = userEvent.setup();
    const products = [makeProduct("draft"), makeProduct("published")];
    render(<QuickFilters products={products} statusOrder={STATUS_ORDER} />);

    await user.selectOptions(
      screen.getByTestId("quick-filters-status-select"),
      "published",
    );

    expect(pushMock).toHaveBeenCalledTimes(1);
    const url = String(pushMock.mock.calls[0]?.[0] ?? "");
    expect(url).toContain("status=published");
  });

  it("clicking 'Sí' on the published toggle writes `published=true` and pushing again with 'Cualquier' clears it", async () => {
    const user = userEvent.setup();
    render(<QuickFilters products={[]} statusOrder={STATUS_ORDER} />);

    await user.click(screen.getByTestId("quick-filters-published-true"));
    expect(String(pushMock.mock.calls[0]?.[0] ?? "")).toContain(
      "published=true",
    );

    pushMock.mockClear();
    await user.click(screen.getByTestId("quick-filters-published-any"));
    const clearedUrl = String(pushMock.mock.calls[0]?.[0] ?? "");
    expect(clearedUrl).not.toContain("published=");
  });

  it("the has_images toggle mirrors the same any/true/false semantics", async () => {
    const user = userEvent.setup();
    render(<QuickFilters products={[]} statusOrder={STATUS_ORDER} />);

    await user.click(screen.getByTestId("quick-filters-has-images-true"));
    expect(String(pushMock.mock.calls[0]?.[0] ?? "")).toContain(
      "has_images=true",
    );

    pushMock.mockClear();
    await user.click(screen.getByTestId("quick-filters-has-images-false"));
    expect(String(pushMock.mock.calls[0]?.[0] ?? "")).toContain(
      "has_images=false",
    );
  });

  it("reflects the active toggle state from the URL on first render", () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams(
        "published=true&has_images=false",
      ) as unknown as ReturnType<typeof useSearchParams>,
    );
    render(<QuickFilters products={[]} statusOrder={STATUS_ORDER} />);
    expect(screen.getByTestId("quick-filters-published-true")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByTestId("quick-filters-published-any")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(
      screen.getByTestId("quick-filters-has-images-false"),
    ).toHaveAttribute("aria-pressed", "true");
  });
});
