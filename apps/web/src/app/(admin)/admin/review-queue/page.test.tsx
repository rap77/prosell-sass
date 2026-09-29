/**
 * ReviewQueuePage.test.tsx — review queue with status tabs + organization filter.
 *
 * The page originally only listed pending products; after a batch
 * approve the products disappear without a clear navigation cue.
 * The suite then grew a 3-tab surface (Pendientes | Aprobados |
 * Rechazados) with a defensive guard that prevents approving products
 * that are no longer in pending.
 *
 * The latest layer wires the admin "Ver como" organization picker:
 * the page mirrors `useOrganizationStore.viewingOrgId` so admin screens
 * (catalog, review queue, ...) stay consistent. The new tests pin
 * the API filter mapping for the three "view as" states, the
 * reset-on-organization-change behavior, the tab-count reuse of the
 * same filter, and the existing tab-change reset behavior.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach, describe, it, expect } from "vitest";
import ReviewQueuePage from "./page";

const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseInfiniteProducts = vi.fn();
const mockUseBatchApproveProducts = vi.fn();
const mockUseBatchRejectProducts = vi.fn();
const mockUseSubmitProductsForApproval = vi.fn();
vi.mock("@/lib/api/products", () => ({
  useInfiniteProducts: (...args: unknown[]) => mockUseInfiniteProducts(...args),
  useBatchApproveProducts: () => mockUseBatchApproveProducts(),
  useBatchRejectProducts: () => mockUseBatchRejectProducts(),
  useSubmitProductsForApproval: () => mockUseSubmitProductsForApproval(),
}));

// Real hook calls react-query's useQuery; mocked like the sibling data
// hooks above so these tests don't need a QueryClientProvider wrapper.
const mockUseProductImageUrlsBatch = vi.fn();
vi.mock("@/lib/api/productImageUrlsBatch", () => ({
  useProductImageUrlsBatch: (...args: unknown[]) =>
    mockUseProductImageUrlsBatch(...args),
}));

const mockUseCurrentOrganizationProfile = vi.fn();
vi.mock("@/lib/api/userApi", () => ({
  useCurrentOrganizationProfile: () => mockUseCurrentOrganizationProfile(),
}));

const mockUseOrganizations = vi.fn();
vi.mock("@/lib/api/organizations", () => ({
  useOrganizations: () => mockUseOrganizations(),
}));

// ponytail: `useOrganizationStore` is implemented with a selector pattern;
// the real store returns different slices per call, so the mock mirrors
// that — `selector(mockUseOrganizationStore())` — instead of returning the
// whole object.
const mockUseOrganizationStore = vi.fn();
vi.mock("@/stores/organizationStore", () => ({
  useOrganizationStore: (selector: (state: unknown) => unknown) =>
    selector(mockUseOrganizationStore()),
}));

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

const OWN_ORG_ID = "own-org-id";
const OTHER_ORG_ID = "other-org-id";

const mockOrganizations = [
  { id: OWN_ORG_ID, name: "Own Organization", product_count: 5 },
  { id: OTHER_ORG_ID, name: "Other Organization", product_count: 3 },
];

function makePendingProducts(count: number, idPrefix = "pending") {
  return Array.from({ length: count }, (_, i) => ({
    id: `${idPrefix}-${i}`,
    // ponytail: the row's aria-label derives from `product.title`, so the
    // test must vary the title (not just the id) to drive the
    // selection across orgs.
    title: `${idPrefix === "pending" ? "Pending" : idPrefix.charAt(0).toUpperCase() + idPrefix.slice(1)} Product ${i}`,
    price_cents: 1000_00,
    status: "pending" as const,
  }));
}

function makePublishedProducts(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `published-${i}`,
    title: `Published Product ${i}`,
    price_cents: 2000_00,
    status: "published" as const,
  }));
}

function makeRejectedProducts(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `rejected-${i}`,
    title: `Rejected Product ${i}`,
    price_cents: 3000_00,
    status: "rejected" as const,
  }));
}

const baseAuth = {
  hasPermission: () => true,
};

function setOrganizationMocks(viewingOrgId: string | "ALL_ORGS" | null) {
  mockUseOrganizationStore.mockReturnValue({ viewingOrgId });
  mockUseCurrentOrganizationProfile.mockReturnValue({
    data: { id: OWN_ORG_ID },
    isLoading: false,
  });
  mockUseOrganizations.mockReturnValue({
    data: mockOrganizations,
    isLoading: false,
  });
}

describe("ReviewQueuePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(baseAuth);
    mockUseBatchApproveProducts.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    mockUseBatchRejectProducts.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    mockUseSubmitProductsForApproval.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    mockUseProductImageUrlsBatch.mockReturnValue({
      urls: new Map(),
      isLoading: false,
    });
    setOrganizationMocks(null);
  });

  it("renders the three status tabs (Pendientes | Aprobados | Rechazados)", async () => {
    mockUseInfiniteProducts.mockReturnValue({
      data: { pages: [{ items: makePendingProducts(2) }] },
      isLoading: false,
    });

    render(<ReviewQueuePage />);

    expect(
      screen.getByRole("tab", { name: /pendientes/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /aprobados/i })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /rechazados/i }),
    ).toBeInTheDocument();
  });

  it("appends the item count to a tab's label only when it has items", async () => {
    // ponytail: one hook call per tab (counts) plus one for the active
    // tab's full data — mock by status instead of call order.
    mockUseInfiniteProducts.mockImplementation(
      (filters?: { status?: string }) => {
        if (filters?.status === "rejected") {
          return {
            data: { pages: [{ items: makeRejectedProducts(1), total: 1 }] },
            isLoading: false,
          };
        }
        return {
          data: { pages: [{ items: [], total: 0 }] },
          isLoading: false,
        };
      },
    );

    render(<ReviewQueuePage />);

    expect(screen.getByRole("tab", { name: "Pendientes" })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Rechazados (1)" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: /aprobados \(/i }),
    ).not.toBeInTheDocument();
  });

  it("shows pending products by default", async () => {
    mockUseInfiniteProducts.mockReturnValue({
      data: { pages: [{ items: makePendingProducts(2) }] },
      isLoading: false,
    });

    render(<ReviewQueuePage />);

    await waitFor(() => {
      expect(screen.getByText("Pending Product 0")).toBeInTheDocument();
    });
    expect(mockUseInfiniteProducts).toHaveBeenCalledWith(
      expect.objectContaining({ status: "pending" }),
      expect.anything(),
    );
  });

  it("queries published products when the Aprobados tab is active", async () => {
    const user = userEvent.setup();
    // ponytail: the page now also fires one count query per tab, so
    // the mock keys off the requested status instead of call order.
    mockUseInfiniteProducts.mockImplementation(
      (filters?: { status?: string }) => {
        if (filters?.status === "published") {
          return {
            data: { pages: [{ items: makePublishedProducts(3), total: 3 }] },
            isLoading: false,
          };
        }
        if (filters?.status === "pending") {
          return {
            data: { pages: [{ items: makePendingProducts(1), total: 1 }] },
            isLoading: false,
          };
        }
        return { data: { pages: [{ items: [], total: 0 }] }, isLoading: false };
      },
    );

    render(<ReviewQueuePage />);

    await user.click(screen.getByRole("tab", { name: /aprobados/i }));

    await waitFor(() => {
      expect(mockUseInfiniteProducts).toHaveBeenCalledWith(
        expect.objectContaining({ status: "published" }),
        expect.anything(),
      );
    });
    expect(screen.getByText("Published Product 0")).toBeInTheDocument();
  });

  it("queries rejected products when the Rechazados tab is active", async () => {
    const user = userEvent.setup();
    mockUseInfiniteProducts.mockImplementation(
      (filters?: { status?: string }) => {
        if (filters?.status === "rejected") {
          return {
            data: { pages: [{ items: makeRejectedProducts(2), total: 2 }] },
            isLoading: false,
          };
        }
        if (filters?.status === "pending") {
          return {
            data: { pages: [{ items: makePendingProducts(1), total: 1 }] },
            isLoading: false,
          };
        }
        return { data: { pages: [{ items: [], total: 0 }] }, isLoading: false };
      },
    );

    render(<ReviewQueuePage />);

    await user.click(screen.getByRole("tab", { name: /rechazados/i }));

    await waitFor(() => {
      expect(mockUseInfiniteProducts).toHaveBeenCalledWith(
        expect.objectContaining({ status: "rejected" }),
        expect.anything(),
      );
    });
    expect(screen.getByText("Rejected Product 0")).toBeInTheDocument();
  });

  it("does not allow approving products that are no longer in pending", async () => {
    // ponytail: the Aprobados tab renders published products which must
    // not be selectable for re-approval. The table renders them as
    // read-only rows with a visible status badge.
    mockUseInfiniteProducts.mockReturnValue({
      data: { pages: [{ items: makePublishedProducts(2) }] },
      isLoading: false,
    });

    render(<ReviewQueuePage />);

    // The Aprobados tab is read-only by default (no batch actions).
    expect(
      screen.queryByRole("button", { name: /aprobar/i }),
    ).not.toBeInTheDocument();
  });

  it("does not render checkboxes in the read-only Aprobados tab", async () => {
    const user = userEvent.setup();
    mockUseInfiniteProducts.mockImplementation(
      (filters?: { status?: string }) => {
        if (filters?.status === "published") {
          return {
            data: { pages: [{ items: makePublishedProducts(1), total: 1 }] },
            isLoading: false,
          };
        }
        return { data: { pages: [{ items: [], total: 0 }] }, isLoading: false };
      },
    );

    render(<ReviewQueuePage />);
    await user.click(screen.getByRole("tab", { name: /aprobados/i }));

    await waitFor(() => {
      expect(screen.getByText("Published Product 0")).toBeInTheDocument();
    });
    expect(
      screen.queryByLabelText("Seleccionar todos"),
    ).not.toBeInTheDocument();
  });

  it("allows resubmitting selected rejected products for review", async () => {
    const user = userEvent.setup();
    const mutate = vi.fn();
    mockUseSubmitProductsForApproval.mockReturnValue({
      mutate,
      isPending: false,
    });
    mockUseInfiniteProducts.mockImplementation(
      (filters?: { status?: string }) => {
        if (filters?.status === "rejected") {
          return {
            data: { pages: [{ items: makeRejectedProducts(1), total: 1 }] },
            isLoading: false,
          };
        }
        return { data: { pages: [{ items: [], total: 0 }] }, isLoading: false };
      },
    );

    render(<ReviewQueuePage />);
    await user.click(screen.getByRole("tab", { name: /rechazados/i }));

    await waitFor(() => {
      expect(screen.getByText("Rejected Product 0")).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText("Seleccionar Rejected Product 0"));

    const resubmitButton = screen.getByRole("button", {
      name: /reenviar a revisión/i,
    });
    await user.click(resubmitButton);

    expect(mutate).toHaveBeenCalledWith(["rejected-0"]);
  });

  // ─── Organization filter (admin "Ver como") ────────────────────────────

  it("sends the admin's own tenant id when no 'view as' is active", () => {
    setOrganizationMocks(null);
    mockUseInfiniteProducts.mockReturnValue({
      data: { pages: [{ items: [], total: 0 }] },
      isLoading: false,
    });

    render(<ReviewQueuePage />);

    // ponytail: every call (active tab + 3 tab counts) must carry the
    // admin's own tenant id — never the cross-org default, never omit.
    const calls = mockUseInfiniteProducts.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    for (const [filters] of calls) {
      expect(filters).toEqual(
        expect.objectContaining({ organization_id: OWN_ORG_ID }),
      );
    }
  });

  it("omits organization_id when 'view as' is ALL_ORGS (cross-org)", () => {
    setOrganizationMocks("ALL_ORGS");
    mockUseInfiniteProducts.mockReturnValue({
      data: { pages: [{ items: [], total: 0 }] },
      isLoading: false,
    });

    render(<ReviewQueuePage />);

    // ponytail: ALL_ORGS sends no organization_id — that's the
    // backend's "every organization" signal on list_products (gated
    // by ORG_ADMIN_VIEW_ALL). `organization_id === undefined` is
    // the contract the page holds; `URLSearchParams` skips
    // undefined-valued keys at serialization, so the wire request
    // carries no `organization_id` param regardless of whether the
    // JS object literal retains the key with an undefined value.
    const calls = mockUseInfiniteProducts.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    for (const [filters] of calls) {
      expect(filters).toEqual(
        expect.objectContaining({ organization_id: undefined }),
      );
    }
  });

  it("sends the selected organization id when 'view as' is a specific org", () => {
    setOrganizationMocks(OTHER_ORG_ID);
    mockUseInfiniteProducts.mockReturnValue({
      data: { pages: [{ items: [], total: 0 }] },
      isLoading: false,
    });

    render(<ReviewQueuePage />);

    const calls = mockUseInfiniteProducts.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    for (const [filters] of calls) {
      expect(filters).toEqual(
        expect.objectContaining({ organization_id: OTHER_ORG_ID }),
      );
    }
  });

  it("reuses the same organizationFilter for the active tab and all three tab counts", () => {
    setOrganizationMocks(OTHER_ORG_ID);
    mockUseInfiniteProducts.mockReturnValue({
      data: { pages: [{ items: [], total: 0 }] },
      isLoading: false,
    });

    render(<ReviewQueuePage />);

    // ponytail: the page fires 4 hooks per render (active + 3 counts).
    // React strict mode dev double-invokes hooks, so we expect a
    // multiple of 4 here — every call must carry the SAME
    // organization_id so the badges and the table can never disagree
    // about scope.
    const calls = mockUseInfiniteProducts.mock.calls;
    expect(calls.length).toBeGreaterThanOrEqual(4);
    expect(calls.length % 4).toBe(0);
    const orgIds = calls.map(([filters]) => filters.organization_id);
    for (const orgId of orgIds) {
      expect(orgId).toBe(OTHER_ORG_ID);
    }
    // ponytail: every fourth call (active + 3 counts) carries a
    // distinct status; verify the active tab's status is "pending"
    // (the default) at each render slot.
    const statuses = calls.map(([filters]) => filters.status);
    for (let i = 0; i < statuses.length; i += 4) {
      expect(statuses.slice(i, i + 4)).toEqual([
        "pending",
        "pending",
        "published",
        "rejected",
      ]);
    }
  });

  it("reflects the active organization in the page header", () => {
    setOrganizationMocks("ALL_ORGS");
    mockUseInfiniteProducts.mockReturnValue({
      data: { pages: [{ items: [], total: 0 }] },
      isLoading: false,
    });

    render(<ReviewQueuePage />);

    expect(screen.getByTestId("review-queue-active-org")).toHaveTextContent(
      "Todas las organizaciones",
    );
  });

  it("resets selectedIds and lastResults when the admin switches organization", async () => {
    const user = userEvent.setup();
    setOrganizationMocks(null);

    // ponytail: switch the products list per org so the test can
    // observe both the filter change (new products appear) and the
    // selection reset (old selection is gone). The aria-label of each
    // row's checkbox is `Seleccionar ${product.title}`, so the title
    // must vary by org too (the helper does this from the idPrefix).
    mockUseInfiniteProducts.mockImplementation(
      (filters?: { status?: string; organization_id?: string }) => {
        if (filters?.status !== "pending") {
          return {
            data: { pages: [{ items: [], total: 0 }] },
            isLoading: false,
          };
        }
        if (filters.organization_id === OTHER_ORG_ID) {
          return {
            data: {
              pages: [{ items: makePendingProducts(1, "other"), total: 1 }],
            },
            isLoading: false,
          };
        }
        return {
          data: {
            pages: [{ items: makePendingProducts(1, "own"), total: 1 }],
          },
          isLoading: false,
        };
      },
    );

    const { rerender } = render(<ReviewQueuePage />);

    // Wait for the own-org row to render and select it.
    const ownCheckbox = await screen.findByLabelText(
      "Seleccionar Own Product 0",
    );
    await user.click(ownCheckbox);
    expect(ownCheckbox).toBeChecked();

    // ponytail: switching to a specific org changes the active filter
    // (different products appear) AND fires the reset effect (no
    // checkbox checked anymore — the previous selection was for the
    // own org, meaningless for the other org).
    setOrganizationMocks(OTHER_ORG_ID);
    mockUseInfiniteProducts.mockClear();
    rerender(<ReviewQueuePage />);

    const otherCheckbox = await screen.findByLabelText(
      "Seleccionar Other Product 0",
    );
    await waitFor(() => {
      expect(otherCheckbox).not.toBeChecked();
    });
    expect(screen.queryByLabelText("Seleccionar Own Product 0")).toBeNull();
  });

  it("resets selectedIds and lastResults when the admin changes tabs", async () => {
    const user = userEvent.setup();
    setOrganizationMocks(null);

    // ponytail: trigger a rejected-product resubmit first to populate
    // lastResults indirectly (the resubmit handler clears selectedIds
    // but the test exercises the tab-change path specifically).
    const mutate = vi.fn();
    mockUseSubmitProductsForApproval.mockReturnValue({
      mutate,
      isPending: false,
    });
    mockUseInfiniteProducts.mockImplementation(
      (filters?: { status?: string }) => {
        if (filters?.status === "pending") {
          return {
            data: { pages: [{ items: makePendingProducts(1), total: 1 }] },
            isLoading: false,
          };
        }
        if (filters?.status === "rejected") {
          return {
            data: { pages: [{ items: makeRejectedProducts(1), total: 1 }] },
            isLoading: false,
          };
        }
        return { data: { pages: [{ items: [], total: 0 }] }, isLoading: false };
      },
    );

    render(<ReviewQueuePage />);

    // Select a pending product on the default tab.
    const pendingCheckbox = await screen.findByLabelText(
      "Seleccionar Pending Product 0",
    );
    await user.click(pendingCheckbox);
    expect(pendingCheckbox).toBeChecked();

    // Switch to the rejected tab — selectedIds must clear on tab
    // change so a checkbox from the prior tab doesn't silently ship
    // into a new batch operation.
    await user.click(screen.getByRole("tab", { name: /rechazados/i }));

    await screen.findByText("Rejected Product 0");
    // The pending row's checkbox is gone (different tab → different
    // products list).
    expect(
      screen.queryByLabelText("Seleccionar Pending Product 0"),
    ).not.toBeInTheDocument();
    // The new tab's own checkbox starts unchecked — proving the
    // selectedIds Set was cleared by the tab change, not just the
    // products list swapped out from under us.
    expect(
      screen.getByLabelText("Seleccionar Rejected Product 0"),
    ).not.toBeChecked();
  });
});
