import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CatalogDetailView } from "./CatalogDetailView";
import * as productsApi from "@/lib/api/products";

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
      version: 1,
      attributes: {
        category: "vehicle",
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
  useReserveProduct: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
    error: null,
  })),
  usePauseProduct: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
    error: null,
  })),
  useResumeProduct: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
    error: null,
  })),
  useMarkProductSold: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
    error: null,
  })),
  useSubmitProductForApproval: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
    error: null,
  })),
  useProductAuditLogs: vi.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
  })),
  useAvailableTransitions: vi.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
  })),
  useReverseProduct: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
    error: null,
  })),
  useResubmitProduct: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
    error: null,
  })),
  useRestoreProduct: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
    error: null,
  })),
}));

// Mock breadcrumbStore with Zustand selector pattern
const { mockUseBreadcrumbStore } = vi.hoisted(() => ({
  mockUseBreadcrumbStore: vi.fn(),
}));

vi.mock("@/lib/stores/breadcrumbStore", () => ({
  useBreadcrumbStore: mockUseBreadcrumbStore,
}));

// Setup default breadcrumb store state
mockUseBreadcrumbStore.mockImplementation((selector?: (s: any) => any) => {
  const state = {
    labels: {},
    setLabel: vi.fn(),
    clearLabel: vi.fn(),
  };
  if (!selector) return state;
  return selector(state);
});

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

// Helper to render with QueryClientProvider
const renderWithQuery = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
};

describe("CatalogDetailView - rejection reason", () => {
  it("shows the rejection reason banner when the product was rejected", () => {
    vi.mocked(productsApi.useProduct).mockReturnValueOnce({
      data: {
        id: "test-product-id",
        title: "Toyota Corolla 2020",
        description: "Excelente estado",
        price_cents: 2000000,
        currency: "ARS",
        status: "rejected",
        rejection_reason: "Las fotos no muestran el odómetro con claridad.",
        slug: "toyota-corolla-2020",
        condition: "used",
        published_to_marketplace: false,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        version: 1,
        attributes: { category: "vehicle", images: [] },
      },
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    } as any);

    renderWithQuery(<CatalogDetailView productId="test-product-id" />);

    expect(screen.getByText("Motivo del rechazo")).toBeInTheDocument();
    expect(
      screen.getByText("Las fotos no muestran el odómetro con claridad."),
    ).toBeInTheDocument();
  });

  it("does not show the rejection reason banner for a published product", () => {
    renderWithQuery(<CatalogDetailView productId="test-product-id" />);

    expect(screen.queryByText("Motivo del rechazo")).not.toBeInTheDocument();
  });
});

describe("CatalogDetailView - Mobile-First", () => {
  it("main grid should be responsive: grid-cols-1 lg:grid-cols-[...]", () => {
    const { container } = renderWithQuery(
      <CatalogDetailView productId="test-product-id" />,
    );

    // Main grid (gallery + info)
    const mainGrid = container.querySelector(".grid.gap-6.items-start");
    expect(mainGrid).toBeTruthy();
    expect(mainGrid?.className).toContain("grid-cols-1");
    expect(mainGrid?.className).toContain("lg:grid-cols-");
  });

  it("attributes grid should be responsive: grid-cols-1 md:grid-cols-2", () => {
    const { container } = renderWithQuery(
      <CatalogDetailView productId="test-product-id" />,
    );

    // Attributes grid - find grid with responsive columns
    const grids = container.querySelectorAll(".grid");
    const attributesGrid = Array.from(grids).find(
      (grid) =>
        grid.className.includes("grid-cols-1") &&
        grid.className.includes("md:grid-cols-2"),
    );
    expect(attributesGrid).toBeTruthy();
  });

  it("action buttons should have flex-wrap for mobile stacking", () => {
    const { container } = renderWithQuery(
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
    // Mock loading state for this test only
    vi.mocked(productsApi.useProduct).mockReturnValueOnce({
      data: null,
      error: null,
      isLoading: true,
      refetch: vi.fn(),
    } as any);

    const { container } = renderWithQuery(
      <CatalogDetailView productId="test-product-id" />,
    );

    // Skeleton main grid
    const skeletonGrid = container.querySelector(".grid.gap-6");
    expect(skeletonGrid).toBeTruthy();
    expect(skeletonGrid?.className).toContain("grid-cols-1");
    expect(skeletonGrid?.className).toContain("lg:grid-cols-");
  });
});
