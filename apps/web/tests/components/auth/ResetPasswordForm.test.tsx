/**
 * TDD: ResetPasswordForm Component Tests
 * RED PHASE - Escribir tests ANTES de implementar
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
    mockResetPassword.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("should render password input", () => {
      render(<ResetPasswordForm token={mockToken} />);

      expect(screen.getByLabelText(/^New Password$/)).toBeInTheDocument();
    });

    it("should render confirm password input", () => {
      render(<ResetPasswordForm token={mockToken} />);

      expect(screen.getByLabelText(/^Confirm New Password$/)).toBeInTheDocument();
    });

    it("should render submit button", () => {
      render(<ResetPasswordForm token={mockToken} />);

      expect(screen.getByRole("button", { name: /reset password/i })).toBeInTheDocument();
    });
  });

  describe("Token Validation", () => {
    it("should show error when token is missing", async () => {
      render(<ResetPasswordForm token="" />);

      await waitFor(() => {
        expect(screen.getByText(/invalid reset link/i)).toBeInTheDocument();
      });
    });

    it("should show error when token is undefined", async () => {
      render(<ResetPasswordForm token={undefined} />);

      await waitFor(() => {
        expect(screen.getByText(/invalid reset link/i)).toBeInTheDocument();
      });
    });
  });

  describe("Form Validation", () => {
    it("should show error when password is too short", async () => {
      render(<ResetPasswordForm token={mockToken} />);

      const passwordInput = screen.getByLabelText(/^New Password$/);
      await userEvent.type(passwordInput, "short");

      const submitButton = screen.getByRole("button", { name: /reset password/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
      });
    });

    it("should show error when passwords do not match", async () => {
      render(<ResetPasswordForm token={mockToken} />);

      const passwordInput = screen.getByLabelText(/^New Password$/);
      await userEvent.type(passwordInput, "password123");

      const confirmPasswordInput = screen.getByLabelText(/^Confirm New Password$/);
      await userEvent.type(confirmPasswordInput, "different456");

      const submitButton = screen.getByRole("button", { name: /reset password/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
    });
  });

  describe("Form Submission", () => {
    it("should call resetPassword with token and password", async () => {
      render(<ResetPasswordForm token={mockToken} />);

      const passwordInput = screen.getByLabelText(/^New Password$/);
      await userEvent.type(passwordInput, "newPassword123");

      const confirmPasswordInput = screen.getByLabelText(/^Confirm New Password$/);
      await userEvent.type(confirmPasswordInput, "newPassword123");

      const submitButton = screen.getByRole("button", { name: /reset password/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(authApi.resetPassword).toHaveBeenCalledWith(mockToken, "newPassword123");
      });
    });

    it("should show loading state during submission", async () => {
      mockResetPassword.mockImplementation(() => new Promise(() => {}));
      render(<ResetPasswordForm token={mockToken} />);

      const passwordInput = screen.getByLabelText(/^New Password$/);
      await userEvent.type(passwordInput, "newPassword123");

      const confirmPasswordInput = screen.getByLabelText(/^Confirm New Password$/);
      await userEvent.type(confirmPasswordInput, "newPassword123");

      const submitButton = screen.getByRole("button", { name: /reset password/i });
      await userEvent.click(submitButton);

      expect(screen.getByRole("button", { name: /resetting/i })).toBeInTheDocument();
    });
  });

  describe("Success State", () => {
    it("should show success message when password is reset", async () => {
      mockResetPassword.mockResolvedValue(undefined);
      render(<ResetPasswordForm token={mockToken} />);

      const passwordInput = screen.getByLabelText(/^New Password$/);
      await userEvent.type(passwordInput, "newPassword123");

      const confirmPasswordInput = screen.getByLabelText(/^Confirm New Password$/);
      await userEvent.type(confirmPasswordInput, "newPassword123");

      const submitButton = screen.getByRole("button", { name: /reset password/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password reset successfully/i)).toBeInTheDocument();
      });
    });

    it("should show login link in success state", async () => {
      mockResetPassword.mockResolvedValue(undefined);
      render(<ResetPasswordForm token={mockToken} />);

      const passwordInput = screen.getByLabelText(/^New Password$/);
      await userEvent.type(passwordInput, "newPassword123");

      const confirmPasswordInput = screen.getByLabelText(/^Confirm New Password$/);
      await userEvent.type(confirmPasswordInput, "newPassword123");

      const submitButton = screen.getByRole("button", { name: /reset password/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole("link", { name: /log in/i })).toBeInTheDocument();
      });
    });
  });

  describe("Error State", () => {
    it("should show error when token is invalid", async () => {
      mockResetPassword.mockRejectedValue({ message: "Invalid or expired token", status: 400 });
      render(<ResetPasswordForm token={mockToken} />);

      const passwordInput = screen.getByLabelText(/^New Password$/);
      await userEvent.type(passwordInput, "newPassword123");

      const confirmPasswordInput = screen.getByLabelText(/^Confirm New Password$/);
      await userEvent.type(confirmPasswordInput, "newPassword123");

      const submitButton = screen.getByRole("button", { name: /reset password/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid or expired token/i)).toBeInTheDocument();
      });
    });

    it("should show generic error on failure", async () => {
      mockResetPassword.mockRejectedValue(new Error("Server error"));
      render(<ResetPasswordForm token={mockToken} />);

      const passwordInput = screen.getByLabelText(/^New Password$/);
      await userEvent.type(passwordInput, "newPassword123");

      const confirmPasswordInput = screen.getByLabelText(/^Confirm New Password$/);
      await userEvent.type(confirmPasswordInput, "newPassword123");

      const submitButton = screen.getByRole("button", { name: /reset password/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Server error/i)).toBeInTheDocument();
      });
    });
  });

  describe("Accessibility", () => {
    it("should have proper heading structure", () => {
      render(<ResetPasswordForm token={mockToken} />);

      // chadcn/ui CardTitle - search by text
      const heading = screen.getByRole("heading", { name: /reset password/i });
      expect(heading).toBeInTheDocument();
    });
  });
});
