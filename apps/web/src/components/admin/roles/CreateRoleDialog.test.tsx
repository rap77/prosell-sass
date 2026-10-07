/**
 * CreateRoleDialog — bloque 3, item 3.5. "Nuevo perfil": creates a bare
 * custom profile (name/description only — grants/scope are configured
 * afterward in the detail panel's Permisos/Alcance tabs).
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CreateRoleDialog } from "./CreateRoleDialog";

const mockMutateAsync = vi.fn();
vi.mock("@/lib/api/roles", () => ({
  useCreateRole: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}));

describe("CreateRoleDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a profile with only name/description and reports the new id", async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValue({ id: "new-role-1" });
    const onCreated = vi.fn();

    render(<CreateRoleDialog onCreated={onCreated} />);

    await user.click(screen.getByRole("button", { name: /nuevo perfil/i }));
    await user.type(screen.getByLabelText(/nombre/i), "Supervisor de ventas");
    await user.type(
      screen.getByLabelText(/descripción/i),
      "Para supervisores regionales",
    );
    await user.click(screen.getByRole("button", { name: /^crear perfil$/i }));

    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled());
    expect(mockMutateAsync).toHaveBeenCalledWith({
      name: "Supervisor de ventas",
      description: "Para supervisores regionales",
    });

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith("new-role-1"));
  });

  it("does not submit with an empty name", async () => {
    const user = userEvent.setup();
    render(<CreateRoleDialog onCreated={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /nuevo perfil/i }));
    await user.click(screen.getByRole("button", { name: /^crear perfil$/i }));

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });
});
