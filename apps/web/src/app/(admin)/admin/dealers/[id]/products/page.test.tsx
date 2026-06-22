/**
 * AdminDealerProductsPage.test.tsx — Subsystem D Phase 6.9
 *
 * Renders the dealer's products using GET /admin/dealers/{id}/products.
 */
import { render, screen, waitFor } from "@testing-library/react";
import { vi, beforeEach, describe, it, expect } from "vitest";
import AdminDealerProductsPage from "./page";

const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseDealerProducts = vi.fn();
vi.mock("@/lib/api/dealers", () => ({
  useDealerProducts: () => mockUseDealerProducts(),
}));

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useParams: () => ({ id: "dealer-1" }),
}));

describe("AdminDealerProductsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAdmin: true });
  });

  it("redirects a non-admin to /dashboard", async () => {
    mockUseAuth.mockReturnValue({ isAdmin: false });
    mockUseDealerProducts.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(<AdminDealerProductsPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("renders the dealer's products", async () => {
    mockUseDealerProducts.mockReturnValue({
      data: [
        { id: "p1", title: "Toyota Corolla 2020", price_cents: 1500000 },
        { id: "p2", title: "Honda Civic 2019", price_cents: 1200000 },
      ],
      isLoading: false,
      error: null,
    });

    render(<AdminDealerProductsPage />);

    expect(await screen.findByText("Toyota Corolla 2020")).toBeInTheDocument();
    expect(screen.getByText("Honda Civic 2019")).toBeInTheDocument();
  });

  it("shows an empty state when the dealer has no products", async () => {
    mockUseDealerProducts.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(<AdminDealerProductsPage />);

    expect(await screen.findByText(/sin productos/i)).toBeInTheDocument();
  });
});
