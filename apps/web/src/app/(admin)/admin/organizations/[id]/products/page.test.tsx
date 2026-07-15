/**
 * AdminOrganizationProductsPage.test.tsx — Subsystem D Phase 6.9
 *
 * Renders the organization's products using GET /admin/organizations/{id}/products.
 */
import { render, screen, waitFor } from "@testing-library/react";
import { vi, beforeEach, describe, it, expect } from "vitest";
import AdminOrganizationProductsPage from "./page";

const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseOrganizationProducts = vi.fn();
vi.mock("@/lib/api/organizations", () => ({
  useOrganizationProducts: () => mockUseOrganizationProducts(),
}));

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useParams: () => ({ id: "organization-1" }),
}));

describe("AdminOrganizationProductsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAdmin: true });
  });

  it("redirects a non-admin to /dashboard", async () => {
    // ponytail: useRequireAdmin only redirects when authenticated AND not admin
    mockUseAuth.mockReturnValue({
      isAdmin: false,
      isAuthenticated: true,
      isLoading: false,
    });
    mockUseOrganizationProducts.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(<AdminOrganizationProductsPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("renders the organization's products", async () => {
    mockUseOrganizationProducts.mockReturnValue({
      data: [
        { id: "p1", title: "Toyota Corolla 2020", price_cents: 1500000 },
        { id: "p2", title: "Honda Civic 2019", price_cents: 1200000 },
      ],
      isLoading: false,
      error: null,
    });

    render(<AdminOrganizationProductsPage />);

    expect(await screen.findByText("Toyota Corolla 2020")).toBeInTheDocument();
    expect(screen.getByText("Honda Civic 2019")).toBeInTheDocument();
  });

  it("shows an empty state when the organization has no products", async () => {
    mockUseOrganizationProducts.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(<AdminOrganizationProductsPage />);

    expect(await screen.findByText(/sin productos/i)).toBeInTheDocument();
  });
});
