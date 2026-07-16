/**
 * AdminDealersPage.test.tsx — Subsystem D Phase 6.5
 *
 * Renders the organizations list for an admin; redirects a non-admin to /dashboard.
 */
import { render, screen, waitFor } from "@testing-library/react";
import { vi, beforeEach, describe, it, expect } from "vitest";
import AdminDealersPage from "./page";

const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseOrganizations = vi.fn();
vi.mock("@/lib/api/organizations", () => ({
  useOrganizations: () => mockUseOrganizations(),
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
    // ponytail: useRequireAdmin only redirects when authenticated AND not admin
    mockUseAuth.mockReturnValue({
      isAdmin: false,
      isAuthenticated: true,
      isLoading: false,
      hasPermission: () => false,
    });
    mockUseOrganizations.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(<AdminDealersPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("renders the organizations list for an admin", async () => {
    mockUseAuth.mockReturnValue({
      isAdmin: true,
      isAuthenticated: true,
      isLoading: false,
      hasPermission: () => false,
    });
    mockUseOrganizations.mockReturnValue({
      data: [
        { id: "organization-1", name: "Organization One" },
        { id: "organization-2", name: "Organization Two" },
      ],
      isLoading: false,
      error: null,
    });

    render(<AdminDealersPage />);

    expect(screen.getByText("Organization One")).toBeInTheDocument();
    expect(screen.getByText("Organization Two")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("links each organization to its detail page", async () => {
    mockUseAuth.mockReturnValue({
      isAdmin: true,
      isAuthenticated: true,
      isLoading: false,
      hasPermission: () => false,
    });
    mockUseOrganizations.mockReturnValue({
      data: [{ id: "organization-1", name: "Organization One" }],
      isLoading: false,
      error: null,
    });

    render(<AdminDealersPage />);

    const link = screen.getByText("Organization One").closest("a");
    expect(link).toHaveAttribute("href", "/admin/organizations/organization-1");
  });

  it("links to /admin/organizations/new when the user can create organizations", () => {
    mockUseAuth.mockReturnValue({
      isAdmin: true,
      isAuthenticated: true,
      isLoading: false,
      hasPermission: () => true,
    });
    mockUseOrganizations.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(<AdminDealersPage />);

    expect(
      screen.getByRole("link", { name: /nueva organización/i }),
    ).toHaveAttribute("href", "/admin/organizations/new");
  });

  it("hides the entry point when the user lacks the permission", () => {
    mockUseAuth.mockReturnValue({
      isAdmin: true,
      isAuthenticated: true,
      isLoading: false,
      hasPermission: () => false,
    });
    mockUseOrganizations.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(<AdminDealersPage />);

    expect(
      screen.queryByRole("link", { name: /nueva organización/i }),
    ).not.toBeInTheDocument();
  });
});
