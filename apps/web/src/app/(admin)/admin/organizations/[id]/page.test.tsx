/**
 * AdminDealerDetailPage.test.tsx — Subsystem D Phase 6.7
 *
 * Shows the dealer's info and links to its products page.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi, beforeEach, describe, it, expect } from "vitest";
import AdminDealerDetailPage from "./page";

// Mock useRequireAdmin (the component uses this, not useAuth)
const mockUseRequireAdmin = vi.fn();
vi.mock("@/hooks/useRequireAdmin", () => ({
  useRequireAdmin: () => mockUseRequireAdmin(),
}));

const mockUseDealer = vi.fn();
const mockUseResendInvitation = vi.fn();
const mockUseUpdateDealer = vi.fn();
const mockUseDealerBrokers = vi.fn();
const mockUseCreateDealerBroker = vi.fn();
const mockUseUpdateDealerBroker = vi.fn();
const mockUseDeleteDealerBroker = vi.fn();
vi.mock("@/lib/api/dealers", () => ({
  useDealer: () => mockUseDealer(),
  useResendDealerInvitation: () => mockUseResendInvitation(),
  useUpdateDealer: () => mockUseUpdateDealer(),
  useDealerBrokers: () => mockUseDealerBrokers(),
  useCreateDealerBroker: () => mockUseCreateDealerBroker(),
  useUpdateDealerBroker: () => mockUseUpdateDealerBroker(),
  useDeleteDealerBroker: () => mockUseDeleteDealerBroker(),
}));

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useParams: () => ({ id: "dealer-1" }),
}));

describe("AdminDealerDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRequireAdmin.mockReturnValue(true);
    mockUseResendInvitation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    mockUseUpdateDealer.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
    });
    // Broker hooks used by BrokerManager component
    mockUseDealerBrokers.mockReturnValue({ data: [], isLoading: false });
    mockUseCreateDealerBroker.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    mockUseUpdateDealerBroker.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    mockUseDeleteDealerBroker.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  it("returns null when not admin (useRequireAdmin handles redirect)", () => {
    mockUseRequireAdmin.mockReturnValue(false);
    mockUseDealer.mockReturnValue({
      dealer: undefined,
      isLoading: false,
      error: null,
    });

    const { container } = render(<AdminDealerDetailPage />);
    expect(container.firstChild).toBeNull();
  });

  it("shows the dealer's name and status", async () => {
    mockUseDealer.mockReturnValue({
      dealer: { id: "dealer-1", name: "Dealer One", status: "active" },
      isLoading: false,
      error: null,
    });

    render(<AdminDealerDetailPage />);

    expect(await screen.findByText("Dealer One")).toBeInTheDocument();
    expect(screen.getByText(/activo/i)).toBeInTheDocument();
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

    expect(await screen.findByText(/no encontrad/i)).toBeInTheDocument();
  });

  it("does not show the resend-invitation button when the dealer is active", async () => {
    mockUseDealer.mockReturnValue({
      dealer: { id: "dealer-1", name: "Acme Motors", status: "active" },
      isLoading: false,
      error: null,
    });

    render(<AdminDealerDetailPage />);

    // Wait for content to render
    await screen.findByText("Acme Motors");

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

    const button = await screen.findByRole("button", {
      name: /reenviar invitación/i,
    });
    fireEvent.click(button);

    expect(mockMutate).toHaveBeenCalledWith("dealer-1");
  });
});
