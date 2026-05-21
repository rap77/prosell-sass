/**
 * TDD: PasswordInput Component Tests
 * RED PHASE - Escribir tests ANTES de implementar
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PasswordInput } from "@/components/auth/PasswordInput";

describe("PasswordInput Component", () => {
  beforeEach(() => {
    // Cleanup is handled by afterEach
  });

  afterEach(() => {
    cleanup();
  });

  describe("Basic Rendering", () => {
    it("should render password input with type='password'", () => {
      render(<PasswordInput label="Password" name="password" />);

      const input = screen.getByLabelText("Password");
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("type", "password");
    });

    it("should render with provided label", () => {
      render(<PasswordInput label="Contraseña" name="password" />);

      expect(screen.getByLabelText("Contraseña")).toBeInTheDocument();
    });

    it("should render with placeholder when provided", () => {
      render(
        <PasswordInput
          label="Password"
          name="password"
          placeholder="Enter your password"
        />,
      );

      expect(
        screen.getByPlaceholderText("Enter your password"),
      ).toBeInTheDocument();
    });

    it("should be accessible via name attribute", () => {
      render(<PasswordInput label="Password" name="user_password" />);

      const input = screen.getByLabelText("Password");
      expect(input).toHaveAttribute("name", "user_password");
    });
  });

  describe("Show/Hide Password Toggle", () => {
    it("should render eye icon button for toggle", () => {
      render(<PasswordInput label="Password" name="password" />);

      const toggleButton = screen.getByRole("button", {
        name: /show password/i,
      });
      expect(toggleButton).toBeInTheDocument();
    });

    it("should show password when eye icon is clicked", async () => {
      const user = userEvent.setup();
      render(<PasswordInput label="Password" name="password" />);

      const input = screen.getByLabelText("Password");
      const toggleButton = screen.getByRole("button", {
        name: /show password/i,
      });

      expect(input).toHaveAttribute("type", "password");

      await user.click(toggleButton);

      expect(input).toHaveAttribute("type", "text");
      expect(toggleButton).toHaveAttribute("aria-label", "Hide password");
    });

    it("should hide password when eye-off icon is clicked", async () => {
      const user = userEvent.setup();
      render(<PasswordInput label="Password" name="password" />);

      const input = screen.getByLabelText("Password");
      const toggleButton = screen.getByRole("button", {
        name: /show password/i,
      });

      // First click to show
      await user.click(toggleButton);
      expect(input).toHaveAttribute("type", "text");

      // Second click to hide
      await user.click(toggleButton);
      expect(input).toHaveAttribute("type", "password");
      expect(toggleButton).toHaveAttribute("aria-label", "Show password");
    });

    it("should maintain input value when toggling visibility", async () => {
      const user = userEvent.setup();
      render(<PasswordInput label="Password" name="password" />);

      const input = screen.getByLabelText("Password") as HTMLInputElement;
      const toggleButton = screen.getByRole("button", {
        name: /show password/i,
      });

      await user.type(input, "mypassword123");
      expect(input).toHaveValue("mypassword123");

      await user.click(toggleButton);
      expect(input).toHaveValue("mypassword123");
      expect(input).toHaveAttribute("type", "text");

      await user.click(toggleButton);
      expect(input).toHaveValue("mypassword123");
      expect(input).toHaveAttribute("type", "password");
    });
  });

  describe("Password Strength Indicator", () => {
    it("should not show strength indicator when disabled", () => {
      render(
        <PasswordInput label="Password" name="password" showStrength={false} />,
      );

      expect(screen.queryByTestId("password-strength")).not.toBeInTheDocument();
    });

    it("should show weak strength for short passwords", async () => {
      const user = userEvent.setup();
      render(<PasswordInput label="Password" name="password" showStrength />);

      const input = screen.getByLabelText("Password");

      await user.type(input, "abc");

      const strengthIndicator = screen.getByTestId("password-strength");
      expect(strengthIndicator).toBeInTheDocument();
      expect(strengthIndicator).toHaveTextContent(/débil/i);
    });

    it("should show medium strength for moderate passwords", async () => {
      const user = userEvent.setup();
      render(<PasswordInput label="Password" name="password" showStrength />);

      const input = screen.getByLabelText("Password");

      await user.type(input, "Abc12345");

      const strengthIndicator = screen.getByTestId("password-strength");
      expect(strengthIndicator).toHaveTextContent(/media/i);
    });

    it("should show strong strength for complex passwords", async () => {
      const user = userEvent.setup();
      render(<PasswordInput label="Password" name="password" showStrength />);

      const input = screen.getByLabelText("Password");

      await user.type(input, "Str0ng!Pass@2026");

      const strengthIndicator = screen.getByTestId("password-strength");
      expect(strengthIndicator).toHaveTextContent(/fuerte/i);
    });

    it("should update strength indicator in real-time", async () => {
      const user = userEvent.setup();
      render(<PasswordInput label="Password" name="password" showStrength />);

      const input = screen.getByLabelText("Password");

      // Start with weak - type first, then query
      await user.type(input, "abc");
      const strengthIndicator = screen.getByTestId("password-strength");
      expect(strengthIndicator).toHaveTextContent(/débil/i);

      // Add more characters
      await user.type(input, "12345");
      expect(strengthIndicator).toHaveTextContent(/media/i);
    });
  });

  describe("Error Handling", () => {
    it("should not show error when no error prop provided", () => {
      render(<PasswordInput label="Password" name="password" />);

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.queryByText(/required/i)).not.toBeInTheDocument();
    });

    it("should show error message when error prop is provided", () => {
      render(
        <PasswordInput
          label="Password"
          name="password"
          error="Password is required"
        />,
      );

      const errorMessage = screen.getByText("Password is required");
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveAttribute("role", "alert");
    });

    it("should apply error styling when error exists", () => {
      render(
        <PasswordInput
          label="Password"
          name="password"
          error="Password is required"
        />,
      );

      const input = screen.getByLabelText("Password");
      expect(input).toHaveClass(/border-destructive/);
    });

    it("should clear error when user starts typing", async () => {
      const onClearError = vi.fn();
      const user = userEvent.setup();

      render(
        <PasswordInput
          label="Password"
          name="password"
          error="Password is required"
          onClearError={onClearError}
        />,
      );

      const input = screen.getByLabelText("Password");

      await user.type(input, "a");

      expect(onClearError).toHaveBeenCalled();
    });
  });

  describe("React Hook Form Integration", () => {
    it("should forward ref correctly", () => {
      const ref = { current: null as HTMLInputElement | null };

      render(<PasswordInput label="Password" name="password" ref={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });

    it("should call onChange with value", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(
        <PasswordInput
          label="Password"
          name="password"
          onChange={handleChange}
        />,
      );

      const input = screen.getByLabelText("Password");

      await user.type(input, "a");

      expect(handleChange).toHaveBeenCalled();
    });

    it("should call onBlur when input loses focus", async () => {
      const user = userEvent.setup();
      const handleBlur = vi.fn();

      render(
        <PasswordInput label="Password" name="password" onBlur={handleBlur} />,
      );

      const input = screen.getByLabelText("Password");

      input.focus();
      await user.tab();

      expect(handleBlur).toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("should have proper aria-label on toggle button", () => {
      render(<PasswordInput label="Password" name="password" />);

      const toggleButton = screen.getByRole("button", {
        name: /show password/i,
      });
      expect(toggleButton).toHaveAttribute("aria-label", "Show password");
    });

    it("should update aria-label when toggling visibility", async () => {
      const user = userEvent.setup();
      render(<PasswordInput label="Password" name="password" />);

      const toggleButton = screen.getByRole("button", {
        name: /show password/i,
      });

      await user.click(toggleButton);

      expect(toggleButton).toHaveAttribute("aria-label", "Hide password");
    });

    it("should associate error message with input using aria-describedby", () => {
      render(
        <PasswordInput
          label="Password"
          name="password"
          error="Password is required"
        />,
      );

      const input = screen.getByLabelText("Password");
      const errorMessage = screen.getByRole("alert");

      const describedBy = input.getAttribute("aria-describedby");
      expect(describedBy).toBe(errorMessage.id);
    });

    it("should be keyboard navigable", async () => {
      const user = userEvent.setup();
      render(<PasswordInput label="Password" name="password" />);

      const input = screen.getByLabelText("Password");

      input.focus();
      expect(input).toHaveFocus();

      // Tab to toggle button
      await user.tab();

      const toggleButton = screen.getByRole("button", {
        name: /show password/i,
      });
      expect(toggleButton).toHaveFocus();
    });
  });

  describe("Disabled State", () => {
    it("should render as disabled when disabled prop is true", () => {
      render(<PasswordInput label="Password" name="password" disabled />);

      const input = screen.getByLabelText("Password");
      expect(input).toBeDisabled();
    });

    it("should not allow typing when disabled", async () => {
      const user = userEvent.setup();
      render(<PasswordInput label="Password" name="password" disabled />);

      const input = screen.getByLabelText("Password") as HTMLInputElement;

      await user.type(input, "abc");

      expect(input).toHaveValue("");
    });

    it("should disable toggle button when input is disabled", () => {
      render(<PasswordInput label="Password" name="password" disabled />);

      const toggleButton = screen.getByRole("button", {
        name: /show password/i,
      });
      expect(toggleButton).toBeDisabled();
    });
  });

  describe("Required Field", () => {
    it("should show required indicator when required", () => {
      render(<PasswordInput label="Password" name="password" required />);

      const requiredIndicator = screen.getByText("*");
      expect(requiredIndicator).toBeInTheDocument();
    });

    it("should have aria-required attribute when required", () => {
      render(<PasswordInput label="Password" name="password" required />);

      // Query by id which is derived from name
      const input = document.getElementById(
        "password-password",
      ) as HTMLInputElement;
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("aria-required", "true");
    });
  });
});
