/**
 * AdminDealerDetailPage.test.tsx — Subsystem D Phase 6.7
 *
 * Shows the dealer's info and links to its products page.
 */
import { render, screen, waitFor } from "@testing-library/react";
import { vi, beforeEach, describe, it, expect } from "vitest";
import AdminDealerDetailPage from "./page";

const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseDealer = vi.fn();
vi.mock("@/lib/api/dealers", () => ({
  useDealer: () => mockUseDealer(),
}));

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useParams: () => ({ id: "dealer-1" }),
}));

describe("AdminDealerDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAdmin: true });
  });

  it("redirects a non-admin to /dashboard", async () => {
    mockUseAuth.mockReturnValue({ isAdmin: false });
    mockUseDealer.mockReturnValue({
      dealer: undefined,
      isLoading: false,
      error: null,
    });

    render(<AdminDealerDetailPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("shows the dealer's name and status", async () => {
    mockUseDealer.mockReturnValue({
      dealer: { id: "dealer-1", name: "Dealer One", status: "active" },
      isLoading: false,
      error: null,
    });

    render(<AdminDealerDetailPage />);

    expect(await screen.findByText("Dealer One")).toBeInTheDocument();
    expect(screen.getByText(/active/i)).toBeInTheDocument();
  });

  it("links to the dealer's products page", async () => {
    mockUseDealer.mockReturnValue({
      dealer: { id: "dealer-1", name: "Dealer One", status: "active" },
      isLoading: false,
      error: null,
    });

    render(<AdminDealerDetailPage />);

    const link = await screen.findByRole("link", { name: /productos/i });
    expect(link).toHaveAttribute("href", "/admin/dealers/dealer-1/products");
  });

  it("shows a not-found message when the dealer doesn't exist", async () => {
    mockUseDealer.mockReturnValue({
      dealer: undefined,
      isLoading: false,
      error: null,
    });

    render(<AdminDealerDetailPage />);

    expect(await screen.findByText(/no encontrado/i)).toBeInTheDocument();
  });
});
