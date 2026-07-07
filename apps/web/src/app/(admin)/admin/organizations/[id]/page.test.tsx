/**
 * AdminDealerDetailPage.test.tsx — Subsystem D Phase 6.7
 *
 * Shows the dealer's info and links to its products page.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi, beforeEach, describe, it, expect } from "vitest";
import AdminDealerDetailPage from "./page";

const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseDealer = vi.fn();
const mockUseResendInvitation = vi.fn();
vi.mock("@/lib/api/dealers", () => ({
  useDealer: () => mockUseDealer(),
  useResendDealerInvitation: () => mockUseResendInvitation(),
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
    mockUseResendInvitation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
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
    expect(link).toHaveAttribute(
      "href",
      "/admin/organizations/dealer-1/products",
    );
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

  it("does not show the resend-invitation button when the dealer is active", async () => {
    mockUseDealer.mockReturnValue({
      dealer: { id: "dealer-1", name: "Acme Motors", status: "active" },
      isLoading: false,
      error: null,
    });

    render(<AdminDealerDetailPage />);

    expect(
      screen.queryByRole("button", { name: /reenviar invitación/i }),
    ).not.toBeInTheDocument();
  });

  it("shows the resend-invitation button only when status is pending_verification and calls mutate with the dealer id", async () => {
    const mockMutate = vi.fn();
    mockUseResendInvitation.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });
    mockUseDealer.mockReturnValue({
      dealer: {
        id: "dealer-1",
        name: "Acme Motors",
        status: "pending_verification",
      },
      isLoading: false,
      error: null,
    });

    render(<AdminDealerDetailPage />);

    const button = screen.getByRole("button", { name: /reenviar invitación/i });
    fireEvent.click(button);

    expect(mockMutate).toHaveBeenCalledWith("dealer-1");
  });
});
