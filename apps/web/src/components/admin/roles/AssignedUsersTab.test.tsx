/**
 * AssignedUsersTab — bloque 3, item 3.6 ("Usuarios asignados" tab).
 * Lists users already assigned a profile (GET /{role_id}/users, added
 * this item — no prior endpoint exposed role->users) and assigns a new
 * one by exact email (GET /admin/users/by-email, also added this item —
 * no search/listing endpoint for users exists yet, scoped deliberately).
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AssignedUsersTab } from "./AssignedUsersTab";

const mockUseRoleUsers = vi.fn();
const mockRemoveMutate = vi.fn();
const mockAssignMutate = vi.fn();
const mockLookupMutate = vi.fn();
let lookupState: { data: unknown; isPending: boolean } = {
  data: undefined,
  isPending: false,
};

vi.mock("@/lib/api/roles", () => ({
  useRoleUsers: () => mockUseRoleUsers(),
  useRemoveRoleFromUser: () => ({ mutate: mockRemoveMutate, isPending: false }),
  useAssignRoleToUser: () => ({ mutate: mockAssignMutate, isPending: false }),
  useLookupUserByEmail: () => ({
    mutate: mockLookupMutate,
    data: lookupState.data,
    isPending: lookupState.isPending,
  }),
}));

describe("AssignedUsersTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lookupState = { data: undefined, isPending: false };
    mockUseRoleUsers.mockReturnValue({
      data: [
        {
          id: "user-1",
          email: "a@b.com",
          full_name: "A B",
          tenant_id: "org-1",
        },
      ],
      isLoading: false,
    });
  });

  it("lists the assigned users with a Quitar button each", () => {
    render(<AssignedUsersTab roleId="role-1" />);

    expect(screen.getByText("A B")).toBeInTheDocument();
    expect(screen.getByText("a@b.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /quitar/i })).toBeInTheDocument();
  });

  it("removes the user when Quitar is clicked", async () => {
    const user = userEvent.setup();
    render(<AssignedUsersTab roleId="role-1" />);

    await user.click(screen.getByRole("button", { name: /quitar/i }));

    expect(mockRemoveMutate).toHaveBeenCalledWith({
      roleId: "role-1",
      userId: "user-1",
    });
  });

  it("searches by email and offers to assign the match", async () => {
    const user = userEvent.setup();
    render(<AssignedUsersTab roleId="role-1" />);

    await user.type(
      screen.getByPlaceholderText(/buscar usuario por email/i),
      "nuevo@test.local",
    );
    await user.click(screen.getByRole("button", { name: /^buscar$/i }));

    expect(mockLookupMutate).toHaveBeenCalledWith("nuevo@test.local");
  });

  it("shows an Asignar confirmation once the lookup finds a match", async () => {
    const user = userEvent.setup();
    lookupState = {
      data: {
        id: "user-2",
        email: "nuevo@test.local",
        full_name: "Nueva Persona",
      },
      isPending: false,
    };
    render(<AssignedUsersTab roleId="role-1" />);

    expect(screen.getByText("Nueva Persona")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^asignar$/i }));

    expect(mockAssignMutate).toHaveBeenCalledWith({
      roleId: "role-1",
      userId: "user-2",
    });
  });

  it("shows a not-found message when the lookup resolves to null", () => {
    lookupState = { data: null, isPending: false };
    render(<AssignedUsersTab roleId="role-1" />);

    expect(
      screen.getByText(/no se encontró ningún usuario/i),
    ).toBeInTheDocument();
  });
});
