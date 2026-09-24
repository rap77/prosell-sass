/**
 * ImportClientCSVPage.test.tsx
 *
 * Regression for a production bug: the wizard resolved category_id to the
 * "Vehículos y Transporte" VERTICAL (no attribute_schema of its own),
 * instead of the "Carros y Camionetas" LEAF (which carries the real
 * vehicle schema). Every vehicle imported through this wizard therefore
 * got a category with no schema, and its edit form could only render
 * generic/basic fields instead of the vehicle-specific ones — even though
 * the product's attributes (make/model/year/VIN/etc.) were saved fine.
 *
 * The vertical's NAME must still be what the user sees (human-readable
 * unit per the existing UX decision); only the submitted id changes.
 */
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Category } from "@/types/category";
import ImportClientCSVPage from "./page";

const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockReplace = vi.fn();
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
}));

const mockOrgApiList = vi.fn();
vi.mock("@/lib/api/orgApi", () => ({
  orgApi: { list: (...args: unknown[]) => mockOrgApiList(...args) },
}));

const mockUseCategories = vi.fn();
vi.mock("@/lib/api/categories", () => ({
  useCategories: () => mockUseCategories(),
}));

// Shallow stub: this test only cares about the `categories` prop the
// wizard receives, not its internal upload/preview/confirm flow (already
// covered by BulkImportClientCSV.test.tsx).
vi.mock("@/components/admin/BulkImportClientCSV", () => ({
  BulkImportClientCSV: ({
    categories,
  }: {
    categories: Array<{ id: string; name: string }>;
  }) => <div data-testid="categories-prop">{JSON.stringify(categories)}</div>,
}));

const VERTICAL: Category = {
  id: "vertical-id-generated-at-seed-time",
  name: "Vehículos y Transporte",
  slug: "vehiculos-y-transporte",
  parent_id: null,
  level: 0,
  sort_order: 0,
  icon: null,
  description: null,
  image_url: null,
  attribute_schema: {},
  attribute_groups: [],
  presentation: null,
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const CARS_LEAF: Category = {
  ...VERTICAL,
  id: "cars-and-trucks-leaf-id",
  name: "Carros y Camionetas",
  slug: "carros-y-camionetas",
  parent_id: "vehiculos-terrestres-id",
  level: 2,
  attribute_schema: {
    make: { field_type: "string" },
  } as unknown as Category["attribute_schema"],
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ImportClientCSVPage />
    </QueryClientProvider>,
  );
}

describe("ImportClientCSVPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrgApiList.mockResolvedValue({ organizations: [] });
    mockUseAuth.mockReturnValue({
      isAdmin: true,
      isAuthenticated: true,
      isLoading: false,
      isSuperAdmin: true,
      hasPermission: () => true,
    });
  });

  it("submits the schema-bearing leaf category id, labeled with the vertical's name", async () => {
    mockUseCategories.mockReturnValue({
      data: [VERTICAL, CARS_LEAF],
      isLoading: false,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("categories-prop")).toBeInTheDocument();
    });

    const submitted = JSON.parse(
      screen.getByTestId("categories-prop").textContent ?? "[]",
    );
    expect(submitted).toEqual([{ id: CARS_LEAF.id, name: VERTICAL.name }]);
  });

  it("shows an error and does not render the wizard when the leaf category is missing", async () => {
    mockUseCategories.mockReturnValue({
      data: [VERTICAL], // leaf absent
      isLoading: false,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/carros-y-camionetas/)).toBeInTheDocument();
    });
    expect(screen.queryByTestId("categories-prop")).not.toBeInTheDocument();
  });

  it("shows an error and does not render the wizard when the vertical is missing", async () => {
    mockUseCategories.mockReturnValue({
      data: [CARS_LEAF], // vertical absent
      isLoading: false,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/vehiculos-y-transporte/)).toBeInTheDocument();
    });
    expect(screen.queryByTestId("categories-prop")).not.toBeInTheDocument();
  });
});
