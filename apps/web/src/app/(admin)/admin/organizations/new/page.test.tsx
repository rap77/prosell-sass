import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminNewDealerPage from "./page";

const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

const mockHasPermission = vi.fn();
const mockAuthIsLoading = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    hasPermission: mockHasPermission,
    isLoading: mockAuthIsLoading(),
  }),
}));

const mockMutate = vi.fn();
vi.mock("@/lib/api/dealers", () => ({
  useCreateDealer: () => ({
    mutate: mockMutate,
    isPending: false,
    error: null,
  }),
}));

const mockUseCategories = vi.fn();
vi.mock("@/lib/api/categories", () => ({
  useCategories: () => mockUseCategories(),
}));

describe("AdminNewDealerPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthIsLoading.mockReturnValue(false);
    // ponytail: need level=0 because component filters by level
    mockUseCategories.mockReturnValue({
      data: [
        { id: "cat-1", name: "Vehicles", level: 0 },
        { id: "cat-2", name: "Real Estate", level: 0 },
      ],
      isLoading: false,
    });
  });

  it("does not redirect while auth is still hydrating", () => {
    mockAuthIsLoading.mockReturnValue(true);
    mockHasPermission.mockReturnValue(false);

    render(<AdminNewDealerPage />);

    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("redirects with router.replace (not push) when the user lacks DEALER_ADMIN_VIEW_ALL", () => {
    mockHasPermission.mockReturnValue(false);
    render(<AdminNewDealerPage />);
    expect(mockReplace).toHaveBeenCalledWith("/dashboard");
    expect(mockPush).not.toHaveBeenCalledWith("/dashboard");
  });

  it("shows a hint instead of a silently-disabled button when there are no active verticals", () => {
    mockHasPermission.mockReturnValue(true);
    // No level=0 categories means no verticals
    mockUseCategories.mockReturnValue({ data: [], isLoading: false });

    render(<AdminNewDealerPage />);

    expect(screen.getByText(/no hay verticals activos/i)).toBeInTheDocument();
  });

  it("renders the form and submits with selected verticals", async () => {
    mockHasPermission.mockReturnValue(true);
    render(<AdminNewDealerPage />);

    fireEvent.change(screen.getByLabelText(/nombre/i), {
      target: { value: "Acme Motors" },
    });
    fireEvent.click(screen.getByLabelText("Vehicles"));
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "owner@x.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /crear/i }));

    await waitFor(() =>
      expect(mockMutate).toHaveBeenCalledWith({
        name: "Acme Motors",
        vertical_ids: ["cat-1"],
        owner_email: "owner@x.com",
      }),
    );
  });
});
