/**
 * AdminDealersPage.test.tsx — Subsystem D Phase 6.5
 *
 * Renders the dealers list for an admin; redirects a non-admin to /dashboard.
 */
import { render, screen, waitFor } from "@testing-library/react";
import { vi, beforeEach, describe, it, expect } from "vitest";
import AdminDealersPage from "./page";

const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseDealers = vi.fn();
vi.mock("@/lib/api/dealers", () => ({
  useDealers: () => mockUseDealers(),
}));

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

describe("AdminDealersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects a non-admin to /dashboard", async () => {
    mockUseAuth.mockReturnValue({ isAdmin: false, hasPermission: () => false });
    mockUseDealers.mockReturnValue({ data: [], isLoading: false, error: null });

    render(<AdminDealersPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("renders the dealers list for an admin", async () => {
    mockUseAuth.mockReturnValue({ isAdmin: true, hasPermission: () => false });
    mockUseDealers.mockReturnValue({
      data: [
        { id: "dealer-1", name: "Dealer One" },
        { id: "dealer-2", name: "Dealer Two" },
      ],
      isLoading: false,
      error: null,
    });

    render(<AdminDealersPage />);

    expect(screen.getByText("Dealer One")).toBeInTheDocument();
    expect(screen.getByText("Dealer Two")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("links each dealer to its detail page", async () => {
    mockUseAuth.mockReturnValue({ isAdmin: true, hasPermission: () => false });
    mockUseDealers.mockReturnValue({
      data: [{ id: "dealer-1", name: "Dealer One" }],
      isLoading: false,
      error: null,
    });

    render(<AdminDealersPage />);

    const link = screen.getByText("Dealer One").closest("a");
    expect(link).toHaveAttribute("href", "/admin/organizations/dealer-1");
  });

  it("links to /admin/organizations/new when the user can create dealers", () => {
    mockUseAuth.mockReturnValue({ isAdmin: true, hasPermission: () => true });
    mockUseDealers.mockReturnValue({ data: [], isLoading: false, error: null });

    render(<AdminDealersPage />);

    expect(
      screen.getByRole("link", { name: /nuevo organización/i }),
    ).toHaveAttribute("href", "/admin/organizations/new");
  });

  it("hides the entry point when the user lacks the permission", () => {
    mockUseAuth.mockReturnValue({ isAdmin: true, hasPermission: () => false });
    mockUseDealers.mockReturnValue({ data: [], isLoading: false, error: null });

    render(<AdminDealersPage />);

    expect(
      screen.queryByRole("link", { name: /nuevo organización/i }),
    ).not.toBeInTheDocument();
  });
});
