/**
 * TDD: LoginForm Component Tests
 * RED PHASE - Escribir tests ANTES de implementar
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "@/components/auth/LoginForm";

// Mock useAuth hook
const mockLogin = vi.fn();
const mockClearError = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({
    login: mockLogin,
    isLoading: false,
    error: null,
    clearError: mockClearError,
  })),
}));

// Import mocked hook after mock is set up
import { useAuth } from "@/hooks/useAuth";

describe("LoginForm Component", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // Reset mocks before each test
  beforeEach(() => {
    mockLogin.mockResolvedValue(undefined);
    mockLogin.mockClear();
    mockClearError.mockClear();
    (useAuth as any).mockReturnValue({
      login: mockLogin,
      isLoading: false,
      error: null,
      clearError: mockClearError,
    });
  });

  describe("Basic Rendering", () => {
    it("should render email input", () => {
      render(<LoginForm />);

      expect(screen.getByLabelText(/^Email$/)).toBeInTheDocument();
    });

    it("should render password input", () => {
      render(<LoginForm />);

      // PasswordInput has label "Password"
      const passwordLabel = screen.getByText("Password");
      expect(passwordLabel).toBeInTheDocument();
    });

    it("should render login button", () => {
      render(<LoginForm />);

      expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    });

    it("should render remember me checkbox", () => {
      render(<LoginForm />);

      expect(screen.getByRole("checkbox")).toBeInTheDocument();
      expect(screen.getByLabelText(/^Remember me$/)).toBeInTheDocument();
    });

    it("should render forgot password link", () => {
      render(<LoginForm />);

      const forgotLink = screen.getByRole("link", { name: /forgot password/i });
      expect(forgotLink).toBeInTheDocument();
      expect(forgotLink).toHaveAttribute("href", "/auth/forgot-password");
    });

    it("should render register link", () => {
      render(<LoginForm />);

      const registerLink = screen.getByRole("link", { name: /sign up/i });
      expect(registerLink).toBeInTheDocument();
      expect(registerLink).toHaveAttribute("href", "/auth/register");
    });
  });

  describe("OAuth Integration", () => {
    it("should render OAuth buttons", () => {
      render(<LoginForm />);

      expect(screen.getByRole("button", { name: /continue with google/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /continue with facebook/i })).toBeInTheDocument();
    });

    it("should render divider between oauth and email login", () => {
      render(<LoginForm />);

      expect(screen.getByText(/or continue with/i)).toBeInTheDocument();
    });
  });

  describe("Form Validation", () => {
    it("should show error when email is empty", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const submitButton = screen.getByRole("button", { name: /sign in/i });
      await user.click(submitButton);

      expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    });

    it("should show error when email is invalid", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/^Email$/);
      await user.type(emailInput, "invalid-email");

      const submitButton = screen.getByRole("button", { name: /sign in/i });
      await user.click(submitButton);

      expect(await screen.findByText(/invalid email/i)).toBeInTheDocument();
    });

    it("should show error when password is empty", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/^Email$/);
      await user.type(emailInput, "user@example.com");

      const submitButton = screen.getByRole("button", { name: /sign in/i });
      await user.click(submitButton);

      expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
    });

    it("should show error when password is too short", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/^Email$/);
      await user.type(emailInput, "user@example.com");

      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      await user.type(passwordInput, "12345");

      const submitButton = screen.getByRole("button", { name: /sign in/i });
      await user.click(submitButton);

      expect(await screen.findByText(/password must be at least/i)).toBeInTheDocument();
    });
  });

  describe("Form Submission", () => {
    it("should call login with correct credentials", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/^Email$/);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);

      await user.type(emailInput, "user@example.com");
      await user.type(passwordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith("user@example.com", "password123");
      });
    });

    it("should call login with remember me when checked", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/^Email$/);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      const rememberCheckbox = screen.getByRole("checkbox");

      await user.type(emailInput, "user@example.com");
      await user.type(passwordInput, "password123");
      await user.click(rememberCheckbox);

      const submitButton = screen.getByRole("button", { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith("user@example.com", "password123");
      });
    });

    it("should not call login when validation fails", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const submitButton = screen.getByRole("button", { name: /sign in/i });
      await user.click(submitButton);

      expect(mockLogin).not.toHaveBeenCalled();
    });
  });

  describe("Loading State", () => {
    it("should disable submit button when loading", () => {
      (useAuth as any).mockReturnValue({
        login: mockLogin,
        isLoading: true,
        error: null,
        clearError: mockClearError,
      });

      render(<LoginForm />);

      const submitButton = screen.getByRole("button", { name: /sign in/i });
      expect(submitButton).toBeDisabled();
    });

    it("should show loading text when loading", () => {
      (useAuth as any).mockReturnValue({
        login: mockLogin,
        isLoading: true,
        error: null,
        clearError: mockClearError,
      });

      render(<LoginForm />);

      expect(screen.getByText(/Signing in/i)).toBeInTheDocument();
    });

    it("should disable inputs when loading", () => {
      (useAuth as any).mockReturnValue({
        login: mockLogin,
        isLoading: true,
        error: null,
        clearError: mockClearError,
      });

      render(<LoginForm />);

      expect(screen.getByLabelText(/^Email$/)).toBeDisabled();
      expect(screen.getByPlaceholderText(/enter your password/i)).toBeDisabled();
    });
  });

  describe("Error Handling", () => {
    it("should display error from useAuth", () => {
      (useAuth as any).mockReturnValue({
        login: mockLogin,
        isLoading: false,
        error: "Invalid credentials",
        clearError: mockClearError,
      });

      render(<LoginForm />);

      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });

    it("should clear error when user starts typing", async () => {
      (useAuth as any).mockReturnValue({
        login: mockLogin,
        isLoading: false,
        error: "Invalid credentials",
        clearError: mockClearError,
      });

      const user = userEvent.setup();
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/^Email$/);
      await user.type(emailInput, "u");

      expect(mockClearError).toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("should have proper heading", () => {
      render(<LoginForm />);

      expect(screen.getByRole("heading", { level: 2, name: /sign in to your account/i })).toBeInTheDocument();
    });

    it("should have proper form structure", () => {
      render(<LoginForm />);

      // Look for the form element (not all forms have accessible names)
      const form = screen.getByRole("form");
      expect(form).toBeInTheDocument();
    });

    it("should associate error messages with inputs", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const submitButton = screen.getByRole("button", { name: /sign in/i });
      await user.click(submitButton);

      const emailInput = screen.getByLabelText(/^Email$/);
      const errorMessage = await screen.findByText(/email is required/i);

      expect(emailInput).toHaveAttribute("aria-invalid", "true");
      expect(emailInput).toHaveAttribute("aria-describedby", errorMessage.id);
    });
  });

  describe("OAuth Handlers", () => {
    it("should have Google button", () => {
      render(<LoginForm />);

      const googleButton = screen.getByRole("button", { name: /continue with google/i });
      expect(googleButton).toBeInTheDocument();
    });

    it("should have Facebook button", () => {
      render(<LoginForm />);

      const facebookButton = screen.getByRole("button", { name: /continue with facebook/i });
      expect(facebookButton).toBeInTheDocument();
    });
  });
});
