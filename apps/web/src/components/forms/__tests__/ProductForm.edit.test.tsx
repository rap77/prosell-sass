import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  mockPush,
  mockBack,
  mockReplace,
  mockPrefetch,
  mockRefresh,
  mockToastError,
  mockToastSuccess,
  mockMutateAsync,
} = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockBack: vi.fn(),
  mockReplace: vi.fn(),
  mockPrefetch: vi.fn(),
  mockRefresh: vi.fn(),
  mockToastError: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockMutateAsync: vi.fn(),
}));

import { useProduct, useUpdateProduct } from "@/lib/api/products";
import { useAuthStore } from "@/stores/authStore";
import { ProductForm } from "../ProductForm";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
    back: mockBack,
    replace: mockReplace,
    prefetch: mockPrefetch,
    refresh: mockRefresh,
  })),
}));

vi.mock("sonner", () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/api/products", () => ({
  useProduct: vi.fn(),
  useUpdateProduct: vi.fn(),
  useCreateProduct: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  // The form reads the product's existing images via this hook (edit
  // flow) to seed the upload store. These tests don't exercise images,
  // so an empty response keeps the store empty.
  useProductImageUrls: vi.fn(() => ({ data: undefined })),
}));

vi.mock("@/lib/api/categories", () => ({
  useCategories: vi.fn(() => ({
    data: [
      { id: "cat-1", name: "Sedans", slug: "sedans" },
      { id: "cat-2", name: "SUVs", slug: "suvs" },
    ],
    isLoading: false,
  })),
  useCategoryOptions: vi.fn(() => ({
    data: [
      { value: "cat-1", label: "Sedans" },
      { value: "cat-2", label: "SUVs" },
    ],
  })),
}));

vi.mock("@/lib/api/vehicles", () => ({
  useDecodeVin: vi.fn(() => ({
    mutateAsync: vi.fn(),
  })),
}));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn(),
}));

vi.mock("@/components/catalog/ProductImageGallery", () => ({
  ProductImageGallery: () => <div data-testid="product-image-gallery" />,
}));

const mockUser = {
  id: "user-1",
  email: "test@example.com",
  first_name: "Test",
  last_name: "User",
  role: "vendedor" as const,
  tenant_id: "tenant-1",
  organization_id: "org-1",
};

const mockExistingProduct = {
  id: "prod-1",
  category_id: "cat-1",
  price_cents: 2_500_000,
  description: "Great condition sedan",
  attributes: {
    vin: "1HGCM82633A123456",
    year: 2020,
    make: "Honda",
    model: "Accord",
    trim: "EX-L",
    body_type: "Sedan",
    drivetrain: "FWD",
    transmission: "Automatic",
    engine: "2.0L 4-Cylinder",
    fuel_type: "Gasoline",
    mileage: 45000,
    mileage_unit: "miles",
    exterior_color: "Blue",
    interior_color: "Black",
    has_sunroof: true,
    has_navigation: true,
    has_leather: true,
    has_backup_camera: true,
    has_bluetooth: true,
    has_remote_start: false,
    seat_material: "Leather",
    stock_number: "STK-12345",
  },
  status: "published",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-02T00:00:00Z",
};

function renderWithClient(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("ProductForm - edit mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuthStore).mockImplementation((selector) =>
      selector({ user: mockUser } as unknown as Parameters<typeof selector>[0]),
    );

    vi.mocked(useProduct).mockReturnValue({
      data: mockExistingProduct,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useProduct>);

    vi.mocked(useUpdateProduct).mockReturnValue({
      mutateAsync: mockMutateAsync.mockResolvedValue({ id: "prod-1" }),
      isPending: false,
      error: null,
    } as unknown as ReturnType<typeof useUpdateProduct>);
  });

  test("loads product data in edit mode", async () => {
    renderWithClient(<ProductForm mode="edit" productId="prod-1" />);

    expect(useProduct).toHaveBeenCalledWith("prod-1", { internal: true });

    await waitFor(() => {
      expect(screen.getByLabelText(/VIN/i)).toHaveValue("1HGCM82633A123456");
      expect(screen.getByLabelText(/Precio/i)).toHaveValue(25000);
      expect(screen.getByLabelText(/Modelo/i)).toHaveValue("Accord");
      expect(screen.getByLabelText(/Stock Number/i)).toHaveValue("STK-12345");
      expect(screen.getByLabelText(/Descripción del Vehículo/i)).toHaveValue(
        "Great condition sedan",
      );
    });
  });

  test("does not fetch a product in create mode", () => {
    renderWithClient(<ProductForm mode="create" />);
    expect(useProduct).toHaveBeenCalledWith(undefined, { internal: true });
  });

  test("submits updates with transformed payload", async () => {
    renderWithClient(<ProductForm mode="edit" productId="prod-1" />);

    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByLabelText(/Modelo/i)).toHaveValue("Accord");
    });

    await user.clear(screen.getByLabelText(/Modelo/i));
    await user.type(screen.getByLabelText(/Modelo/i), "Camry");
    await user.click(
      screen.getByRole("button", { name: /update vehicle/i }),
    );

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        productId: "prod-1",
        data: expect.objectContaining({
          title: "2020 Honda Camry",
          price_cents: 2_500_000,
          category_id: "cat-1",
          description: "Great condition sedan",
          attributes: expect.objectContaining({
            vin: "1HGCM82633A123456",
            make: "Honda",
            model: "Camry",
            mileage_unit: "miles",
          }),
        }),
      });
    });
  });

  test("calls onSuccess after a successful update", async () => {
    const onSuccess = vi.fn();
    renderWithClient(
      <ProductForm mode="edit" productId="prod-1" onSuccess={onSuccess} />,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /update vehicle/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledOnce();
    });
  });

  test("shows validation errors in edit mode", async () => {
    renderWithClient(<ProductForm mode="edit" productId="prod-1" />);

    const user = userEvent.setup();
    const vinInput = screen.getByLabelText(/VIN/i);

    await waitFor(() => {
      expect(vinInput).toHaveValue("1HGCM82633A123456");
    });

    await user.clear(vinInput);
    await user.click(screen.getByRole("button", { name: /update vehicle/i }));

    await waitFor(() => {
      expect(screen.getByText(/VIN must be 17 characters/i)).toBeInTheDocument();
    });
  });

  test("disables submit button while product is loading", () => {
    vi.mocked(useProduct).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as ReturnType<typeof useProduct>);

    renderWithClient(<ProductForm mode="edit" productId="prod-1" />);

    expect(
      screen.getByRole("button", { name: /update vehicle/i }),
    ).toBeDisabled();
  });
});
