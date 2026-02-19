/**
 * TDD: LoginForm Component Tests
 * RED PHASE - Escribir tests ANTES de implementar
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, act } from "@testing-library/react";
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

// Mock dynamic OAuthButtons to avoid dynamic import issues in tests
vi.mock("@/components/auth/dynamic/OAuthButtons", () => ({
  OAuthButtons: vi.fn(() => (
    <div className="flex flex-col gap-3 w-full">
      <button
        type="button"
        data-testid="google-oauth-button"
        className="w-full"
      >
        Continue with Google
      </button>
      <button
        type="button"
        data-testid="facebook-oauth-button"
        className="w-full"
      >
        Continue with Facebook
      </button>
    </div>
  )),
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
    it("should render OAuth buttons", async () => {
      render(<LoginForm />);

      // Wait for dynamic OAuth buttons to load
      const oauthButtons = await screen.findByRole("button", { name: /continue with google/i });
      expect(oauthButtons).toBeInTheDocument();

      // Verify divider text is also rendered
      expect(screen.getByText(/or continue with email/i)).toBeInTheDocument();
    });

    it("should render divider between oauth and email login", () => {
      render(<LoginForm />);

      expect(screen.getByText(/or continue with email/i)).toBeInTheDocument();
    });
  });

  describe("Form Validation", () => {
    it("should show error when email is empty", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/^Email$/);
      await user.click(emailInput); // Focus the field
      await user.tab(); // Blur to trigger validation with mode="onBlur"

      expect(await screen.findByText("Email is required")).toBeInTheDocument();
    });

    it("should show error when email is invalid", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/^Email$/);
      await user.type(emailInput, "invalid-email");
      await user.tab(); // Blur to trigger validation with mode="onBlur"

      expect(await screen.findByText("Invalid email address")).toBeInTheDocument();
    });

    it("should show error when password is empty", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      // Fill email first (valid)
      const emailInput = screen.getByLabelText(/^Email$/);
      await user.type(emailInput, "user@example.com");
      await user.tab(); // Blur email field to validate it

      // Touch password field and blur to trigger validation
      const passwordInput = screen.getByLabelText(/Password/); // More flexible matcher
      await user.click(passwordInput);
      await user.type(passwordInput, "a"); // Type something to mark as touched
      await user.clear(passwordInput); // Clear it
      await user.tab(); // Blur to trigger validation with mode="onBlur"

      expect(await screen.findByText("Password is required")).toBeInTheDocument();
    });

    it("should show error when password is too short", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/^Email$/);
      await user.type(emailInput, "user@example.com");

      const passwordInput = screen.getByLabelText(/Password/); // More flexible matcher
      await user.type(passwordInput, "short");
      await user.tab(); // Blur to trigger validation with mode="onBlur"

      expect(await screen.findByText("Password must be at least 8 characters")).toBeInTheDocument();
    });
  });

  describe("Form Submission", () => {
    it("should call login with correct credentials", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/^Email$/);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);

      await user.type(emailInput, "user@example.com");
      await user.type(passwordInput, "Password123!");

      const submitButton = screen.getByRole("button", { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith("user@example.com", "Password123!");
      });
    });

    it("should call login with remember me when checked", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/^Email$/);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      const rememberCheckbox = screen.getByRole("checkbox");

      await user.type(emailInput, "user@example.com");
      await user.type(passwordInput, "Password123!");
      await user.click(rememberCheckbox);

      const submitButton = screen.getByRole("button", { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith("user@example.com", "Password123!");
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

      // Find submit button by text content (more specific than role)
      const submitButton = screen.getByText(/Signing in/i);
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

      const emailInput = screen.getByLabelText(/^Email$/);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);

      // Check that inputs have disabled attribute
      expect(emailInput).toHaveAttribute("disabled");
      expect(passwordInput).toHaveAttribute("disabled");
    });
  });

  describe("Error Handling", () => {
    it("should display error from useAuth", () => {
      (useAuth as any).mockReturnValue({
        login: mockLogin,
        isLoading: false,
        error: { message: "Invalid credentials" },
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

      const emailInput = screen.getByLabelText(/^Email$/);
      await user.click(emailInput); // Focus the field
      await user.tab(); // Blur to trigger validation with mode="onBlur"

      const errorMessage = await screen.findByText("Email is required");

      expect(emailInput).toHaveAttribute("aria-invalid", "true");
      // Check that error message exists and has role="alert"
      expect(errorMessage).toHaveAttribute("role", "alert");
    });
  });

  describe("OAuth Handlers", () => {
    it("should have Google button", () => {
      render(<LoginForm />);

      const googleButton = screen.getByTestId("google-oauth-button");
      expect(googleButton).toBeInTheDocument();
    });

    it("should have Facebook button", () => {
      render(<LoginForm />);

      const facebookButton = screen.getByTestId("facebook-oauth-button");
      expect(facebookButton).toBeInTheDocument();
    });
  });
});
