/**
 * TDD: ResetPasswordForm Component Tests
 * Updated to match Spanish redesign (ProSell design tokens)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock authApi - use vi.hoisted to avoid hoisting issues
const { resetPasswordMock } = vi.hoisted(() => ({
  resetPasswordMock: vi.fn(),
}));

vi.mock("@/lib/api/authApi", () => ({
  authApi: {
    resetPassword: resetPasswordMock,
  },
}));

import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { authApi } from "@/lib/api/authApi";

const mockResetPassword = resetPasswordMock as ReturnType<typeof vi.fn>;

describe("ResetPasswordForm Component", () => {
  const mockToken = "test-reset-token-123";

  beforeEach(() => {
    cleanup();
    mockResetPassword.mockReset();
    mockResetPassword.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("should render password input", async () => {
      const { container } = render(<ResetPasswordForm token={mockToken} />);

      // Wait for form to render after useEffect
      await waitFor(() => {
        const passwordInput =
          container.querySelector<HTMLInputElement>("#password-password");
        expect(passwordInput).toBeInTheDocument();
      });
    });

    it("should render confirm password input", async () => {
      const { container } = render(<ResetPasswordForm token={mockToken} />);

      // Should have 2 password inputs
      await waitFor(() => {
        const passwordInput =
          container.querySelector<HTMLInputElement>("#password-password");
        const confirmPasswordInput = container.querySelector<HTMLInputElement>(
          "#password-confirmPassword",
        );
        expect(passwordInput).toBeInTheDocument();
        expect(confirmPasswordInput).toBeInTheDocument();
      });
    });

    it("should render submit button", async () => {
      render(<ResetPasswordForm token={mockToken} />);

      expect(
        await screen.findByRole("button", { name: /restablecer contrase/i }),
      ).toBeInTheDocument();
    });
  });

  describe("Token Validation", () => {
    it("should show error when token is missing", async () => {
      render(<ResetPasswordForm token="" />);

      await waitFor(() => {
        expect(screen.getByText(/enlace inv/i)).toBeInTheDocument();
      });
    });

    it("should show error when token is undefined", async () => {
      render(<ResetPasswordForm token={undefined} />);

      await waitFor(() => {
        expect(screen.getByText(/enlace inv/i)).toBeInTheDocument();
      });
    });
  });

  describe("Form Validation", () => {
    it("should show error when password is too short", async () => {
      const { container } = render(<ResetPasswordForm token={mockToken} />);

      // Find inputs by their id
      const passwordInput =
        container.querySelector<HTMLInputElement>("#password-password");
      expect(passwordInput).toBeInTheDocument();
      await userEvent.type(passwordInput!, "short");

      const submitButton = screen.getByRole("button", {
        name: /restablecer contrase/i,
      });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/al menos 8 caracteres/i)).toBeInTheDocument();
      });
    });

    it("should show error when passwords do not match", async () => {
      const { container } = render(<ResetPasswordForm token={mockToken} />);

      const passwordInput =
        container.querySelector<HTMLInputElement>("#password-password");
      expect(passwordInput).toBeInTheDocument();
      await userEvent.type(passwordInput!, "password123");

      const confirmPasswordInput = container.querySelector<HTMLInputElement>(
        "#password-confirmPassword",
      );
      expect(confirmPasswordInput).toBeInTheDocument();
      await userEvent.type(confirmPasswordInput!, "different456");

      const submitButton = screen.getByRole("button", {
        name: /restablecer contrase/i,
      });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/no coinciden/i)).toBeInTheDocument();
      });
    });
  });

  describe("Form Submission", () => {
    it("should call resetPassword with token and password", async () => {
      const { container } = render(<ResetPasswordForm token={mockToken} />);

      const passwordInput =
        container.querySelector<HTMLInputElement>("#password-password");
      expect(passwordInput).toBeInTheDocument();
      await userEvent.type(passwordInput!, "newPassword123");

      const confirmPasswordInput = container.querySelector<HTMLInputElement>(
        "#password-confirmPassword",
      );
      expect(confirmPasswordInput).toBeInTheDocument();
      await userEvent.type(confirmPasswordInput!, "newPassword123");

      const submitButton = screen.getByRole("button", {
        name: /restablecer contrase/i,
      });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(authApi.resetPassword).toHaveBeenCalledWith(
          mockToken,
          "newPassword123",
        );
      });
    });

    it("should show loading state during submission", async () => {
      mockResetPassword.mockImplementation(() => new Promise(() => {}));
      const { container } = render(<ResetPasswordForm token={mockToken} />);

      const passwordInput =
        container.querySelector<HTMLInputElement>("#password-password");
      expect(passwordInput).toBeInTheDocument();
      await userEvent.type(passwordInput!, "newPassword123");

      const confirmPasswordInput = container.querySelector<HTMLInputElement>(
        "#password-confirmPassword",
      );
      expect(confirmPasswordInput).toBeInTheDocument();
      await userEvent.type(confirmPasswordInput!, "newPassword123");

      const submitButton = screen.getByRole("button", {
        name: /restablecer contrase/i,
      });
      await userEvent.click(submitButton);

      expect(
        screen.getByRole("button", { name: /restableciendo/i }),
      ).toBeInTheDocument();
    });
  });

  describe("Success State", () => {
    it("should show success message when password is reset", async () => {
      mockResetPassword.mockResolvedValue(undefined);
      const { container } = render(<ResetPasswordForm token={mockToken} />);

      const passwordInput =
        container.querySelector<HTMLInputElement>("#password-password");
      expect(passwordInput).toBeInTheDocument();
      await userEvent.type(passwordInput!, "newPassword123");

      const confirmPasswordInput = container.querySelector<HTMLInputElement>(
        "#password-confirmPassword",
      );
      expect(confirmPasswordInput).toBeInTheDocument();
      await userEvent.type(confirmPasswordInput!, "newPassword123");

      const submitButton = screen.getByRole("button", {
        name: /restablecer contrase/i,
      });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/contrase.*actualizada/i),
        ).toBeInTheDocument();
      });
    });

    it("should show login link in success state", async () => {
      mockResetPassword.mockResolvedValue(undefined);
      const { container } = render(<ResetPasswordForm token={mockToken} />);

      const passwordInput =
        container.querySelector<HTMLInputElement>("#password-password");
      expect(passwordInput).toBeInTheDocument();
      await userEvent.type(passwordInput!, "newPassword123");

      const confirmPasswordInput = container.querySelector<HTMLInputElement>(
        "#password-confirmPassword",
      );
      expect(confirmPasswordInput).toBeInTheDocument();
      await userEvent.type(confirmPasswordInput!, "newPassword123");

      const submitButton = screen.getByRole("button", {
        name: /restablecer contrase/i,
      });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByRole("link", { name: /iniciar sesi/i }),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Error State", () => {
    it("should show error when token is invalid", async () => {
      mockResetPassword.mockRejectedValue({
        message: "Invalid or expired token",
        status: 400,
      });
      const { container } = render(<ResetPasswordForm token={mockToken} />);

      const passwordInput =
        container.querySelector<HTMLInputElement>("#password-password");
      expect(passwordInput).toBeInTheDocument();
      await userEvent.type(passwordInput!, "newPassword123");

      const confirmPasswordInput = container.querySelector<HTMLInputElement>(
        "#password-confirmPassword",
      );
      expect(confirmPasswordInput).toBeInTheDocument();
      await userEvent.type(confirmPasswordInput!, "newPassword123");

      const submitButton = screen.getByRole("button", {
        name: /restablecer contrase/i,
      });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/invalid or expired token/i),
        ).toBeInTheDocument();
      });
    });

    it("should show generic error on failure", async () => {
      mockResetPassword.mockRejectedValue(new Error("Server error"));
      const { container } = render(<ResetPasswordForm token={mockToken} />);

      const passwordInput =
        container.querySelector<HTMLInputElement>("#password-password");
      expect(passwordInput).toBeInTheDocument();
      await userEvent.type(passwordInput!, "newPassword123");

      const confirmPasswordInput = container.querySelector<HTMLInputElement>(
        "#password-confirmPassword",
      );
      expect(confirmPasswordInput).toBeInTheDocument();
      await userEvent.type(confirmPasswordInput!, "newPassword123");

      const submitButton = screen.getByRole("button", {
        name: /restablecer contrase/i,
      });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Server error/i)).toBeInTheDocument();
      });
    });
  });

  describe("Accessibility", () => {
    it("should have proper heading structure", async () => {
      render(<ResetPasswordForm token={mockToken} />);

      // Wait for useEffect to run and form to render
      await waitFor(
        () => {
          // Component heading is "Nueva contraseña"
          const heading = screen.getByRole("heading", {
            name: /nueva contrase/i,
          });
          expect(heading).toBeInTheDocument();
        },
        { timeout: 5000 },
      );
    });
  });
});
