/**
 * TDD: ForgotPasswordForm Component Tests
 * RED PHASE - Escribir tests ANTES de implementar
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock authApi - use vi.hoisted to avoid hoisting issues
const { forgotPasswordMock } = vi.hoisted(() => ({
  forgotPasswordMock: vi.fn(),
}));

vi.mock("@/lib/api/authApi", () => ({
  authApi: {
    forgotPassword: forgotPasswordMock,
  },
}));

import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { authApi } from "@/lib/api/authApi";

const mockForgotPassword = forgotPasswordMock as ReturnType<typeof vi.fn>;

describe("ForgotPasswordForm Component", () => {
  beforeEach(() => {
    mockForgotPassword.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("should render email input", () => {
      render(<ForgotPasswordForm />);

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    it("should render submit button", () => {
      render(<ForgotPasswordForm />);

      expect(screen.getByRole("button", { name: /send reset link/i })).toBeInTheDocument();
    });

    it("should render back to login link", () => {
      render(<ForgotPasswordForm />);

      expect(screen.getByRole("link", { name: /back to login/i })).toBeInTheDocument();
    });
  });

  describe("Form Validation", () => {
    it("should show error when email is empty", async () => {
      render(<ForgotPasswordForm />);

      const submitButton = screen.getByRole("button", { name: /send reset link/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
    });

    it("should show error when email is invalid on submit", async () => {
      render(<ForgotPasswordForm />);

      const emailInput = screen.getByLabelText(/email/i);
      await userEvent.type(emailInput, "invalid-email");

      const submitButton = screen.getByRole("button", { name: /send reset link/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Invalid email/i)).toBeInTheDocument();
      });
    });
  });

  describe("Form Submission", () => {
    it("should call forgotPassword with email on submit", async () => {
      render(<ForgotPasswordForm />);

      const emailInput = screen.getByLabelText(/email/i);
      await userEvent.type(emailInput, "test@example.com");

      const submitButton = screen.getByRole("button", { name: /send reset link/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(authApi.forgotPassword).toHaveBeenCalledWith("test@example.com");
      });
    });

    it("should show loading state during submission", async () => {
      mockForgotPassword.mockImplementation(() => new Promise(() => {}));
      render(<ForgotPasswordForm />);

      const emailInput = screen.getByLabelText(/email/i);
      await userEvent.type(emailInput, "test@example.com");

      const submitButton = screen.getByRole("button", { name: /send reset link/i });
      await userEvent.click(submitButton);

      expect(screen.getByRole("button", { name: /sending/i })).toBeInTheDocument();
    });
  });

  describe("Success State", () => {
    it("should show success message when email is sent", async () => {
      mockForgotPassword.mockResolvedValue(undefined);
      render(<ForgotPasswordForm />);

      const emailInput = screen.getByLabelText(/email/i);
      await userEvent.type(emailInput, "test@example.com");

      const submitButton = screen.getByRole("button", { name: /send reset link/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/we sent a password reset link/i)).toBeInTheDocument();
    });

    it("should show link to login in success state", async () => {
      mockForgotPassword.mockResolvedValue(undefined);
      render(<ForgotPasswordForm />);

      const emailInput = screen.getByLabelText(/email/i);
      await userEvent.type(emailInput, "test@example.com");

      const submitButton = screen.getByRole("button", { name: /send reset link/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole("link", { name: /back to login/i })).toBeInTheDocument();
      });
    });
  });

  describe("Error State", () => {
    it("should show error when forgotPassword fails", async () => {
      mockForgotPassword.mockRejectedValue({ message: "User not found", status: 404 });
      render(<ForgotPasswordForm />);

      const emailInput = screen.getByLabelText(/email/i);
      await userEvent.type(emailInput, "nonexistent@example.com");

      const submitButton = screen.getByRole("button", { name: /send reset link/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/user not found/i)).toBeInTheDocument();
      });
    });

    it("should show generic error on network failure", async () => {
      mockForgotPassword.mockRejectedValue(new Error("Network error"));
      render(<ForgotPasswordForm />);

      const emailInput = screen.getByLabelText(/email/i);
      await userEvent.type(emailInput, "test@example.com");

      const submitButton = screen.getByRole("button", { name: /send reset link/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      });
    });
  });

  describe("Accessibility", () => {
    it("should have proper heading structure", () => {
      render(<ForgotPasswordForm />);

      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toBeInTheDocument();
    });

    it("should have proper form labels", () => {
      render(<ForgotPasswordForm />);

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute("name", "email");
      expect(emailInput).toHaveAttribute("type", "email");
    });
  });

  describe("User Actions", () => {
    it("should navigate to login when clicking back link", () => {
      render(<ForgotPasswordForm />);

      const backLink = screen.getByRole("link", { name: /back to login/i });
      expect(backLink).toHaveAttribute("href", "/auth/login");
    });

    it("should allow resending email after success", async () => {
      mockForgotPassword.mockResolvedValue(undefined);
      render(<ForgotPasswordForm />);

      // Submit once
      const emailInput = screen.getByLabelText(/email/i);
      await userEvent.type(emailInput, "test@example.com");

      const submitButton = screen.getByRole("button", { name: /send reset link/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      });

      // Should have option to send again
      expect(screen.queryByRole("button", { name: /send another/i })).toBeInTheDocument();
    });
  });
});
