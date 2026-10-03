/**
 * CatalogFilterPanel — collapsible/staged filter panel. Pure presentational
 * component: no state of its own beyond `useAppliedStatuses`'s internal
 * capture. Every interaction fires a callback; the test asserts on those
 * callbacks, not on any URL or store side effect (that's CatalogPage's job).
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import type { Product } from "@/types/product";
import type { ProductAttributes } from "@/types/vehicle";
import {
  CatalogFilterPanel,
  type StagedCatalogFilters,
} from "./CatalogFilterPanel";

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

const STATUS_ORDER = ["published", "draft", "sold"] as const;

const EMPTY: StagedCatalogFilters = {
  status: null,
  published: "any",
  hasImages: "any",
  orgIds: [],
  priceMin: null,
  priceMax: null,
};

function baseProps(
  overrides: Partial<React.ComponentProps<typeof CatalogFilterPanel>> = {},
) {
  return {
    products: [makeProduct("published")],
    statusOrder: STATUS_ORDER,
    organizations: [{ id: "org-1", name: "Org Uno" }],
    isOrgFilterVisible: true,
    priceBounds: { min: 100_000, max: 1_000_000 },
    isPriceBoundsLoading: false,
    expanded: false,
    onOpen: vi.fn(),
    onClose: vi.fn(),
    applied: EMPTY,
    staged: EMPTY,
    onStagedChange: vi.fn(),
    resultCount: undefined,
    isResultCountLoading: false,
    onApply: vi.fn(),
    onClear: vi.fn(),
    ...overrides,
  };
}

describe("CatalogFilterPanel — collapsed", () => {
  it("shows a neutral label when no filter is applied", () => {
    render(<CatalogFilterPanel {...baseProps()} />);
    expect(screen.getByText("Filtros")).toBeInTheDocument();
  });

  it("summarizes the applied count when filters are active", () => {
    render(
      <CatalogFilterPanel
        {...baseProps({
          applied: {
            ...EMPTY,
            status: "published",
            published: "true",
            orgIds: ["org-1"],
          },
        })}
      />,
    );
    expect(screen.getByText("3 filtros activos")).toBeInTheDocument();
  });

  it("singularizes the count when exactly one filter is active", () => {
    render(
      <CatalogFilterPanel
        {...baseProps({
          applied: { ...EMPTY, status: "published" },
        })}
      />,
    );
    expect(screen.getByText("1 filtro activo")).toBeInTheDocument();
  });

  it("counts an active price range as one filter", () => {
    render(
      <CatalogFilterPanel
        {...baseProps({
          applied: { ...EMPTY, priceMin: 200_000, priceMax: 800_000 },
        })}
      />,
    );
    expect(screen.getByText("1 filtro activo")).toBeInTheDocument();
  });

  it("clicking the collapsed bar calls onOpen", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<CatalogFilterPanel {...baseProps({ onOpen })} />);
    await user.click(screen.getByTestId("catalog-filter-panel-open"));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("does not render any control while collapsed", () => {
    render(<CatalogFilterPanel {...baseProps()} />);
    expect(
      screen.queryByTestId("catalog-filter-panel-expanded"),
    ).not.toBeInTheDocument();
  });
});

describe("CatalogFilterPanel — expanded", () => {
  it("renders Estado, the org filter, and both toggles", () => {
    render(<CatalogFilterPanel {...baseProps({ expanded: true })} />);
    expect(
      screen.getByTestId("catalog-filter-panel-status-select"),
    ).toBeInTheDocument();
    // The global dropdown-menu mock (tests/setup.tsx) clobbers the real
    // trigger's own data-testid when cloning it via asChild — query by the
    // aria-label it preserves instead, same as OrganizationMultiSelectFilter's
    // own test suite does.
    expect(
      screen.getByRole("button", { name: /Filtrar por organizaciones/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Aprobado para Marketplace" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Tiene imágenes" }),
    ).toBeInTheDocument();
  });

  it("hides the organization filter when isOrgFilterVisible is false", () => {
    render(
      <CatalogFilterPanel
        {...baseProps({ expanded: true, isOrgFilterVisible: false })}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /Filtrar por organizaciones/i }),
    ).not.toBeInTheDocument();
  });

  it("editing a toggle calls onStagedChange with only that field, without touching applied", async () => {
    const user = userEvent.setup();
    const onStagedChange = vi.fn();
    render(
      <CatalogFilterPanel {...baseProps({ expanded: true, onStagedChange })} />,
    );
    await user.click(screen.getByTestId("catalog-filter-panel-published-true"));
    expect(onStagedChange).toHaveBeenCalledWith({ published: "true" });
  });

  it("clicking Ocultar calls onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<CatalogFilterPanel {...baseProps({ expanded: true, onClose })} />);
    await user.click(screen.getByTestId("catalog-filter-panel-close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clicking Limpiar calls onClear", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(<CatalogFilterPanel {...baseProps({ expanded: true, onClear })} />);
    await user.click(screen.getByTestId("catalog-filter-panel-clear"));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("clicking the Apply button calls onApply", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(<CatalogFilterPanel {...baseProps({ expanded: true, onApply })} />);
    await user.click(screen.getByTestId("catalog-filter-panel-apply"));
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it("shows a loading label on the Apply button while the live count is in flight", () => {
    render(
      <CatalogFilterPanel
        {...baseProps({ expanded: true, isResultCountLoading: true })}
      />,
    );
    expect(screen.getByTestId("catalog-filter-panel-apply")).toHaveTextContent(
      "Calculando...",
    );
  });

  it("shows the live result count on the Apply button once it resolves", () => {
    render(
      <CatalogFilterPanel
        {...baseProps({ expanded: true, resultCount: 14 })}
      />,
    );
    expect(screen.getByTestId("catalog-filter-panel-apply")).toHaveTextContent(
      "Ver 14 resultados",
    );
  });

  it("singularizes the count when exactly one result would match", () => {
    render(
      <CatalogFilterPanel {...baseProps({ expanded: true, resultCount: 1 })} />,
    );
    expect(screen.getByTestId("catalog-filter-panel-apply")).toHaveTextContent(
      "Ver 1 resultado",
    );
  });

  it("falls back to a neutral label before the count resolves", () => {
    render(<CatalogFilterPanel {...baseProps({ expanded: true })} />);
    expect(screen.getByTestId("catalog-filter-panel-apply")).toHaveTextContent(
      "Ver resultados",
    );
  });
});

describe("CatalogFilterPanel — price range", () => {
  it("renders the slider at the track bounds when nothing is staged yet", () => {
    render(<CatalogFilterPanel {...baseProps({ expanded: true })} />);
    expect(
      screen.getByTestId("catalog-filter-panel-price-slider"),
    ).toBeInTheDocument();
    expect(screen.getByText("$1.000 — $10.000")).toBeInTheDocument();
  });

  it("shows the staged range instead of the full bounds once edited", () => {
    render(
      <CatalogFilterPanel
        {...baseProps({
          expanded: true,
          staged: { ...EMPTY, priceMin: 300_000, priceMax: 700_000 },
        })}
      />,
    );
    expect(screen.getByText("$3.000 — $7.000")).toBeInTheDocument();
  });

  it("shows a loading message instead of the slider while bounds are loading", () => {
    render(
      <CatalogFilterPanel
        {...baseProps({ expanded: true, isPriceBoundsLoading: true })}
      />,
    );
    expect(
      screen.getByText("Cargando rango de precios..."),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("catalog-filter-panel-price-slider"),
    ).not.toBeInTheDocument();
  });

  it("hides the price section when there are no bounds to size it against", () => {
    render(
      <CatalogFilterPanel
        {...baseProps({ expanded: true, priceBounds: null })}
      />,
    );
    expect(
      screen.queryByTestId("catalog-filter-panel-price"),
    ).not.toBeInTheDocument();
  });

  it("hides the price section when every product shares the same price (degenerate range)", () => {
    render(
      <CatalogFilterPanel
        {...baseProps({
          expanded: true,
          priceBounds: { min: 500_000, max: 500_000 },
        })}
      />,
    );
    expect(
      screen.queryByTestId("catalog-filter-panel-price"),
    ).not.toBeInTheDocument();
  });
});
