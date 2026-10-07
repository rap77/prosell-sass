/**
 * CloneRoleDialog — bloque 3, item 3.3/3.5. "Clonar plantilla": picks a
 * source profile (system template or existing custom one) and copies
 * its grants/scope under a new name — the dialog itself only collects
 * the source id + the new identity (name/description).
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CloneRoleDialog } from "./CloneRoleDialog";
import type { Role } from "@/lib/api/schemas/roles";

const mockMutateAsync = vi.fn();
vi.mock("@/lib/api/roles", () => ({
  useCloneRole: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}));

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
    id: "sales-agent",
    name: "Sales Agent",
    description: null,
    role_type: "sales_agent",
    is_system_role: true,
    tenant_id: null,
    grants: [],
    scope: { scope_type: "own", organization_ids: [] },
  },
];

describe("CloneRoleDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clones the selected source profile under the requested name", async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValue({ id: "new-role-1" });
    const onCloned = vi.fn();

    render(<CloneRoleDialog roles={ROLES} onCloned={onCloned} />);

    await user.click(screen.getByRole("button", { name: /clonar plantilla/i }));
    await user.selectOptions(
      screen.getByLabelText(/plantilla de origen/i),
      "sales-agent",
    );
    await user.type(
      screen.getByLabelText(/nombre/i),
      "Agente vendedor Prosell",
    );
    await user.click(screen.getByRole("button", { name: /^clonar$/i }));

    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled());
    expect(mockMutateAsync).toHaveBeenCalledWith({
      sourceRoleId: "sales-agent",
      name: "Agente vendedor Prosell",
      description: undefined,
    });

    await waitFor(() => expect(onCloned).toHaveBeenCalledWith("new-role-1"));
  });

  it("does not submit without a source or a name", async () => {
    const user = userEvent.setup();
    render(<CloneRoleDialog roles={ROLES} onCloned={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /clonar plantilla/i }));
    await user.click(screen.getByRole("button", { name: /^clonar$/i }));

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });
});
