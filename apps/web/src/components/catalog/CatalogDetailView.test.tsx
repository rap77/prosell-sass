import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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
  useRevertSaleProduct: vi.fn(() => ({
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

// Bug fix (2026-09-25): `publishVehicleData` hardcoded `clean_title: true`
// instead of reading `vehicleAttributes.clean_title` — a CSV-imported
// vehicle's real "Título limpio" value never reached the Publish modal.
const { mockPublishModal } = vi.hoisted(() => ({
  mockPublishModal: vi.fn(
    (_props: {
      vehicleData?: { clean_title?: boolean; vehicle_condition?: string };
    }) => null,
  ),
}));

vi.mock("@/components/publisher/PublishModal", () => ({
  PublishModal: mockPublishModal,
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

describe("CatalogDetailView - revert sale transition", () => {
  it("shows the 'Deshacer venta' action when the backend offers a revert_sale transition", () => {
    vi.mocked(productsApi.useAvailableTransitions).mockReturnValueOnce({
      data: [
        {
          to_status: "published",
          endpoint: "POST /products/test-product-id/revert-sale",
          requires_role: "super_admin",
          side_effects: [],
          method: "revert_sale",
        },
      ],
      isLoading: false,
      error: null,
    } as any);

    renderWithQuery(<CatalogDetailView productId="test-product-id" />);

    expect(
      screen.getByRole("button", { name: /deshacer venta/i }),
    ).toBeInTheDocument();
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

describe("CatalogDetailView - publish modal clean_title", () => {
  afterEach(() => {
    // mockReturnValue below replaces the module-level default mock
    // implementation permanently (unlike mockReturnValueOnce) — restore it
    // so later tests in this file keep seeing the original fixture.
    vi.mocked(productsApi.useProduct).mockReset();
    vi.mocked(productsApi.useProduct).mockImplementation(
      () =>
        ({
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
        }) as any,
    );
  });

  it("passes the product's real clean_title value to the Publish modal", () => {
    // mockReturnValue (not -Once): the click below re-renders the
    // component, which calls useProduct() again — a one-time stub would
    // revert to the default mock on that second call.
    vi.mocked(productsApi.useProduct).mockReturnValue({
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
          clean_title: false,
          images: [],
        },
      },
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    } as any);

    renderWithQuery(<CatalogDetailView productId="test-product-id" />);
    fireEvent.click(screen.getByRole("button", { name: /publicar/i }));

    const lastCallProps = mockPublishModal.mock.calls.at(-1)?.[0];
    expect(lastCallProps?.vehicleData?.clean_title).toBe(false);
  });

  it("leaves clean_title undefined when the product never had the attribute", () => {
    renderWithQuery(<CatalogDetailView productId="test-product-id" />);
    fireEvent.click(screen.getByRole("button", { name: /publicar/i }));

    const lastCallProps = mockPublishModal.mock.calls.at(-1)?.[0];
    expect(lastCallProps?.vehicleData?.clean_title).toBeUndefined();
  });
});

// Bug fix (2026-09-25): `publishVehicleData` read `product.condition` (the
// generic ecommerce enum, always "used" for CSV-imported vehicles) instead
// of the real Facebook condition grade the CSV carries under
// `attributes.vehicle_condition` — the "Estado del vehículo" select in the
// Publish modal never reflected the client's real rating.
describe("CatalogDetailView - publish modal vehicle_condition", () => {
  afterEach(() => {
    vi.mocked(productsApi.useProduct).mockReset();
    vi.mocked(productsApi.useProduct).mockImplementation(
      () =>
        ({
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
        }) as any,
    );
  });

  it("translates the CSV's real vehicle_condition into the FB canonical key", () => {
    vi.mocked(productsApi.useProduct).mockReturnValue({
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
          vehicle_condition: "Muy bueno",
          images: [],
        },
      },
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    } as any);

    renderWithQuery(<CatalogDetailView productId="test-product-id" />);
    fireEvent.click(screen.getByRole("button", { name: /publicar/i }));

    const lastCallProps = mockPublishModal.mock.calls.at(-1)?.[0];
    expect(lastCallProps?.vehicleData?.vehicle_condition).toBe("very_good");
  });

  it("leaves vehicle_condition undefined instead of falling back to product.condition", () => {
    renderWithQuery(<CatalogDetailView productId="test-product-id" />);
    fireEvent.click(screen.getByRole("button", { name: /publicar/i }));

    const lastCallProps = mockPublishModal.mock.calls.at(-1)?.[0];
    expect(lastCallProps?.vehicleData?.vehicle_condition).toBeUndefined();
  });
});
