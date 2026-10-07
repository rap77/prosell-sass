/**
 * AdminRolesPage.test.tsx — bloque 3, item 3.5.
 *
 * Renders the permission-profiles screen for an admin; redirects a
 * non-admin to /dashboard (useRequireAdmin, UI-only — the real boundary
 * is the server-side roles:read grant).
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach, describe, it, expect } from "vitest";
import AdminRolesPage from "./page";

const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseRoles = vi.fn();
vi.mock("@/lib/api/roles", () => ({
  useRoles: () => mockUseRoles(),
  useCreateRole: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCloneRole: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateRole: () => ({ mutate: vi.fn(), isPending: false }),
}));

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

const ROLES = [
  {
    id: "manager",
    name: "Manager",
    description: "Perfil de gerencia",
    role_type: "manager",
    is_system_role: true,
    tenant_id: null,
    grants: [],
    scope: { scope_type: "own", organization_ids: [] },
  },
  {
    id: "custom-1",
    name: "Agente vendedor Prosell",
    description: null,
    role_type: null,
    is_system_role: false,
    tenant_id: "org-1",
    grants: [],
    scope: { scope_type: "explicit", organization_ids: ["org-1"] },
  },
];

describe("AdminRolesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects a non-admin to /dashboard", async () => {
    mockUseAuth.mockReturnValue({
      isAdmin: false,
      isAuthenticated: true,
      isLoading: false,
    });
    mockUseRoles.mockReturnValue({ data: [], isLoading: false, error: null });

    render(<AdminRolesPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("renders the profile list and selects the first one by default", () => {
    mockUseAuth.mockReturnValue({
      isAdmin: true,
      isAuthenticated: true,
      isLoading: false,
    });
    mockUseRoles.mockReturnValue({
      data: ROLES,
      isLoading: false,
      error: null,
    });

    render(<AdminRolesPage />);

    expect(
      screen.getByRole("heading", { name: "Manager" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Agente vendedor Prosell/ }),
    ).toBeInTheDocument();
    // Detail panel shows the first role's description by default.
    expect(screen.getByText("Perfil de gerencia")).toBeInTheDocument();
  });

  it("shows the clicked role's detail when selected", async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({
      isAdmin: true,
      isAuthenticated: true,
      isLoading: false,
    });
    mockUseRoles.mockReturnValue({
      data: ROLES,
      isLoading: false,
      error: null,
    });

    render(<AdminRolesPage />);

    await user.click(screen.getByText("Agente vendedor Prosell"));

    expect(
      screen.getByRole("heading", { name: "Agente vendedor Prosell" }),
    ).toBeInTheDocument();
  });

  it("shows a loading state while roles are being fetched", () => {
    mockUseAuth.mockReturnValue({
      isAdmin: true,
      isAuthenticated: true,
      isLoading: false,
    });
    mockUseRoles.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(<AdminRolesPage />);

    expect(screen.getByText(/cargando perfiles/i)).toBeInTheDocument();
  });
});
