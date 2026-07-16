import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { Permission } from "@/lib/auth/permissions";

// Mock Next.js usePathname
vi.mock("next/navigation", () => ({
  usePathname: () => "/catalog",
}));

// Mock useAuth hook
vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({
    user: {
      id: "1",
      email: "john@example.com",
      first_name: "John",
      last_name: "Doe",
      role: "Seller",
    },
    isAuthenticated: false,
    isLoading: false,
    hasPermission: vi.fn(() => false),
  })),
}));

// Mock Zustand store
vi.mock("@/lib/stores/layoutStore", () => ({
  useLayoutStore: vi.fn(() => ({
    sidebarCollapsed: false,
    toggleSidebar: vi.fn(),
  })),
}));

describe("Sidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset useAuth to default mock (seller without permissions)
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "1",
        email: "john@example.com",
        first_name: "John",
        last_name: "Doe",
        role: "Seller",
      },
      isAuthenticated: false,
      isLoading: false,
      hasPermission: vi.fn(() => false),
    } as unknown as ReturnType<typeof useAuth>);
  });

  it("renders navigation groups (Inventario, Ventas, Configuración)", () => {
    // ponytail: need SETTINGS_READ permission for configuración group
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "1",
        email: "admin@example.com",
        first_name: "Admin",
        last_name: "User",
        role: "admin",
      },
      isAuthenticated: true,
      isLoading: false,
      hasPermission: vi.fn((p: Permission) => p === Permission.SETTINGS_READ),
    } as unknown as ReturnType<typeof useAuth>);

    render(<Sidebar groups={["inventario", "ventas", "configuración"]} />);

    expect(screen.getAllByText("Inventario").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ventas").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Configuración").length).toBeGreaterThan(0);
  });

  it("filters navigation by user role (seller excludes Configuración)", () => {
    render(<Sidebar groups={["inventario", "ventas"]} />);

    expect(screen.getByText("Inventario")).toBeInTheDocument();
    expect(screen.getByText("Ventas")).toBeInTheDocument();
    expect(screen.queryByText("Configuración")).not.toBeInTheDocument();
  });

  it("shows only Inventario group for limited role", () => {
    render(<Sidebar groups={["inventario"]} />);

    expect(screen.getByText("Inventario")).toBeInTheDocument();
    expect(screen.queryByText("Ventas")).not.toBeInTheDocument();
    expect(screen.queryByText("Configuración")).not.toBeInTheDocument();
  });

  it("renders navigation items within groups", () => {
    render(<Sidebar groups={["inventario"]} />);

    expect(screen.getByText("Catálogo")).toBeInTheDocument();
    expect(screen.getByText("Publicaciones")).toBeInTheDocument();
  });

  it("uses corrected Spanish terminology (not Operations/Growth)", () => {
    // ponytail: need SETTINGS_READ permission for configuración group
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "1",
        email: "admin@example.com",
        first_name: "Admin",
        last_name: "User",
        role: "admin",
      },
      isAuthenticated: true,
      isLoading: false,
      hasPermission: vi.fn((p: Permission) => p === Permission.SETTINGS_READ),
    } as unknown as ReturnType<typeof useAuth>);

    render(<Sidebar groups={["inventario", "ventas", "configuración"]} />);

    // Verify correct terms are present (Configuración appears twice: as group header and as nav item)
    expect(screen.getAllByText("Inventario").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ventas").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Configuración").length).toBeGreaterThan(0);

    // Verify incorrect terms are NOT present
    expect(screen.queryByText("Operations")).not.toBeInTheDocument();
    expect(screen.queryByText("Growth")).not.toBeInTheDocument();
    expect(screen.queryByText("System")).not.toBeInTheDocument();
  });

  it("highlights active route", () => {
    render(<Sidebar groups={["inventario"]} />);

    const catalogLink = screen.getByText("Catálogo").closest("a");
    expect(catalogLink).toHaveStyle({
      background: "var(--ps-nav-active-bg)",
      color: "var(--ps-text-primary)",
    });
  });

  it("renders collapse toggle button", () => {
    render(<Sidebar groups={["inventario"]} />);

    const toggleButton = screen.getByLabelText(/collapse sidebar/i);
    expect(toggleButton).toBeInTheDocument();
  });

  it("renders footer with user info", () => {
    render(<Sidebar groups={["inventario"]} />);

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Seller")).toBeInTheDocument();
  });

  it("renders ProSell logo when expanded", () => {
    render(<Sidebar groups={["inventario"]} />);

    expect(screen.getByText("ProSell")).toBeInTheDocument();
  });

  it("exposes the sidebar as a labeled complementary landmark", () => {
    render(<Sidebar groups={["inventario"]} />);

    // A11y: when this sidebar coexists with FilterSidebar, an unlabeled
    // <aside> announces only "complementary" — indistinguishable. The
    // accessible name lets screen-reader users tell the landmarks apart.
    // Named "Sidebar" (not "Main navigation") to avoid colliding with the
    // inner <nav aria-label="Main navigation"> landmark it contains.
    expect(
      screen.getByRole("complementary", { name: /^sidebar$/i }),
    ).toBeInTheDocument();
  });

  describe("Subsystem D Phase 5.3 — concesionarios group permission gate", () => {
    it("shows Organizaciones when the user has ORG_ADMIN_VIEW_ALL", () => {
      vi.mocked(useAuth).mockReturnValue({
        user: {
          id: "1",
          email: "admin@example.com",
          first_name: "Admin",
          last_name: "User",
          role: "admin",
        },
        isAuthenticated: true,
        isLoading: false,
        hasPermission: vi.fn(
          (permission: Permission) =>
            permission === Permission.ORG_ADMIN_VIEW_ALL,
        ),
      } as unknown as ReturnType<typeof useAuth>);

      render(
        <Sidebar
          groups={["general", "inventario", "ventas", "concesionarios"]}
        />,
      );

      expect(screen.getAllByText("Organizaciones").length).toBeGreaterThan(0);
    });

    it("excludes Organizaciones when the user lacks ORG_ADMIN_VIEW_ALL, even if the group is requested", () => {
      vi.mocked(useAuth).mockReturnValue({
        user: {
          id: "1",
          email: "seller@example.com",
          first_name: "Seller",
          last_name: "User",
          role: "sales_user",
        },
        isAuthenticated: true,
        isLoading: false,
        hasPermission: vi.fn(() => false),
      } as unknown as ReturnType<typeof useAuth>);

      render(
        <Sidebar
          groups={["general", "inventario", "ventas", "concesionarios"]}
        />,
      );

      expect(screen.queryByText("Organizaciones")).not.toBeInTheDocument();
    });
  });
});
