/**
 * DealerPicker.test.tsx — Subsystem D Phase 6.2
 *
 * Renders only for admins (DEALER_ADMIN_VIEW_ALL) and updates
 * organizationStore.viewingOrgId when a dealer is selected.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach, describe, it, expect } from "vitest";
import { DealerPicker } from "./DealerPicker";

const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseDealers = vi.fn();
vi.mock("@/lib/api/dealers", () => ({
  useDealers: () => mockUseDealers(),
}));

const mockSetViewingOrgId = vi.fn();
const mockUseOrganizationStore = vi.fn();
vi.mock("@/stores/organizationStore", () => ({
  useOrganizationStore: (selector: (state: unknown) => unknown) =>
    selector(mockUseOrganizationStore()),
}));

const mockDealers = [
  { id: "dealer-1", name: "Dealer One" },
  { id: "dealer-2", name: "Dealer Two" },
];

describe("DealerPicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDealers.mockReturnValue({ data: mockDealers, isLoading: false });
    mockUseOrganizationStore.mockReturnValue({
      viewingOrgId: null,
      setViewingOrgId: mockSetViewingOrgId,
    });
  });

  it("renders nothing for a non-admin user", () => {
    mockUseAuth.mockReturnValue({ isAdmin: false });

    const { container } = render(<DealerPicker />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders the picker for an admin user", () => {
    mockUseAuth.mockReturnValue({ isAdmin: true });

    render(<DealerPicker />);

    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("calls setViewingOrgId when a dealer is selected", async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({ isAdmin: true });

    render(<DealerPicker />);

    await user.click(screen.getByRole("button"));

    const option = await screen.findByText("Dealer Two");
    await user.click(option);

    await waitFor(() => {
      expect(mockSetViewingOrgId).toHaveBeenCalledWith("dealer-2");
    });
  });
});
