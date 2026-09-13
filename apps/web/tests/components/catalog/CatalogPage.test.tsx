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

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  type MockInstance,
} from "vitest";
import { toast } from "sonner";
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
const mockExportCatalogClientFormat = vi.fn();
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
    useSubmitProductsForApproval: () => ({ mutate: vi.fn(), isPending: false }),
    exportCatalogClientFormat: (...args: unknown[]) =>
      mockExportCatalogClientFormat(...args),
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

// u1-export-org-confirmation: same selector-consuming mock pattern already
// used by OrganizationPicker.test.tsx for `useOrganizationStore`.
const mockUseOrganization = vi.fn();
// u2-cross-org-export-ui: minimal stub so the page's `useOrganizations()`
// call (for the "all-orgs" count) doesn't crash the existing suite. Empty
// by default — the "all-orgs" count/wiring scenarios themselves are
// exercised by the Step 10 dispatch, not here.
const mockUseOrganizations = vi.fn();
mockUseOrganizations.mockReturnValue({ data: [] });
vi.mock("@/lib/api/organizations", () => ({
  useOrganization: (...args: unknown[]) => mockUseOrganization(...args),
  useOrganizations: (...args: unknown[]) => mockUseOrganizations(...args),
}));

let mockViewingOrgId: string | "ALL_ORGS" | null = null;
vi.mock("@/stores/organizationStore", () => ({
  useOrganizationStore: (selector: (state: unknown) => unknown) =>
    selector({ viewingOrgId: mockViewingOrgId }),
}));

import CatalogPage from "@/app/(seller)/catalog/page";

describe("CatalogPage — dynamic filters", () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams();
    mockPush.mockClear();
    mockUseInfiniteProducts.mockClear();
    mockProductCard.mockClear();
    mockProducts = [];
    mockViewingOrgId = null;
    mockUseOrganization.mockReturnValue({ organization: undefined });
  });

  it("does not fall back to the viewer organization when ownership is null", () => {
    mockProducts = [
      {
        id: "product-1",
        tenant_id: "org-1",
        organization_id: "org-1",
        // ponytail: org_code/org_color come from products.organization_id
        // JOIN organizations (tenant cascade). When the API returns null
        // (no org found), the card should NOT fall back to the viewer.
        org_code: null,
        org_color: null,
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
        version: 1,
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

  it("restores the Tabla view from the URL instead of always defaulting to Grilla", () => {
    // Bug: viewMode lived only in local useState, so navigating to a
    // product's detail page and coming back reset it to "grilla" —
    // this pins the fix that reads it from the `view` search param.
    mockSearchParams = new URLSearchParams("view=tabla");

    render(<CatalogPage />);

    const tablaTab = screen.getByRole("button", { name: /tabla/i });
    expect(tablaTab.className).toContain("text-ps-cyan");
    const grillaTab = screen.getByRole("button", { name: /grilla/i });
    expect(grillaTab.className).not.toContain("text-ps-cyan");
  });

  it("pushes ?view=tabla to the URL when the Tabla tab is clicked", async () => {
    const user = userEvent.setup();
    render(<CatalogPage />);

    await user.click(screen.getByRole("button", { name: /tabla/i }));

    expect(mockPush).toHaveBeenCalledWith("?view=tabla", { scroll: false });
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

// ─── Export catálogo (formato cliente) — u2-catalog-export-ui ─────────────────

function makeProduct(overrides: Partial<Product>): Product {
  return {
    id: `product-${Math.random().toString(36).slice(2)}`,
    tenant_id: "org-1",
    organization_id: "org-1",
    org_code: "PS",
    org_color: "#4DB8FF",
    category_id: "c1",
    title: "Producto",
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
    version: 1,
    ...overrides,
  };
}

function buildZipResponse(): Response {
  return {
    ok: true,
    status: 200,
    headers: new Headers({
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="catalogo.zip"',
    }),
    blob: vi
      .fn()
      .mockResolvedValue(new Blob(["zip-bytes"], { type: "application/zip" })),
    json: vi.fn(),
  } as unknown as Response;
}

function buildErrorResponse(status: number, detail: string): Response {
  return {
    ok: false,
    status,
    json: vi.fn().mockResolvedValue({ detail }),
  } as unknown as Response;
}

// Moved to module scope (was previously nested inside the describe below)
// so the u1-export-org-confirmation describe further down can reuse it too.
async function openExportSummary(user: ReturnType<typeof userEvent.setup>) {
  render(<CatalogPage />);
  await user.click(screen.getByTestId("dropdown-trigger"));
  await user.click(
    screen.getByRole("menuitem", {
      name: "Exportar catálogo (formato cliente)",
    }),
  );
}

describe("CatalogPage — export catálogo (formato cliente)", () => {
  let promptSpy: MockInstance<typeof window.prompt>;
  let anchorClickSpy: MockInstance<() => void>;

  beforeEach(() => {
    mockSearchParams = new URLSearchParams();
    mockPush.mockClear();
    mockUseInfiniteProducts.mockClear();
    mockProductCard.mockClear();
    mockExportCatalogClientFormat.mockReset();
    mockProducts = [];
    mockViewingOrgId = null;
    mockUseOrganization.mockReturnValue({ organization: undefined });
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
    // `.mockReset()` clears call history *and* any leftover return value
    // from a previous test — `vi.spyOn` returns the same underlying spy
    // once a method is already spied, so without this, state would leak
    // across tests in this describe block.
    promptSpy = vi.spyOn(window, "prompt").mockReset();
    anchorClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockReset()
      .mockImplementation(() => {});
    URL.createObjectURL = vi.fn(() => "blob:mock-url");
    URL.revokeObjectURL = vi.fn();
  });

  it("shows the client-format export menu item and opens the summary banner on click", async () => {
    const user = userEvent.setup();
    mockProducts = [makeProduct({ status: "published" })];

    await openExportSummary(user);

    expect(screen.getByTestId("export-summary-banner")).toBeInTheDocument();
  });

  it("does not fire a new fetch when opening the summary banner", async () => {
    const user = userEvent.setup();
    mockProducts = [
      makeProduct({ status: "published" }),
      makeProduct({ status: "published" }),
      makeProduct({ status: "draft" }),
    ];

    render(<CatalogPage />);
    // Same filters/args before and after opening the banner — the banner
    // makes no request of its own; the real "is the catalog empty?" check
    // happens server-side (404 from the export endpoint), not client-side
    // against the filtered/paginated grid data (see `code-summary.md`:
    // that data never represents the org's full published catalog, so a
    // client-computed count/gate would be actively wrong).
    const [filtersBeforeOpen] = mockUseInfiniteProducts.mock.calls.at(-1) ?? [];
    await user.click(screen.getByTestId("dropdown-trigger"));
    await user.click(
      screen.getByRole("menuitem", {
        name: "Exportar catálogo (formato cliente)",
      }),
    );
    const [filtersAfterOpen] = mockUseInfiniteProducts.mock.calls.at(-1) ?? [];

    expect(screen.getByTestId("export-summary-banner")).toBeInTheDocument();
    expect(filtersAfterOpen).toEqual(filtersBeforeOpen);
    expect(mockExportCatalogClientFormat).not.toHaveBeenCalled();
  });

  it("on a 404 (empty catalog, reported by the backend) shows the empty-catalog message", async () => {
    const user = userEvent.setup();
    mockProducts = [makeProduct({ status: "published" })];
    promptSpy.mockReturnValue("mi-catalogo");
    mockExportCatalogClientFormat.mockResolvedValue(
      new Response(null, { status: 404 }),
    );

    await openExportSummary(user);
    await user.click(screen.getByTestId("export-summary-continue-button"));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "No hay productos publicados para exportar.",
      ),
    );
    expect(anchorClickSpy).not.toHaveBeenCalled();
  });

  it("confirming the banner and the prompt triggers the export and guards against a second click while in flight", async () => {
    const user = userEvent.setup();
    mockProducts = [makeProduct({ status: "published" })];
    promptSpy.mockReturnValue("mi-catalogo");
    let resolveExport: (value: Response) => void = () => {};
    mockExportCatalogClientFormat.mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveExport = resolve;
      }),
    );

    await openExportSummary(user);
    await user.click(screen.getByTestId("export-summary-continue-button"));

    expect(mockExportCatalogClientFormat).toHaveBeenCalledTimes(1);

    // Reopen the menu item while the first export is still in flight —
    // the click handler's own guard (not just the ignored `disabled` prop
    // under the test's DropdownMenuItem mock) must prevent re-entry.
    await user.click(
      screen.getByRole("menuitem", {
        name: "Exportar catálogo (formato cliente)",
      }),
    );
    // Banner stays mounted in its "exporting" state (FR8/refined-mockups
    // Q2) — it does not fully unmount until the request settles.
    expect(
      screen.getByTestId("export-summary-state-exporting-single"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("export-summary-continue-button"),
    ).not.toBeInTheDocument();
    expect(mockExportCatalogClientFormat).toHaveBeenCalledTimes(1);

    resolveExport(buildZipResponse());
    await waitFor(() => expect(anchorClickSpy).toHaveBeenCalledTimes(1));
  });

  it("on success (200, application/zip) triggers the blob download and a success toast", async () => {
    const user = userEvent.setup();
    mockProducts = [makeProduct({ status: "published" })];
    promptSpy.mockReturnValue("mi-catalogo");
    mockExportCatalogClientFormat.mockResolvedValue(buildZipResponse());

    await openExportSummary(user);
    await user.click(screen.getByTestId("export-summary-continue-button"));

    await waitFor(() => expect(anchorClickSpy).toHaveBeenCalledTimes(1));
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith("Catálogo exportado");
  });

  it("on a 413 (export limit exceeded) shows a specific error toast without downloading", async () => {
    const user = userEvent.setup();
    mockProducts = [makeProduct({ status: "published" })];
    promptSpy.mockReturnValue("mi-catalogo");
    mockExportCatalogClientFormat.mockResolvedValue(
      buildErrorResponse(413, "El catálogo supera el límite soportado."),
    );

    await openExportSummary(user);
    await user.click(screen.getByTestId("export-summary-continue-button"));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "El catálogo supera el límite soportado.",
      ),
    );
    expect(anchorClickSpy).not.toHaveBeenCalled();
  });

  it("on a 403 (no permission for this export) shows a specific error toast without downloading", async () => {
    const user = userEvent.setup();
    mockProducts = [makeProduct({ status: "published" })];
    promptSpy.mockReturnValue("mi-catalogo");
    mockExportCatalogClientFormat.mockResolvedValue(
      buildErrorResponse(
        403,
        "No tenés permiso para exportar todas las organizaciones.",
      ),
    );

    await openExportSummary(user);
    await user.click(screen.getByTestId("export-summary-continue-button"));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "No tenés permiso para exportar todas las organizaciones.",
      ),
    );
    expect(anchorClickSpy).not.toHaveBeenCalled();
  });

  it("on a network failure shows a generic error toast instead of an unhandled rejection", async () => {
    const user = userEvent.setup();
    mockProducts = [makeProduct({ status: "published" })];
    promptSpy.mockReturnValue("mi-catalogo");
    mockExportCatalogClientFormat.mockRejectedValue(new Error("network down"));

    await openExportSummary(user);
    await user.click(screen.getByTestId("export-summary-continue-button"));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "No se pudo exportar el catálogo. Verificá tu conexión.",
      ),
    );
    expect(anchorClickSpy).not.toHaveBeenCalled();
  });

  it("cancelling the window.prompt does not fire any request", async () => {
    const user = userEvent.setup();
    mockProducts = [makeProduct({ status: "published" })];
    promptSpy.mockReturnValue(null);

    await openExportSummary(user);
    await user.click(screen.getByTestId("export-summary-continue-button"));

    expect(mockExportCatalogClientFormat).not.toHaveBeenCalled();
  });

  it("contract: a 200 response with Content-Type application/zip is consumed as a blob, never as JSON", async () => {
    const user = userEvent.setup();
    mockProducts = [makeProduct({ status: "published" })];
    promptSpy.mockReturnValue("mi-catalogo");
    const response = buildZipResponse();
    mockExportCatalogClientFormat.mockResolvedValue(response);

    await openExportSummary(user);
    await user.click(screen.getByTestId("export-summary-continue-button"));

    await waitFor(() => expect(response.blob).toHaveBeenCalledTimes(1));
    expect(response.json).not.toHaveBeenCalled();
  });
});

// ─── CatalogPage — export cross-org (selector de organización) ─────────────
// u1-export-org-confirmation. Reuses the helpers/mocks from the describe
// above (`openExportSummary`, `makeProduct`, `buildZipResponse`,
// `buildErrorResponse`) plus the `useOrganization`/`useOrganizationStore`
// mocks declared at module scope, following the selector-consuming mock
// pattern already established by `OrganizationPicker.test.tsx`.

describe("CatalogPage — export cross-org (selector de organización)", () => {
  let promptSpy: MockInstance<typeof window.prompt>;
  let anchorClickSpy: MockInstance<() => void>;

  beforeEach(() => {
    mockSearchParams = new URLSearchParams();
    mockPush.mockClear();
    mockUseInfiniteProducts.mockClear();
    mockProductCard.mockClear();
    mockExportCatalogClientFormat.mockReset();
    mockProducts = [makeProduct({ status: "published" })];
    mockViewingOrgId = null;
    mockUseOrganization.mockReturnValue({ organization: undefined });
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
    promptSpy = vi.spyOn(window, "prompt").mockReset();
    anchorClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockReset()
      .mockImplementation(() => {});
    URL.createObjectURL = vi.fn(() => "blob:mock-url");
    URL.revokeObjectURL = vi.fn();
  });

  it("no badge and no organization_id when viewingOrgId is null (piso de equipo #1)", async () => {
    const user = userEvent.setup();
    promptSpy.mockReturnValue("mi-catalogo");
    mockExportCatalogClientFormat.mockResolvedValue(buildZipResponse());

    await openExportSummary(user);
    expect(
      screen.queryByTestId("export-summary-org-badge"),
    ).not.toBeInTheDocument();

    await user.click(screen.getByTestId("export-summary-continue-button"));

    await waitFor(() =>
      expect(mockExportCatalogClientFormat).toHaveBeenCalledWith({
        organizationId: undefined,
        allOrganizations: false,
        baseFolder: "mi-catalogo",
        facebookGroupsFallback: "mi-catalogo",
      }),
    );
  });

  it("badge with the name when viewingOrgId points to a resolved organization (piso de equipo #2)", async () => {
    const user = userEvent.setup();
    mockViewingOrgId = "org-b";
    mockUseOrganization.mockReturnValue({
      organization: { id: "org-b", name: "Organización B" },
    });
    promptSpy.mockReturnValue("mi-catalogo");
    mockExportCatalogClientFormat.mockResolvedValue(buildZipResponse());

    await openExportSummary(user);
    expect(
      screen.getByText("Exportando catálogo de: Organización B"),
    ).toBeInTheDocument();

    await user.click(screen.getByTestId("export-summary-continue-button"));

    await waitFor(() =>
      expect(mockExportCatalogClientFormat).toHaveBeenCalledWith({
        organizationId: "org-b",
        allOrganizations: false,
        baseFolder: "mi-catalogo",
        facebookGroupsFallback: "mi-catalogo",
      }),
    );
  });

  it("skeleton badge (never absent) while the name has not resolved yet", async () => {
    const user = userEvent.setup();
    mockViewingOrgId = "org-b";
    mockUseOrganization.mockReturnValue({ organization: undefined });

    await openExportSummary(user);

    expect(screen.getByTestId("export-summary-org-badge")).toBeInTheDocument();
    expect(
      screen.getByTestId("export-summary-org-badge-skeleton"),
    ).toBeInTheDocument();
  });

  it("404 cross-org with resolved name → toast mentions the organization name", async () => {
    const user = userEvent.setup();
    mockViewingOrgId = "org-b";
    mockUseOrganization.mockReturnValue({
      organization: { id: "org-b", name: "Organización B" },
    });
    promptSpy.mockReturnValue("mi-catalogo");
    mockExportCatalogClientFormat.mockResolvedValue(
      new Response(null, { status: 404 }),
    );

    await openExportSummary(user);
    await user.click(screen.getByTestId("export-summary-continue-button"));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Organización B no tiene catálogo publicado para exportar.",
      ),
    );
    expect(anchorClickSpy).not.toHaveBeenCalled();
  });

  it("404 cross-org with unresolved name (deleted/inaccessible) → generic fallback toast", async () => {
    const user = userEvent.setup();
    mockViewingOrgId = "org-b";
    mockUseOrganization.mockReturnValue({ organization: undefined });
    promptSpy.mockReturnValue("mi-catalogo");
    mockExportCatalogClientFormat.mockResolvedValue(
      new Response(null, { status: 404 }),
    );

    await openExportSummary(user);
    await user.click(screen.getByTestId("export-summary-continue-button"));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Esta organización no tiene catálogo publicado para exportar.",
      ),
    );
    expect(anchorClickSpy).not.toHaveBeenCalled();
  });

  it("404 own organization → existing generic message unchanged (no regression)", async () => {
    const user = userEvent.setup();
    mockViewingOrgId = null;
    promptSpy.mockReturnValue("mi-catalogo");
    mockExportCatalogClientFormat.mockResolvedValue(
      new Response(null, { status: 404 }),
    );

    await openExportSummary(user);
    await user.click(screen.getByTestId("export-summary-continue-button"));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "No hay productos publicados para exportar.",
      ),
    );
    expect(anchorClickSpy).not.toHaveBeenCalled();
  });

  it("same store, same value — no second parallel state mechanism (piso de equipo #3)", async () => {
    const user = userEvent.setup();
    mockViewingOrgId = "org-b";
    mockUseOrganization.mockReturnValue({
      organization: { id: "org-b", name: "Organización B" },
    });
    promptSpy.mockReturnValue("mi-catalogo");
    mockExportCatalogClientFormat.mockResolvedValue(buildZipResponse());

    await openExportSummary(user);
    await user.click(screen.getByTestId("export-summary-continue-button"));

    await waitFor(() =>
      expect(mockExportCatalogClientFormat).toHaveBeenCalledWith({
        organizationId: mockViewingOrgId,
        allOrganizations: false,
        baseFolder: "mi-catalogo",
        facebookGroupsFallback: "mi-catalogo",
      }),
    );
  });

  it("without viewingOrgId, zero organization-related nodes anywhere in the flow", async () => {
    const user = userEvent.setup();
    promptSpy.mockReturnValue(null);

    await openExportSummary(user);

    // NOTE: the pre-existing banner copy already contains the word
    // "organización" ("...de tu organización.") — matching /organiza/i
    // against the whole document would false-positive on that unrelated
    // string. Target the badge-specific copy instead ("Exportando
    // catálogo de:"), which only renders when kind !== "own".
    expect(
      screen.queryByText(/exportando cat\u00e1logo de:/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("export-summary-org-badge"),
    ).not.toBeInTheDocument();

    await user.click(screen.getByTestId("export-summary-continue-button"));

    expect(mockExportCatalogClientFormat).not.toHaveBeenCalled();
    expect(
      screen.queryByText(/exportando cat\u00e1logo de:/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("export-summary-org-badge"),
    ).not.toBeInTheDocument();
  });
});

// ─── CatalogPage — u2-cross-org-export-ui: wiring real (Step 10) ──────────
// Piso mínimo de equipo #4 (organization_id llega a useInfiniteProducts para
// los 3 estados de viewingOrgId), #5 ya cubierto en OrganizationPicker.test.tsx,
// #6 (los 2 popups nuevos: cancelar aborta el flujo completo), más el
// conteo del banner "todas las organizaciones" (mismo listado cacheado por
// useOrganizations(), sin request nueva).

describe("CatalogPage — cross-org grid filtering + popups nuevos (u2)", () => {
  let promptSpy: MockInstance<typeof window.prompt>;
  let anchorClickSpy: MockInstance<() => void>;

  beforeEach(() => {
    mockSearchParams = new URLSearchParams();
    mockPush.mockClear();
    mockUseInfiniteProducts.mockClear();
    mockProductCard.mockClear();
    mockExportCatalogClientFormat.mockReset();
    mockProducts = [makeProduct({ status: "published" })];
    mockViewingOrgId = null;
    mockUseOrganization.mockReturnValue({ organization: undefined });
    mockUseOrganizations.mockReturnValue({ data: [] });
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
    promptSpy = vi.spyOn(window, "prompt").mockReset();
    anchorClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockReset()
      .mockImplementation(() => {});
    URL.createObjectURL = vi.fn(() => "blob:mock-url");
    URL.revokeObjectURL = vi.fn();
  });

  it("viewingOrgId null → organization_id sent to useInfiniteProducts is the viewer's own org (never omitted)", () => {
    mockViewingOrgId = null;

    render(<CatalogPage />);

    const [filters] = mockUseInfiniteProducts.mock.calls.at(-1) ?? [];
    expect(filters).toMatchObject({ organization_id: "org-1" });
  });

  it("viewingOrgId = a point organization → that organization_id reaches useInfiniteProducts", () => {
    mockViewingOrgId = "org-b";
    mockUseOrganization.mockReturnValue({
      organization: { id: "org-b", name: "Organización B" },
    });

    render(<CatalogPage />);

    const [filters] = mockUseInfiniteProducts.mock.calls.at(-1) ?? [];
    expect(filters).toMatchObject({ organization_id: "org-b" });
  });

  it('viewingOrgId = "ALL_ORGS" → organization_id is omitted from useInfiniteProducts (backend defaults to all orgs)', () => {
    mockViewingOrgId = "ALL_ORGS";

    render(<CatalogPage />);

    const [filters] = mockUseInfiniteProducts.mock.calls.at(-1) ?? [];
    expect(filters).toMatchObject({ organization_id: undefined });
  });

  it("switching the picker's organization (viewingOrgId change) triggers a refetch with the new filter", () => {
    mockViewingOrgId = "org-b";
    mockUseOrganization.mockReturnValue({
      organization: { id: "org-b", name: "Organización B" },
    });
    const { rerender } = render(<CatalogPage />);
    const [firstFilters] = mockUseInfiniteProducts.mock.calls.at(-1) ?? [];
    expect(firstFilters).toMatchObject({ organization_id: "org-b" });

    mockViewingOrgId = "ALL_ORGS";
    rerender(<CatalogPage />);
    const [secondFilters] = mockUseInfiniteProducts.mock.calls.at(-1) ?? [];
    expect(secondFilters).toMatchObject({ organization_id: undefined });
  });

  it("cancelling the base-folder popup (2nd prompt) aborts the export — no request fired", async () => {
    const user = userEvent.setup();
    promptSpy
      .mockReturnValueOnce("mi-catalogo") // filename
      .mockReturnValueOnce(null); // base folder — cancel

    await openExportSummary(user);
    await user.click(screen.getByTestId("export-summary-continue-button"));

    expect(promptSpy).toHaveBeenCalledTimes(2);
    expect(mockExportCatalogClientFormat).not.toHaveBeenCalled();
  });

  it("cancelling the facebook-groups popup (3rd prompt) aborts the export even after the base folder was confirmed", async () => {
    const user = userEvent.setup();
    promptSpy
      .mockReturnValueOnce("mi-catalogo") // filename
      .mockReturnValueOnce("Users/juanl/IMG/") // base folder
      .mockReturnValueOnce(null); // facebook groups fallback — cancel

    await openExportSummary(user);
    await user.click(screen.getByTestId("export-summary-continue-button"));

    expect(promptSpy).toHaveBeenCalledTimes(3);
    expect(mockExportCatalogClientFormat).not.toHaveBeenCalled();
  });

  it("confirming all 3 popups sends base_folder and facebook_groups_fallback through to the export call", async () => {
    const user = userEvent.setup();
    promptSpy
      .mockReturnValueOnce("mi-catalogo") // filename
      .mockReturnValueOnce("Users/juanl/IMG/") // base folder
      .mockReturnValueOnce("4,5,6"); // facebook groups fallback
    mockExportCatalogClientFormat.mockResolvedValue(buildZipResponse());

    await openExportSummary(user);
    await user.click(screen.getByTestId("export-summary-continue-button"));

    await waitFor(() =>
      expect(mockExportCatalogClientFormat).toHaveBeenCalledWith({
        organizationId: undefined,
        allOrganizations: false,
        baseFolder: "Users/juanl/IMG/",
        facebookGroupsFallback: "4,5,6",
      }),
    );
  });

  it('banner shows the count of organizations with published catalog when viewingOrgId = "ALL_ORGS"', async () => {
    const user = userEvent.setup();
    mockViewingOrgId = "ALL_ORGS";
    mockUseOrganizations.mockReturnValue({
      data: [
        { id: "org-a", name: "Org A", product_count: 3 },
        { id: "org-b", name: "Org B", product_count: 0 },
        { id: "org-c", name: "Org C" }, // product_count ausente
        { id: "org-d", name: "Org D", product_count: 1 },
      ],
    });

    await openExportSummary(user);

    // Solo org-a y org-d tienen product_count > 0 (mismo criterio ya
    // usado por OrganizationPicker) → conteo esperado: 2.
    expect(
      screen.getByTestId("export-summary-all-orgs-count"),
    ).toHaveTextContent("2");
  });

  it('confirming the export in "ALL_ORGS" mode sends allOrganizations: true and no organizationId', async () => {
    const user = userEvent.setup();
    mockViewingOrgId = "ALL_ORGS";
    promptSpy
      .mockReturnValueOnce("catalogo-todas")
      .mockReturnValueOnce("Users/juanl/IMG/")
      .mockReturnValueOnce("1,2,3");
    mockExportCatalogClientFormat.mockResolvedValue(buildZipResponse());

    await openExportSummary(user);
    await user.click(screen.getByTestId("export-summary-continue-button"));

    await waitFor(() =>
      expect(mockExportCatalogClientFormat).toHaveBeenCalledWith({
        organizationId: undefined,
        allOrganizations: true,
        baseFolder: "Users/juanl/IMG/",
        facebookGroupsFallback: "1,2,3",
      }),
    );
    expect(anchorClickSpy).toHaveBeenCalledTimes(1);
  });
});
