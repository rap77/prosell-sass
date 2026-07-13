/**
 * ProductCard — Subsystem A (generic card slice).
 *
 * Renders a single product in the catalog grid from the category's
 * `presentation` contract. Pure presentational — no fetch, no store.
 *
 * Spec: docs/superpowers/specs/2026-06-09-subsystem-a-productcard-design.md
 *
 * The 12 tests cover:
 *   - 3 rendering (title+price, subtitle via composeSubtitle, status badge)
 *   - 3 image (cover, vehicles placeholder, realstate placeholder)
 *   - 3 meta grid (formatted cells, skip missing, cap at 4)
 *   - 1 degradation (null presentation)
 *   - 2 actions on hover (no toolbar in rest, hover class on wrapper)
 *
 * Plus 1 "T6a pin" test: proves the status mapper is invoked (using a
 * workflow-only literal `paused` that collapses to the `draft` badge).
 * Without this, a test using `status: "published"` would pass whether
 * the card calls the mapper or not.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProductCard } from "@/components/catalog/ProductCard";
import type { CategoryPresentation, CardField } from "@/types/category";
import type { Product, ProductAttributes } from "@/types/product";

// Test-only attribute fixtures. The card's `productAttributes` prop is
// typed `Record<string, unknown>` because the card reads attributes by
// `field.key` (whatever the category's presentation contract declares).
// `Product.attributes` is currently typed as `VehicleAttributes` (the
// pre-Subsystem-A shape); the generic ProductAttributes shape lands in
// T7 with the catalog container refactor. The fixtures are kept as
// `Record<string, unknown>` for the card and cast only at the
// `Product.attributes` boundary.
const vehicleAttrs: Record<string, unknown> = {
  category: "vehicle",
  mileage: 100000,
  year: 2020,
  make: "Toyota",
  model: "Corolla",
  color: "Blanco",
};
const realEstateAttrs: Record<string, unknown> = {
  category: "real_estate",
  area_m2: 75,
  bedrooms: 3,
};
const asProductAttrs = (a: Record<string, unknown>): ProductAttributes =>
  a as unknown as ProductAttributes;

// next/image: render as plain <img> for tests so we can assert src.
// Matches the testid pinned by the plan (not the `cover-image-img`
// used by the legacy create-vehicle test).
vi.mock("next/image", () => ({
  default: (props: { src: string; alt?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={props.src} alt={props.alt ?? ""} data-testid="next-image" />
  ),
}));

const baseProduct: Product = {
  id: "p1",
  tenant_id: "t1",
  organization_id: "o1",
  category_id: "c1",
  title: "Toyota Corolla 2020",
  price_cents: 1500000,
  currency: "USD",
  condition: "used",
  status: "published",
  attributes: asProductAttrs(vehicleAttrs),
  image_urls: [],
  cover_image_key: null,
  is_featured: false,
  view_count: 0,
  favorite_count: 0,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const vehiclePresentation: CategoryPresentation = {
  card_fields: [
    { key: "mileage", source: "attributes.mileage" },
    { key: "year", source: "attributes.year" },
    { key: "color", source: "attributes.color" },
  ] as CardField[],
  subtitle_template: "{year} · {make} · {model}",
  filter_fields: [],
};

const realEstatePresentation: CategoryPresentation = {
  card_fields: [
    { key: "area_m2", source: "attributes.area_m2" },
    { key: "bedrooms", source: "attributes.bedrooms" },
  ] as CardField[],
  subtitle_template: "{bedrooms} amb · {area_m2} m²",
  filter_fields: [],
};

const schema = {
  mileage: {
    type: "number" as const,
    filter_type: "range" as const,
    unit: "km",
  },
  year: { type: "number" as const, filter_type: "range" as const },
  color: { type: "string" as const, filter_type: "exact" as const },
  area_m2: {
    type: "number" as const,
    filter_type: "range" as const,
    unit: "m²",
  },
  bedrooms: { type: "number" as const, filter_type: "range" as const },
};

const noop = () => {};

describe("ProductCard — rendering", () => {
  it("renders title, price, and currency", () => {
    render(
      <ProductCard
        product={baseProduct}
        presentation={vehiclePresentation}
        attributeSchema={schema}
        productAttributes={vehicleAttrs}
        verticalSlug="vehiculos-y-transporte"
        imageUrl={null}
        onView={noop}
        onEdit={noop}
        onDelete={noop}
      />,
    );
    expect(screen.getByText("Toyota Corolla 2020")).toBeInTheDocument();
    // Price is formatted; just assert it contains digits.
    expect(screen.getByText(/15/)).toBeInTheDocument();
  });

  it("renders the subtitle via composeSubtitle (client-side)", () => {
    render(
      <ProductCard
        product={baseProduct}
        presentation={vehiclePresentation}
        attributeSchema={schema}
        productAttributes={vehicleAttrs}
        verticalSlug="vehiculos-y-transporte"
        imageUrl={null}
        onView={noop}
        onEdit={noop}
        onDelete={noop}
      />,
    );
    expect(screen.getByText("2020 · Toyota · Corolla")).toBeInTheDocument();
  });

  it("renders the status badge with the real StatusBadge testid `vehicle-status`", () => {
    render(
      <ProductCard
        product={baseProduct}
        presentation={vehiclePresentation}
        attributeSchema={schema}
        productAttributes={vehicleAttrs}
        verticalSlug="vehiculos-y-transporte"
        imageUrl={null}
        onView={noop}
        onEdit={noop}
        onDelete={noop}
      />,
    );
    // The real `StatusBadge` component carries `data-testid="vehicle-status"`
    // (see `apps/web/src/components/datagrid/StatusBadge.tsx:85`). The card
    // must NOT wrap it in a div with a different testid (DataGrid tests rely
    // on `vehicle-status`).
    expect(screen.getByTestId("vehicle-status")).toBeInTheDocument();
  });

  it("invokes the T6a status mapper for workflow-only literals (paused → draft badge)", () => {
    // Pin: a workflow-only Product.status like "paused" (NOT a VehicleStatus
    // literal) must render the "draft" badge — proves the card calls
    // mapProductStatusToVehicleStatus and not a naive pass-through.
    render(
      <ProductCard
        product={{ ...baseProduct, status: "paused" }}
        presentation={vehiclePresentation}
        attributeSchema={schema}
        productAttributes={vehicleAttrs}
        verticalSlug="vehiculos-y-transporte"
        imageUrl={null}
        onView={noop}
        onEdit={noop}
        onDelete={noop}
      />,
    );
    expect(screen.getByText("Borrador")).toBeInTheDocument();
  });
});

describe("ProductCard — image", () => {
  it("renders the cover image when imageUrl is provided", () => {
    render(
      <ProductCard
        product={baseProduct}
        presentation={vehiclePresentation}
        attributeSchema={schema}
        productAttributes={vehicleAttrs}
        verticalSlug="vehiculos-y-transporte"
        imageUrl="https://signed.example.com/cover.jpg"
        onView={noop}
        onEdit={noop}
        onDelete={noop}
      />,
    );
    const img = screen.getByTestId("next-image");
    expect(img).toHaveAttribute("src", "https://signed.example.com/cover.jpg");
  });

  it("falls back to the niche placeholder when imageUrl is null", () => {
    render(
      <ProductCard
        product={baseProduct}
        presentation={vehiclePresentation}
        attributeSchema={schema}
        productAttributes={vehicleAttrs}
        verticalSlug="vehiculos-y-transporte"
        imageUrl={null}
        onView={noop}
        onEdit={noop}
        onDelete={noop}
      />,
    );
    const img = screen.getByTestId("next-image");
    expect(img).toHaveAttribute(
      "src",
      "/placeholders/placeholder-vehicles.webp",
    );
  });

  it("falls back to the realstate placeholder for the real estate vertical", () => {
    render(
      <ProductCard
        product={{
          ...baseProduct,
          attributes: asProductAttrs(realEstateAttrs),
        }}
        presentation={realEstatePresentation}
        attributeSchema={schema}
        productAttributes={realEstateAttrs}
        verticalSlug="bienes-raices"
        imageUrl={null}
        onView={noop}
        onEdit={noop}
        onDelete={noop}
      />,
    );
    const img = screen.getByTestId("next-image");
    expect(img).toHaveAttribute(
      "src",
      "/placeholders/placeholder-realstate.webp",
    );
  });
});

describe("ProductCard — card_fields meta grid", () => {
  it("renders meta cells formatted via formatCardField (label + localized value)", () => {
    render(
      <ProductCard
        product={baseProduct}
        presentation={vehiclePresentation}
        attributeSchema={schema}
        productAttributes={vehicleAttrs}
        verticalSlug="vehiculos-y-transporte"
        imageUrl={null}
        onView={noop}
        onEdit={noop}
        onDelete={noop}
      />,
    );
    expect(screen.getByText("Kilometraje")).toBeInTheDocument();
    expect(screen.getByText("100.000 km")).toBeInTheDocument();
    expect(screen.getByText("Año")).toBeInTheDocument();
    expect(screen.getByText("2020")).toBeInTheDocument();
  });

  it("skips cells whose attribute value is missing (no label-only noise)", () => {
    render(
      <ProductCard
        product={baseProduct}
        presentation={vehiclePresentation}
        attributeSchema={schema}
        productAttributes={{
          category: "vehicle" as const,
          mileage: 50000,
        }} // no year, no color
        verticalSlug="vehiculos-y-transporte"
        imageUrl={null}
        onView={noop}
        onEdit={noop}
        onDelete={noop}
      />,
    );
    expect(screen.getByText("Kilometraje")).toBeInTheDocument();
    expect(screen.queryByText("Año")).not.toBeInTheDocument();
    expect(screen.queryByText("Color")).not.toBeInTheDocument();
  });

  it("caps the meta grid at 4 cells even if presentation declares more", () => {
    const manyFields: CategoryPresentation = {
      card_fields: [
        { key: "a", source: "attributes.a" },
        { key: "b", source: "attributes.b" },
        { key: "c", source: "attributes.c" },
        { key: "d", source: "attributes.d" },
        { key: "e", source: "attributes.e" },
        { key: "f", source: "attributes.f" },
      ] as CardField[],
      subtitle_template: null,
      filter_fields: [],
    };
    const attrs = {
      category: "vehicle" as const,
      a: 1,
      b: 2,
      c: 3,
      d: 4,
      e: 5,
      f: 6,
    };
    const bigSchema = {
      a: { type: "number" as const, filter_type: "range" as const },
      b: { type: "number" as const, filter_type: "range" as const },
      c: { type: "number" as const, filter_type: "range" as const },
      d: { type: "number" as const, filter_type: "range" as const },
      e: { type: "number" as const, filter_type: "range" as const },
      f: { type: "number" as const, filter_type: "range" as const },
    };
    render(
      <ProductCard
        product={baseProduct}
        presentation={manyFields}
        attributeSchema={bigSchema}
        productAttributes={attrs}
        verticalSlug="vehiculos-y-transporte"
        imageUrl={null}
        onView={noop}
        onEdit={noop}
        onDelete={noop}
      />,
    );
    // Only 4 cells rendered; the 5th and 6th are dropped.
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.getByText("C")).toBeInTheDocument();
    expect(screen.getByText("D")).toBeInTheDocument();
    expect(screen.queryByText("E")).not.toBeInTheDocument();
    expect(screen.queryByText("F")).not.toBeInTheDocument();
  });
});

describe("ProductCard — degradation", () => {
  it("renders title + price + image when presentation is null (no crash)", () => {
    render(
      <ProductCard
        product={baseProduct}
        presentation={null}
        attributeSchema={schema}
        productAttributes={vehicleAttrs}
        verticalSlug="vehiculos-y-transporte"
        imageUrl={null}
        onView={noop}
        onEdit={noop}
        onDelete={noop}
      />,
    );
    expect(screen.getByText("Toyota Corolla 2020")).toBeInTheDocument();
    expect(
      screen.queryByText("2020 · Toyota · Corolla"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Kilometraje")).not.toBeInTheDocument();
  });
});

describe("ProductCard — actions on hover", () => {
  it("exposes the actions toolbar in the a11y tree (keyboard reachable)", () => {
    render(
      <ProductCard
        product={baseProduct}
        presentation={vehiclePresentation}
        attributeSchema={schema}
        productAttributes={vehicleAttrs}
        verticalSlug="vehiculos-y-transporte"
        imageUrl={null}
        onView={noop}
        onEdit={noop}
        onDelete={noop}
      />,
    );
    // Subsystem A (G1, a11y): the actions are part of the a11y tree in
    // resting state — visually hidden via CSS (opacity-0), but
    // keyboard-reachable. WCAG 2.1.1 Keyboard requires that all
    // functionality be operable through a keyboard interface; the
    // previous implementation hid the toolbar from screen readers via
    // `aria-hidden={!hovered}` and only revealed it on mouse hover,
    // making Ver/Editar/Eliminar unreachable for keyboard users and
    // assistive tech.
    expect(screen.queryByRole("toolbar")).not.toBeNull();
    // ponytail: card has a cover-image button with same name; assert at least one exists
    expect(
      screen.getAllByRole("button", { name: /ver detalle/i }).length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /editar/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /eliminar/i }),
    ).toBeInTheDocument();
  });

  it("exposes the on-hover AND on-focus reveal classes on the actions wrapper", () => {
    const { container } = render(
      <ProductCard
        product={baseProduct}
        presentation={vehiclePresentation}
        attributeSchema={schema}
        productAttributes={vehicleAttrs}
        verticalSlug="vehiculos-y-transporte"
        imageUrl={null}
        onView={noop}
        onEdit={noop}
        onDelete={noop}
      />,
    );
    // The actions container must carry BOTH the mouse-hover reveal
    // (`group-hover:opacity-100`) AND the keyboard-focus reveal
    // (`group-focus-within:opacity-100`). Without the focus-within
    // class, a keyboard user Tab-ing onto a Ver/Editar/Eliminar
    // button would not see the action panel appear.
    const group = container.querySelector(
      '[data-testid="product-card-actions"]',
    );
    expect(group?.className).toMatch(/group-hover:opacity-100/);
    expect(group?.className).toMatch(/group-focus-within:opacity-100/);
    expect(group?.className).toMatch(/opacity-0/);
  });

  it("does not toggle aria-hidden on mouse enter/leave (a11y invariant)", () => {
    // The previous implementation toggled `aria-hidden` via a
    // useState bound to onMouseEnter/Leave. That broke screen-reader
    // access: on first render the toolbar was hidden, and on
    // touch/keyboard-only devices mouse events never fired so the
    // toolbar stayed hidden forever. The new implementation leaves
    // aria-hidden at a static false (or absent) — the visual reveal
    // is purely CSS-driven via :hover / :focus-within.
    const { container } = render(
      <ProductCard
        product={baseProduct}
        presentation={vehiclePresentation}
        attributeSchema={schema}
        productAttributes={vehicleAttrs}
        verticalSlug="vehiculos-y-transporte"
        imageUrl={null}
        onView={noop}
        onEdit={noop}
        onDelete={noop}
      />,
    );
    const group = container.querySelector(
      '[data-testid="product-card-actions"]',
    );
    // The wrapper either omits aria-hidden or sets it to "false".
    // It must never be "true" in the resting state.
    const ariaHidden = group?.getAttribute("aria-hidden");
    expect(ariaHidden === null || ariaHidden === "false").toBe(true);
  });
});
