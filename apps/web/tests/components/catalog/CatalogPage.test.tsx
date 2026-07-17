/**
 * CatalogPage — Subsystem B (Task 12: dynamic category-driven filters).
 *
 * Verifies the page wires `CategorySelector` + the generic `FilterSidebar`
 * to `useCatalogFilters`, and that the generic filter values reach
 * `useInfiniteProducts` as `attributes` (mapped to `attr.<key>` query
 * params by the backend contract).
 *
 * Spec: docs/superpowers/specs/2026-06-06-subsystem-b-dynamic-filters-design.md
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { OrgVerticalsResponse } from "@/types/category";
import type { Product } from "@/types/product";

const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const oneCategoryVerticals: OrgVerticalsResponse = {
  verticals: [
    {
      id: "v1",
      name: "Vehiculos",
      slug: "vehiculos",
      presentation: null,
      categories: [
        {
          id: "c1",
          name: "Autos",
          slug: "autos",
          attribute_schema: {
            make: {
              type: "string",
              filter_type: "select",
              options: ["Toyota", "Honda"],
            },
          },
          attribute_groups: [],
          presentation: null,
          filter_fields: [{ key: "make", filter_type: "select" }],
        },
      ],
    },
  ],
};

vi.mock("@/lib/api/userApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/userApi")>();
  return {
    ...actual,
    useCurrentOrganizationProfile: () => ({
      data: { id: "org-1", code: "PS", color: "#4DB8FF" },
    }),
  };
});

vi.mock("@/lib/api/verticals", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/verticals")>();
  return {
    ...actual,
    useOrgVerticals: () => ({ data: oneCategoryVerticals }),
    useFilterValues: () => ({ data: {} }),
  };
});

const mockUseInfiniteProducts = vi.fn();
let mockProducts: Product[] = [];
vi.mock("@/lib/api/products", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/products")>();
  return {
    ...actual,
    useInfiniteProducts: (...args: unknown[]) => {
      mockUseInfiniteProducts(...args);
      return {
        data: { pages: [{ items: mockProducts }] },
        isLoading: false,
        error: null,
        hasNextPage: false,
        fetchNextPage: vi.fn(),
        isFetchingNextPage: false,
        refetch: vi.fn(),
      };
    },
    useDeleteProduct: () => ({ mutate: vi.fn() }),
  };
});

vi.mock("@/lib/api/productImageUrlsBatch", () => ({
  useProductImageUrlsBatch: () => ({ urls: new Map(), isLoading: false }),
}));

const mockProductCard = vi.fn();
vi.mock("@/components/catalog/ProductCard", () => ({
  ProductCard: (props: unknown) => {
    mockProductCard(props);
    return <div data-testid="product-card" />;
  },
}));

vi.mock("@/lib/api/branches", () => ({
  useBranches: () => ({ data: undefined, isLoading: false }),
  useBulkAssignProductsToBranch: () => ({ mutate: vi.fn(), isPending: false }),
}));

import CatalogPage from "@/app/(seller)/catalog/page";

describe("CatalogPage — dynamic filters", () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams();
    mockPush.mockClear();
    mockUseInfiniteProducts.mockClear();
    mockProductCard.mockClear();
    mockProducts = [];
  });

  it("does not fall back to the viewer organization when ownership is null", () => {
    mockProducts = [
      {
        id: "product-1",
        tenant_id: "org-1",
        organization_id: "org-1",
        owner_org_id: null,
        owner_org_code: null,
        owner_org_color: null,
        category_id: "c1",
        title: "Product without owner",
        price_cents: 100,
        currency: "USD",
        condition: "used",
        status: "draft",
        attributes: { category: "generic" },
        is_featured: false,
        view_count: 0,
        favorite_count: 0,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ];

    render(<CatalogPage />);

    expect(mockProductCard).toHaveBeenCalledWith(
      expect.objectContaining({ orgCode: null, orgColor: null }),
    );
  });

  it("renders the category selector and the generic filter sidebar", () => {
    render(<CatalogPage />);

    expect(
      screen.getByRole("combobox", { name: "Category" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("complementary", { name: "Catalog filters" }),
    ).toBeInTheDocument();
  });

  it("passes the active attribute filter to useInfiniteProducts as attr.<key>", () => {
    mockSearchParams = new URLSearchParams("make=Toyota");

    render(<CatalogPage />);

    const [filters] = mockUseInfiniteProducts.mock.calls.at(-1) ?? [];
    expect(filters).toMatchObject({
      category_id: "c1",
      attributes: { make: "Toyota" },
    });
  });

  it("pushes the make filter to the URL when a checkbox is toggled", async () => {
    const user = userEvent.setup();
    render(<CatalogPage />);

    await user.click(screen.getByLabelText("Toyota"));

    expect(mockPush).toHaveBeenCalledWith("?make=Toyota", { scroll: false });
  });

  it("passes range bounds through useInfiniteProducts as attr.<key>_min/_max", () => {
    // Gap from Subsystem B post-plan audit (2026-06-18): the select-only
    // coverage above misses the range path. With ?year_min=2015&year_max=2020
    // in the URL, the page must hand the bounds to the API client as a
    // attributes object that round-trips to backend `attr.year_min/_max`.
    // The schema only needs a `year` range field declared for this test;
    // `make` stays as before so existing assertions remain valid.
    mockSearchParams = new URLSearchParams("year_min=2015&year_max=2020");
    oneCategoryVerticals.verticals[0].categories[0].attribute_schema.year = {
      type: "number",
      filter_type: "range",
      validation_rules: { min: 1980, max: 2026 },
    };
    oneCategoryVerticals.verticals[0].categories[0].filter_fields.push({
      key: "year",
      filter_type: "range",
    });

    render(<CatalogPage />);

    const [filters] = mockUseInfiniteProducts.mock.calls.at(-1) ?? [];
    expect(filters).toMatchObject({
      category_id: "c1",
      attributes: { year_min: "2015", year_max: "2020" },
    });
  });
});
