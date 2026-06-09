import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import SettingsSecurityPage from "./page";

const pushMock = vi.fn();
const changePasswordMutateAsync = vi.fn();
const disableTwoFactorMutateAsync = vi.fn();
const updateUserMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    userId: "user-123",
    is2FAEnabled: false,
    updateUser: updateUserMock,
  }),
}));

vi.mock("@/lib/api/userApi", () => ({
  useChangePassword: () => ({
    mutateAsync: changePasswordMutateAsync,
    isPending: false,
  }),
  useDisableTwoFactor: () => ({
    mutateAsync: disableTwoFactorMutateAsync,
    isPending: false,
  }),
  mapSecurityErrorMessage: (message: string) => message,
}));

describe("SettingsSecurityPage", () => {
  beforeEach(() => {
    pushMock.mockReset();
    changePasswordMutateAsync.mockReset();
    disableTwoFactorMutateAsync.mockReset();
    updateUserMock.mockReset();
  });

  it("muestra errores de validación cuando la confirmación no coincide", async () => {
    const user = userEvent.setup();
    render(<SettingsSecurityPage />);

    await user.type(screen.getByLabelText("Contraseña actual"), "Actual123!");
    await user.type(screen.getByLabelText("Nueva contraseña"), "Nueva123!");
    await user.type(
      screen.getByLabelText("Confirmar nueva contraseña"),
      "Otra123!",
    );
    await user.click(
      screen.getByRole("button", { name: "Actualizar contraseña" }),
    );

    expect(
      await screen.findByText(
        "La confirmación no coincide con la nueva contraseña",
      ),
    ).toBeInTheDocument();
    expect(changePasswordMutateAsync).not.toHaveBeenCalled();
  });

  it("redirige a setup-2fa cuando 2FA está deshabilitado", async () => {
    const user = userEvent.setup();
    render(<SettingsSecurityPage />);

    await user.click(screen.getByRole("button", { name: "Habilitar 2FA" }));

    expect(pushMock).toHaveBeenCalledWith("/auth/setup-2fa");
  });
});
