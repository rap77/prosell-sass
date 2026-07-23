import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CatalogDetailView } from "./CatalogDetailView";

// Mock modules
vi.mock("@/lib/api/products", () => ({
  useProduct: vi.fn(() => ({
    data: {
      id: "test-product-id",
      title: "Toyota Corolla 2020",
      description: "Excelente estado",
      price_cents: 2000000,
      currency: "ARS",
      status: "published",
      slug: "toyota-corolla-2020",
      condition: "used",
      published_to_marketplace: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      attributes: {
        year: 2020,
        make: "Toyota",
        model: "Corolla",
        vin: "JT2BF22K9X0123456",
        mileage: 50000,
        mileage_unit: "km",
        body_type: "Sedán",
        transmission: "Automática",
        fuel_type: "Nafta",
        exterior_color: "Blanco",
        interior_color: "Negro",
        images: [],
      },
    },
    error: null,
    isLoading: false,
    refetch: vi.fn(),
  })),
  useProductImageUrls: vi.fn(() => ({
    data: { images: [] },
    isPending: false,
  })),
}));

vi.mock("@/lib/stores/breadcrumbStore", () => ({
  useBreadcrumbStore: vi.fn(() => ({
    setLabel: vi.fn(),
    clearLabel: vi.fn(),
  })),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

describe("CatalogDetailView - Mobile-First", () => {
  it("main grid should be responsive: grid-cols-1 lg:grid-cols-[...]", () => {
    const { container } = render(
      <CatalogDetailView productId="test-product-id" />,
    );

    // Main grid (gallery + info)
    const mainGrid = container.querySelector(".grid.gap-6.items-start");
    expect(mainGrid).toBeTruthy();
    expect(mainGrid?.className).toContain("grid-cols-1");
    expect(mainGrid?.className).toContain("lg:grid-cols-");
  });

  it("attributes grid should be responsive: grid-cols-1 md:grid-cols-2", () => {
    render(<CatalogDetailView productId="test-product-id" />);

    // Attributes grid
    const attributesGrid = screen.getByText("Año").closest(".grid");
    expect(attributesGrid).toBeTruthy();
    expect(attributesGrid?.className).toContain("grid-cols-1");
    expect(attributesGrid?.className).toContain("md:grid-cols-2");
  });

  it("action buttons should have flex-wrap for mobile stacking", () => {
    const { container } = render(
      <CatalogDetailView productId="test-product-id" />,
    );

    // Action bar with buttons
    const actionBar = container.querySelector(
      ".flex.flex-wrap.items-center.justify-between",
    );
    expect(actionBar).toBeTruthy();

    // Button container
    const buttonContainer = container.querySelector(".flex.flex-wrap.gap-2");
    expect(buttonContainer).toBeTruthy();
  });

  it("skeleton should also use responsive grid", () => {
    const { useProduct } = require("@/lib/api/products");
    useProduct.mockReturnValueOnce({
      data: null,
      error: null,
      isLoading: true,
      refetch: vi.fn(),
    });

    const { container } = render(
      <CatalogDetailView productId="test-product-id" />,
    );

    // Skeleton main grid
    const skeletonGrid = container.querySelector(".grid.gap-6");
    expect(skeletonGrid).toBeTruthy();
    expect(skeletonGrid?.className).toContain("grid-cols-1");
    expect(skeletonGrid?.className).toContain("lg:grid-cols-");
  });
});
