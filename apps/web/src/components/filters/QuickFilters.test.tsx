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

  it("on first load (no URL filter), captures and shows only the statuses present in the loaded products", () => {
    // After products load, the dropdown shows only statuses that exist
    // in the catalog — but the captured list is frozen at this point.
    // (The effect runs inside `act()` so by the time we read the
    // options, capture has fired.)
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
    // Statuses present: draft, published, sold → 3 + Todos.
    expect(optionTexts).toEqual(["Todos", "Publicado", "Borrador", "Vendido"]);
  });

  it("keeps the captured applied list after the user picks a status (no self-collapse)", async () => {
    // First render with products ⇒ captures applied statuses.
    // Picking a status filters products down to just that status, but
    // the captured list must stay stable — otherwise the seller can't
    // switch between applied statuses without first clearing the filter.
    const initialProducts = [
      makeProduct("draft"),
      makeProduct("published"),
      makeProduct("sold"),
    ];

    // Simulate the catalog page by re-rendering with progressively
    // filtered products (mimicking what useInfiniteProducts does).
    const { rerender } = render(
      <QuickFilters products={initialProducts} statusOrder={STATUS_ORDER} />,
    );
    expect(
      Array.from(
        screen
          .getByTestId("quick-filters-status-select")
          .querySelectorAll("option"),
      ).map((o) => o.textContent),
    ).toEqual(["Todos", "Publicado", "Borrador", "Vendido"]);

    // After picking "Publicado", the catalog reloads with only published
    // products. The dropdown must still show the same captured list.
    const filteredProducts = [makeProduct("published")];
    rerender(
      <QuickFilters products={filteredProducts} statusOrder={STATUS_ORDER} />,
    );
    expect(
      Array.from(
        screen
          .getByTestId("quick-filters-status-select")
          .querySelectorAll("option"),
      ).map((o) => o.textContent),
    ).toEqual(["Todos", "Publicado", "Borrador", "Vendido"]);
  });

  it("falls back to the full statusOrder while products are still loading on first paint", () => {
    // First render with `products=[]` ⇒ ref stays null ⇒ full list.
    render(<QuickFilters products={[]} statusOrder={STATUS_ORDER} />);
    const optionTexts = Array.from(
      screen
        .getByTestId("quick-filters-status-select")
        .querySelectorAll("option"),
    ).map((o) => o.textContent);
    expect(optionTexts).toEqual([
      "Todos",
      "Publicado",
      "Apartado",
      "Online",
      "Pendiente",
      "Borrador",
      "Expirado",
      "Rechazado",
      "Vendido",
    ]);
  });

  it("uses the caller's `statusOrder` so the custom order reads consistently", () => {
    const customOrder = ["draft", "published"] as const;
    const products = [makeProduct("draft"), makeProduct("published")];
    render(<QuickFilters products={products} statusOrder={customOrder} />);
    expect(
      Array.from(
        screen
          .getByTestId("quick-filters-status-select")
          .querySelectorAll("option"),
      ).map((o) => o.textContent),
    ).toEqual(["Todos", "Borrador", "Publicado"]);
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

  it("translates the rejected display status to the backend status parameter", async () => {
    const user = userEvent.setup();
    const products = [makeProduct("rejected")];
    render(<QuickFilters products={products} statusOrder={STATUS_ORDER} />);

    await user.selectOptions(
      screen.getByTestId("quick-filters-status-select"),
      "rejected",
    );

    expect(String(pushMock.mock.calls[0]?.[0] ?? "")).toContain(
      "status=rejected",
    );
  });

  it("clicking 'Sí' on the published toggle writes `published=true` and pushing again with 'Todos' clears it", async () => {
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
