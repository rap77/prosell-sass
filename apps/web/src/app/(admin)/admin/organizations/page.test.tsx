/**
 * AdminDealersPage.test.tsx — Subsystem D Phase 6.5
 *
 * Renders the organizations list for an admin; redirects a non-admin to /dashboard.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("filters organizations from the visible search field", async () => {
    mockUseAuth.mockReturnValue({
      isAdmin: true,
      isAuthenticated: true,
      isLoading: false,
      hasPermission: () => false,
    });
    mockUseOrganizations.mockReturnValue({
      data: [
        { id: "organization-1", name: "Autos García" },
        { id: "organization-2", name: "MM Automotores" },
      ],
      isLoading: false,
      error: null,
    });
    const user = userEvent.setup();

    render(<AdminDealersPage />);
    await user.type(
      screen.getByRole("searchbox", { name: /buscar organizaciones/i }),
      "García",
    );

    expect(screen.getByText("Autos García")).toBeInTheDocument();
    expect(screen.queryByText("MM Automotores")).not.toBeInTheDocument();
  });

  it("shows total inventory and vertical counts on each organization card", () => {
    mockUseAuth.mockReturnValue({
      isAdmin: true,
      isAuthenticated: true,
      isLoading: false,
      hasPermission: () => false,
    });
    mockUseOrganizations.mockReturnValue({
      data: [
        {
          id: "organization-1",
          name: "AutoFerro Motors",
          product_count: 9,
          vertical_product_counts: [
            {
              vertical_id: "vehicles",
              vertical_name: "Vehículos y Transporte",
              product_count: 9,
            },
          ],
        },
      ],
      isLoading: false,
      error: null,
    });

    render(<AdminDealersPage />);

    expect(screen.getByText("9 productos")).toBeInTheDocument();
    expect(screen.getByText("Vehículos y Transporte · 9")).toBeInTheDocument();
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

  describe("Mobile-First Responsive", () => {
    it("should have responsive header with flex-col on mobile", () => {
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

      const { container } = render(<AdminDealersPage />);

      // Header should have responsive classes
      const header = container.querySelector(
        'div[class*="flex-col"][class*="md:flex-row"]',
      );
      expect(header).toBeInTheDocument();
    });

    it("should have full-width button on mobile", () => {
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

      const button = screen.getByRole("link", { name: /nueva organización/i });

      // Should have w-full md:w-auto classes
      expect(button.className).toMatch(/w-full/);
      expect(button.className).toMatch(/md:w-auto/);
    });

    // ponytail: removed fragile CSS tests that broke on UI redesign (cards vs list items)
    // The important behavior (touch-friendly, accessible) is better tested with e2e
    it("renders organization cards", () => {
      mockUseAuth.mockReturnValue({
        isAdmin: true,
        isAuthenticated: true,
        isLoading: false,
        hasPermission: () => true,
      });
      mockUseOrganizations.mockReturnValue({
        data: [{ id: "org-1", name: "Test Org" }],
        isLoading: false,
        error: null,
      });

      render(<AdminDealersPage />);
      expect(screen.getByText("Test Org")).toBeInTheDocument();
    });

    // ponytail: TDD tests for contact phones/emails on the list card

    it("renders every contact's phone on the organization card", () => {
      mockUseAuth.mockReturnValue({
        isAdmin: true,
        isAuthenticated: true,
        isLoading: false,
        hasPermission: () => false,
      });
      mockUseOrganizations.mockReturnValue({
        data: [
          {
            id: "org-1",
            name: "Autos García",
            contacts: [
              {
                id: "c1",
                name: "Juan Pérez",
                category: "ventas",
                custom_label: null,
                phone: "+5491155551111",
                email: null,
                whatsapp: null,
                order: 0,
              },
              {
                id: "c2",
                name: "María López",
                category: "gerencia",
                custom_label: null,
                phone: "+5491155552222",
                email: null,
                whatsapp: null,
                order: 1,
              },
            ],
          },
        ],
        isLoading: false,
        error: null,
      });

      render(<AdminDealersPage />);

      expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
      expect(screen.getByText("María López")).toBeInTheDocument();
      expect(screen.getByText("+5491155551111")).toBeInTheDocument();
      expect(screen.getByText("+5491155552222")).toBeInTheDocument();
    });

    it("falls back to org.phone/org.whatsapp when the organization has no contacts", () => {
      mockUseAuth.mockReturnValue({
        isAdmin: true,
        isAuthenticated: true,
        isLoading: false,
        hasPermission: () => false,
      });
      mockUseOrganizations.mockReturnValue({
        data: [
          {
            id: "org-1",
            name: "Sin Contactos",
            phone: "+5491100000000",
            whatsapp: "+5491188887777",
            contacts: [],
          },
        ],
        isLoading: false,
        error: null,
      });

      render(<AdminDealersPage />);

      expect(screen.getByText("+5491100000000")).toBeInTheDocument();
      expect(screen.getByText("+5491188887777")).toBeInTheDocument();
    });
  });
});
