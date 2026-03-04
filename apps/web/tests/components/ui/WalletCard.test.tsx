/**
 * WalletCard Component Tests
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WalletCard } from "@/components/ui/WalletCard";

const mockFetchBalance = vi.fn();
const mockCredit = vi.fn();

vi.mock("@/stores", () => ({
  useWalletStore: vi.fn(() => ({
    wallet: null,
    isLoading: false,
    error: null,
    fetchBalance: mockFetchBalance,
    credit: mockCredit,
  })),
  useAuthStore: vi.fn(() => ({
    user: { id: "user-123" },
  })),
}));

import { useWalletStore } from "@/stores";

describe("WalletCard", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  beforeEach(() => {
    (useWalletStore as any).mockReturnValue({
      wallet: null,
      isLoading: false,
      error: null,
      fetchBalance: mockFetchBalance,
      credit: mockCredit,
    });
  });

  it("renders title and refresh button by default", () => {
    render(<WalletCard organizationId="org-123" />);
    expect(screen.getByText(/token balance/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /refresh balance/i })).toBeInTheDocument();
  });

  it("fetches balance on mount", () => {
    render(<WalletCard organizationId="org-123" />);
    expect(mockFetchBalance).toHaveBeenCalledWith("org-123", "user-123");
  });

  it("displays formatted balance when wallet exists", () => {
    (useWalletStore as any).mockReturnValue({
      wallet: { balance: 1500 },
      isLoading: false,
      error: null,
      fetchBalance: mockFetchBalance,
      credit: mockCredit,
    });
    render(<WalletCard organizationId="org-123" />);
    expect(screen.getByText("1,500")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    (useWalletStore as any).mockReturnValue({
      wallet: null,
      isLoading: true,
      error: null,
      fetchBalance: mockFetchBalance,
      credit: mockCredit,
    });
    render(<WalletCard organizationId="org-123" />);
    expect(screen.getByText("...")).toBeInTheDocument();
  });

  it("shows error message when error exists", () => {
    (useWalletStore as any).mockReturnValue({
      wallet: null,
      isLoading: false,
      error: { message: "Failed to fetch balance" },
      fetchBalance: mockFetchBalance,
      credit: mockCredit,
    });
    render(<WalletCard organizationId="org-123" />);
    expect(screen.getByText(/failed to fetch balance/i)).toBeInTheDocument();
  });

  it("calls fetchBalance on refresh button click", async () => {
    const user = userEvent.setup();
    render(<WalletCard organizationId="org-123" />);
    mockFetchBalance.mockClear();
    await user.click(screen.getByRole("button", { name: /refresh balance/i }));
    expect(mockFetchBalance).toHaveBeenCalledWith("org-123", "user-123");
  });

  it("shows recharge dialog on Recharge button click", async () => {
    const user = userEvent.setup();
    render(<WalletCard organizationId="org-123" />);
    await user.click(screen.getByRole("button", { name: /recharge/i }));
    expect(screen.getByText(/select token package/i)).toBeInTheDocument();
  });

  it("hides title when showTitle=false", () => {
    render(<WalletCard organizationId="org-123" showTitle={false} />);
    expect(screen.queryByText(/token balance/i)).not.toBeInTheDocument();
  });

  it("hides refresh button when showRefreshButton=false", () => {
    render(<WalletCard organizationId="org-123" showRefreshButton={false} />);
    expect(screen.queryByRole("button", { name: /refresh balance/i })).not.toBeInTheDocument();
  });
});
