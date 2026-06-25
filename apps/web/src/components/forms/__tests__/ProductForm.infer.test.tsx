import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { mockPush, mockToastError, mockToastSuccess } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockToastError: vi.fn(),
  mockToastSuccess: vi.fn(),
}));

import { useAuthStore } from "@/stores/authStore";
import { ProductForm } from "../ProductForm";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: mockPush })),
}));

vi.mock("sonner", () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
}));

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/api/products", () => ({
  useProduct: vi.fn(() => ({ data: undefined, isLoading: false, error: null })),
  useUpdateProduct: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useCreateProduct: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useProductImageUrls: vi.fn(() => ({ data: undefined })),
}));

vi.mock("@/lib/api/categories", () => ({
  useCategories: vi.fn(() => ({
    data: [
      { id: "cat-1", name: "Vehicles", slug: "vehicles" },
      { id: "cat-2", name: "Real Estate", slug: "real-estate" },
    ],
    isLoading: false,
  })),
  useCategoryOptions: vi.fn(() => ({
    data: [
      { value: "cat-1", label: "Vehicles" },
      { value: "cat-2", label: "Real Estate" },
    ],
  })),
}));

vi.mock("@/lib/api/vehicles", () => ({
  useDecodeVin: vi.fn(() => ({ mutateAsync: vi.fn() })),
}));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn(),
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

function renderWithClient(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

function stubInferResponse(body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => body }),
  );
}

describe("ProductForm - category suggestion (T7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    vi.mocked(useAuthStore).mockImplementation((selector) =>
      selector({ user: mockUser } as unknown as Parameters<typeof selector>[0]),
    );
  });

  test("shows the suggested category as a hint without selecting it", async () => {
    stubInferResponse({
      suggestion: {
        category_id: "11111111-1111-1111-1111-111111111111",
        name: "Vehicles",
        score: 0.87,
      },
      alternatives: [],
    });
    renderWithClient(<ProductForm mode="create" />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Modelo/i), "Civic");

    await waitFor(() => {
      expect(
        screen.getByText(/Sugerido: Vehicles \(87%\)/),
      ).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/Categoría/i)).toHaveValue("");
  });

  test("clearing the title removes the suggestion hint", async () => {
    stubInferResponse({
      suggestion: {
        category_id: "11111111-1111-1111-1111-111111111111",
        name: "Vehicles",
        score: 0.87,
      },
      alternatives: [],
    });
    renderWithClient(<ProductForm mode="create" />);

    const user = userEvent.setup();
    const modelInput = screen.getByLabelText(/Modelo/i);
    await user.type(modelInput, "Civic");
    await waitFor(() => {
      expect(
        screen.getByText(/Sugerido: Vehicles \(87%\)/),
      ).toBeInTheDocument();
    });

    await user.clear(modelInput);
    await waitFor(
      () => {
        expect(
          screen.queryByText(/Sugerido: Vehicles \(87%\)/),
        ).not.toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  test("does not call the inference endpoint when the title is empty", () => {
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
    renderWithClient(<ProductForm mode="create" />);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
