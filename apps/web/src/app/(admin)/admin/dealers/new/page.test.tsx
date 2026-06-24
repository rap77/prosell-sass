import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminNewDealerPage from "./page";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockHasPermission = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ hasPermission: mockHasPermission }),
}));

const mockMutate = vi.fn();
vi.mock("@/lib/api/dealers", () => ({
  useCreateDealer: () => ({ mutate: mockMutate, isPending: false, error: null }),
}));

vi.mock("@/lib/api/categories", () => ({
  useCategories: () => ({
    data: [
      { id: "cat-1", name: "Vehicles" },
      { id: "cat-2", name: "Real Estate" },
    ],
    isLoading: false,
  }),
}));

describe("AdminNewDealerPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects when the user lacks DEALER_ADMIN_VIEW_ALL", () => {
    mockHasPermission.mockReturnValue(false);
    render(<AdminNewDealerPage />);
    expect(mockPush).toHaveBeenCalledWith("/dashboard");
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
