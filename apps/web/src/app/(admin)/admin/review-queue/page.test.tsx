/**
 * ReviewQueuePage.test.tsx — review queue with status tabs.
 *
 * The page originally only listed pending products; after a batch
 * approve the products disappear without a clear navigation cue.
 * These tests pin three status tabs (Pendientes | Aprobados |
 * Rechazados) and the defensive guard that prevents approving
 * products that are no longer in pending.
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

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

function makePendingProducts(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `pending-${i}`,
    title: `Pending Product ${i}`,
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
});
