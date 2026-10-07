/**
 * RolesListPanel — bloque 3, item 3.5.
 *
 * Search + list of permission profiles. Pure presentational component:
 * receives the already-fetched roles, filters by name internally, and
 * reports selection up via onSelect.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { RolesListPanel } from "./RolesListPanel";
import type { Role } from "@/lib/api/schemas/roles";

const ROLES: Role[] = [
  {
    id: "manager",
    name: "Manager",
    description: null,
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

describe("RolesListPanel", () => {
  it("renders a card per role with its name, kind badge, and scope label", () => {
    render(
      <RolesListPanel roles={ROLES} selectedId={null} onSelect={vi.fn()} />,
    );

    expect(screen.getByText("Manager")).toBeInTheDocument();
    expect(screen.getByText("Plantilla")).toBeInTheDocument();
    expect(screen.getByText("Propia organización")).toBeInTheDocument();

    expect(screen.getByText("Agente vendedor Prosell")).toBeInTheDocument();
    expect(screen.getByText("Personalizado")).toBeInTheDocument();
    expect(screen.getByText("Organizaciones específicas")).toBeInTheDocument();
  });

  it("filters the list by name as the user types", async () => {
    const user = userEvent.setup();
    render(
      <RolesListPanel roles={ROLES} selectedId={null} onSelect={vi.fn()} />,
    );

    await user.type(screen.getByPlaceholderText("Buscar perfil..."), "agente");

    expect(screen.queryByText("Manager")).not.toBeInTheDocument();
    expect(screen.getByText("Agente vendedor Prosell")).toBeInTheDocument();
  });

  it("calls onSelect with the role id when a card is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <RolesListPanel roles={ROLES} selectedId={null} onSelect={onSelect} />,
    );

    await user.click(screen.getByText("Manager"));

    expect(onSelect).toHaveBeenCalledWith("manager");
  });

  it("marks the selected card as current", () => {
    render(
      <RolesListPanel roles={ROLES} selectedId="manager" onSelect={vi.fn()} />,
    );

    expect(screen.getByTestId("role-card-manager")).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByTestId("role-card-custom-1")).toHaveAttribute(
      "aria-current",
      "false",
    );
  });

  it("shows an empty state when the search matches nothing", async () => {
    const user = userEvent.setup();
    render(
      <RolesListPanel roles={ROLES} selectedId={null} onSelect={vi.fn()} />,
    );

    await user.type(screen.getByPlaceholderText("Buscar perfil..."), "zzz");

    expect(screen.getByText(/no se encontraron perfiles/i)).toBeInTheDocument();
  });
});
