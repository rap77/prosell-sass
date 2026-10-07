/**
 * RoleDetailPanel — bloque 3, items 3.5/3.6. Holds LOCAL edits to
 * grants/scope (the Permisos/Alcance tabs) and commits them together
 * via one PATCH — the backend's UpdateRoleUseCase is a full replace of
 * name/description/grants/scope, same shape the mockup's single
 * "Guardar cambios" button implies. The parent remounts this component
 * (via `key={role.id}`) when the selected role changes, so switching
 * profiles never needs an effect to reset local edits.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RoleDetailPanel } from "./RoleDetailPanel";
import type { Role } from "@/lib/api/schemas/roles";

const mockMutate = vi.fn();
vi.mock("@/lib/api/roles", () => ({
  useUpdateRole: () => ({ mutate: mockMutate, isPending: false }),
}));

vi.mock("@/lib/api/organizations", () => ({
  useOrganizations: () => ({
    data: [{ id: "org-1", name: "AutoMax Rosario" }],
    isLoading: false,
  }),
}));

const ROLE: Role = {
  id: "role-1",
  name: "Manager",
  description: "Perfil de gerencia",
  role_type: "manager",
  is_system_role: true,
  tenant_id: null,
  grants: [{ zone: "catalog", action: "read" }],
  scope: { scope_type: "own", organization_ids: [] },
};

describe("RoleDetailPanel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the role's name and description", () => {
    render(<RoleDetailPanel role={ROLE} />);

    expect(
      screen.getByRole("heading", { name: "Manager" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Perfil de gerencia")).toBeInTheDocument();
  });

  it("disables Guardar cambios until something changes", async () => {
    const user = userEvent.setup();
    render(<RoleDetailPanel role={ROLE} />);

    expect(
      screen.getByRole("button", { name: /guardar cambios/i }),
    ).toBeDisabled();

    await user.click(screen.getByLabelText("catalog:create"));

    expect(
      screen.getByRole("button", { name: /guardar cambios/i }),
    ).toBeEnabled();
  });

  it("saves the full name/description/grants/scope on Guardar cambios", async () => {
    const user = userEvent.setup();
    render(<RoleDetailPanel role={ROLE} />);

    await user.click(screen.getByLabelText("catalog:create"));
    await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

    await waitFor(() => expect(mockMutate).toHaveBeenCalled());
    expect(mockMutate).toHaveBeenCalledWith({
      roleId: "role-1",
      data: {
        name: "Manager",
        description: "Perfil de gerencia",
        grants: [
          { zone: "catalog", action: "read" },
          { zone: "catalog", action: "create" },
        ],
        scope: { scope_type: "own", organization_ids: [] },
      },
    });
  });

  it("saves an edited scope made from the Alcance tab", async () => {
    const user = userEvent.setup();
    render(<RoleDetailPanel role={ROLE} />);

    await user.click(screen.getByRole("tab", { name: "Alcance" }));
    await user.click(
      screen.getByRole("radio", { name: /todas las organizaciones/i }),
    );
    await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

    await waitFor(() => expect(mockMutate).toHaveBeenCalled());
    expect(mockMutate).toHaveBeenCalledWith({
      roleId: "role-1",
      data: {
        name: "Manager",
        description: "Perfil de gerencia",
        grants: ROLE.grants,
        scope: { scope_type: "all", organization_ids: [] },
      },
    });
  });

  it("Cancelar discards local edits", async () => {
    const user = userEvent.setup();
    render(<RoleDetailPanel role={ROLE} />);

    await user.click(screen.getByLabelText("catalog:create"));
    expect(screen.getByLabelText("catalog:create")).toBeChecked();

    await user.click(screen.getByRole("button", { name: /^cancelar$/i }));

    expect(screen.getByLabelText("catalog:create")).not.toBeChecked();
    expect(
      screen.getByRole("button", { name: /guardar cambios/i }),
    ).toBeDisabled();
  });
});
