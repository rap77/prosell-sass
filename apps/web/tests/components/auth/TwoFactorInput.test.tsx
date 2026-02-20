/**
 * TDD: TwoFactorInput Component Tests
 * RED PHASE - Escribir tests ANTES de implementar
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TwoFactorInput } from "@/components/auth/TwoFactorInput";

describe("TwoFactorInput Component", () => {
  beforeEach(() => {
    // Cleanup is handled by afterEach
  });

  afterEach(() => {
    cleanup();
  });

  describe("Basic Rendering", () => {
    it("should render 6 digit input fields", () => {
      render(<TwoFactorInput label="2FA Code" name="totp" />);

      const inputs = screen.getAllByRole("textbox");
      expect(inputs).toHaveLength(6);
    });

    it("should render with provided label", () => {
      render(<TwoFactorInput label="Código 2FA" name="totp" />);

      expect(screen.getByLabelText("Código 2FA")).toBeInTheDocument();
    });

    it("should render all inputs with proper aria-label", () => {
      render(<TwoFactorInput label="2FA Code" name="totp" />);

      // Each input should have an aria-label like "Digit 1 of 6"
      expect(screen.getByLabelText("Digit 1 of 6")).toBeInTheDocument();
      expect(screen.getByLabelText("Digit 2 of 6")).toBeInTheDocument();
      expect(screen.getByLabelText("Digit 3 of 6")).toBeInTheDocument();
      expect(screen.getByLabelText("Digit 4 of 6")).toBeInTheDocument();
      expect(screen.getByLabelText("Digit 5 of 6")).toBeInTheDocument();
      expect(screen.getByLabelText("Digit 6 of 6")).toBeInTheDocument();
    });

    it("should have maxlength of 1 for each input", () => {
      render(<TwoFactorInput label="2FA Code" name="totp" />);

      const inputs = screen.getAllByRole("textbox");
      inputs.forEach((input) => {
        expect(input).toHaveAttribute("maxlength", "1");
      });
    });

    it("should have type='text' and inputmode='numeric' for all inputs", () => {
      render(<TwoFactorInput label="2FA Code" name="totp" />);

      const inputs = screen.getAllByRole("textbox");
      inputs.forEach((input) => {
        expect(input).toHaveAttribute("type", "text");
        expect(input).toHaveAttribute("inputmode", "numeric");
      });
    });
  });

  describe("Auto-focus Behavior", () => {
    it("should auto-focus to next input after typing a digit", async () => {
      const user = userEvent.setup();
      render(<TwoFactorInput label="2FA Code" name="totp" />);

      const firstInput = screen.getByLabelText("Digit 1 of 6");
      const secondInput = screen.getByLabelText("Digit 2 of 6");

      await user.click(firstInput);
      await user.keyboard("1");

      expect(firstInput).toHaveValue("1");
      expect(secondInput).toHaveFocus();
    });

    it("should auto-focus through all 6 inputs", async () => {
      const user = userEvent.setup();
      render(<TwoFactorInput label="2FA Code" name="totp" />);

      const firstInput = screen.getByLabelText("Digit 1 of 6");

      await user.click(firstInput);
      await user.keyboard("123456");

      const sixthInput = screen.getByLabelText("Digit 6 of 6");
      expect(sixthInput).toHaveValue("6");
      expect(sixthInput).toHaveFocus();
    });
  });

  describe("Backspace Behavior", () => {
    it("should clear current input and move to previous on backspace", async () => {
      const user = userEvent.setup();
      render(<TwoFactorInput label="2FA Code" name="totp" />);

      const firstInput = screen.getByLabelText("Digit 1 of 6") as HTMLInputElement;
      const secondInput = screen.getByLabelText("Digit 2 of 6") as HTMLInputElement;

      // Type two digits (auto-focus moves to second input)
      await user.click(firstInput);
      await user.keyboard("12");

      expect(firstInput).toHaveValue("1");
      expect(secondInput).toHaveValue("2");
      // After typing "12", focus should be on third input
      const thirdInput = screen.getByLabelText("Digit 3 of 6");
      expect(thirdInput).toHaveFocus();

      // Press backspace - should clear third and move to second
      await user.keyboard("{Backspace}");

      expect(thirdInput).toHaveValue("");
      expect(secondInput).toHaveFocus();
    });

    it("should clear current input without moving if it's the first input", async () => {
      const user = userEvent.setup();
      render(<TwoFactorInput label="2FA Code" name="totp" />);

      const firstInput = screen.getByLabelText("Digit 1 of 6") as HTMLInputElement;

      await user.click(firstInput);
      await user.keyboard("1");
      await user.keyboard("{Backspace}");

      expect(firstInput).toHaveValue("");
      expect(firstInput).toHaveFocus();
    });

    it("should handle multiple backspaces correctly", async () => {
      const user = userEvent.setup();
      render(<TwoFactorInput label="2FA Code" name="totp" />);

      const firstInput = screen.getByLabelText("Digit 1 of 6") as HTMLInputElement;
      const secondInput = screen.getByLabelText("Digit 2 of 6") as HTMLInputElement;
      const thirdInput = screen.getByLabelText("Digit 3 of 6") as HTMLInputElement;

      // Type three digits (auto-focus through them)
      await user.click(firstInput);
      await user.keyboard("123");

      // After typing "123", focus should be on fourth input
      const fourthInput = screen.getByLabelText("Digit 4 of 6");

      // Press backspace - should clear fourth and move to third
      await user.keyboard("{Backspace}");
      expect(fourthInput).toHaveValue("");
      expect(thirdInput).toHaveFocus();

      // Press backspace again - should clear third and move to second
      await user.keyboard("{Backspace}");
      expect(thirdInput).toHaveValue("");
      expect(secondInput).toHaveFocus();
    });
  });

  describe("Paste Support", () => {
    it("should paste 6-digit code into all inputs", async () => {
      const user = userEvent.setup();
      render(<TwoFactorInput label="2FA Code" name="totp" />);

      const firstInput = screen.getByLabelText("Digit 1 of 6");

      await user.click(firstInput);

      // Create a mock clipboardData
      const mockClipboardData = {
        getData: vi.fn(() => "123456"),
      };

      // Use fireEvent to dispatch paste event
      fireEvent.paste(firstInput, {
        clipboardData: mockClipboardData,
      });

      const inputs = screen.getAllByRole("textbox");
      expect(inputs[0]).toHaveValue("1");
      expect(inputs[1]).toHaveValue("2");
      expect(inputs[2]).toHaveValue("3");
      expect(inputs[3]).toHaveValue("4");
      expect(inputs[4]).toHaveValue("5");
      expect(inputs[5]).toHaveValue("6");
    });

    it("should ignore paste with less than 6 digits", async () => {
      const user = userEvent.setup();
      render(<TwoFactorInput label="2FA Code" name="totp" />);

      const firstInput = screen.getByLabelText("Digit 1 of 6") as HTMLInputElement;

      await user.click(firstInput);

      // Simulate paste with less than 6 digits
      const mockClipboardData = {
        getData: vi.fn(() => "123"),
      };

      fireEvent.paste(firstInput, {
        clipboardData: mockClipboardData,
      });

      // All inputs should remain empty
      const inputs = screen.getAllByRole<HTMLInputElement>("textbox");
      inputs.forEach((input) => {
        expect(input).toHaveValue("");
      });
    });

    it("should ignore paste with non-numeric characters", async () => {
      const user = userEvent.setup();
      render(<TwoFactorInput label="2FA Code" name="totp" />);

      const firstInput = screen.getByLabelText("Digit 1 of 6") as HTMLInputElement;

      await user.click(firstInput);

      // Simulate paste with letters
      const mockClipboardData = {
        getData: vi.fn(() => "abcdef"),
      };

      fireEvent.paste(firstInput, {
        clipboardData: mockClipboardData,
      });

      // All inputs should remain empty
      const inputs = screen.getAllByRole<HTMLInputElement>("textbox");
      inputs.forEach((input) => {
        expect(input).toHaveValue("");
      });
    });
  });

  describe("Value Changes and Callbacks", () => {
    it("should call onChange with complete 6-digit code", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<TwoFactorInput label="2FA Code" name="totp" onChange={handleChange} />);

      const firstInput = screen.getByLabelText("Digit 1 of 6");

      await user.click(firstInput);
      await user.keyboard("123456");

      expect(handleChange).toHaveBeenCalledWith("123456");
    });

    it("should call onChange when last digit is entered", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<TwoFactorInput label="2FA Code" name="totp" onChange={handleChange} />);

      const firstInput = screen.getByLabelText("Digit 1 of 6");

      await user.click(firstInput);
      await user.keyboard("11111"); // First 5 digits

      expect(handleChange).not.toHaveBeenCalled();

      await user.keyboard("2"); // Last digit

      expect(handleChange).toHaveBeenCalledWith("111112");
    });

    it("should call onChange when pasting valid code", async () => {
      const handleChange = vi.fn();
      render(<TwoFactorInput label="2FA Code" name="totp" onChange={handleChange} />);

      const firstInput = screen.getByLabelText("Digit 1 of 6");

      await userEvent.setup().click(firstInput);

      // Simulate paste
      const mockClipboardData = {
        getData: vi.fn(() => "654321"),
      };

      fireEvent.paste(firstInput, {
        clipboardData: mockClipboardData,
      });

      expect(handleChange).toHaveBeenCalledWith("654321");
    });

    it("should NOT call onChange if code is incomplete", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<TwoFactorInput label="2FA Code" name="totp" onChange={handleChange} />);

      const firstInput = screen.getByLabelText("Digit 1 of 6");

      await user.click(firstInput);
      await user.keyboard("12345");

      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should show error message when error prop is provided", () => {
      render(
        <TwoFactorInput
          label="2FA Code"
          name="totp"
          error="Invalid code"
        />
      );

      const errorMessage = screen.getByText("Invalid code");
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveAttribute("role", "alert");
    });

    it("should apply error styling to all inputs when error exists", () => {
      render(
        <TwoFactorInput
          label="2FA Code"
          name="totp"
          error="Invalid code"
        />
      );

      const inputs = screen.getAllByRole("textbox");
      inputs.forEach((input) => {
        expect(input).toHaveClass(/border-destructive/);
      });
    });

    it("should not show error when no error prop provided", () => {
      render(<TwoFactorInput label="2FA Code" name="totp" />);

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("Disabled State", () => {
    it("should render all inputs as disabled when disabled prop is true", () => {
      render(<TwoFactorInput label="2FA Code" name="totp" disabled />);

      const inputs = screen.getAllByRole("textbox");
      inputs.forEach((input) => {
        expect(input).toBeDisabled();
      });
    });

    it("should not allow typing when disabled", async () => {
      const user = userEvent.setup();
      render(<TwoFactorInput label="2FA Code" name="totp" disabled />);

      const firstInput = screen.getByLabelText("Digit 1 of 6") as HTMLInputElement;

      await user.click(firstInput);
      await user.keyboard("1");

      expect(firstInput).toHaveValue("");
    });
  });

  describe("Controlled Component", () => {
    it("should use value from prop when provided", () => {
      render(<TwoFactorInput label="2FA Code" name="totp" value="123456" />);

      const inputs = screen.getAllByRole("textbox");
      expect(inputs[0]).toHaveValue("1");
      expect(inputs[1]).toHaveValue("2");
      expect(inputs[2]).toHaveValue("3");
      expect(inputs[3]).toHaveValue("4");
      expect(inputs[4]).toHaveValue("5");
      expect(inputs[5]).toHaveValue("6");
    });

    it("should update when value prop changes", () => {
      const { rerender } = render(
        <TwoFactorInput label="2FA Code" name="totp" value="111111" />
      );

      const inputs = screen.getAllByRole("textbox");
      expect(inputs[0]).toHaveValue("1");

      rerender(<TwoFactorInput label="2FA Code" name="totp" value="999999" />);

      expect(inputs[0]).toHaveValue("9");
    });

    it("should handle empty value prop", () => {
      render(<TwoFactorInput label="2FA Code" name="totp" value="" />);

      const inputs = screen.getAllByRole<HTMLInputElement>("textbox");
      inputs.forEach((input) => {
        expect(input).toHaveValue("");
      });
    });
  });

  describe("Keyboard Navigation", () => {
    it("should navigate between inputs with arrow keys", async () => {
      const user = userEvent.setup();
      render(<TwoFactorInput label="2FA Code" name="totp" />);

      const firstInput = screen.getByLabelText("Digit 1 of 6");
      const secondInput = screen.getByLabelText("Digit 2 of 6");

      await user.click(firstInput);
      await user.keyboard("{ArrowRight}");

      expect(secondInput).toHaveFocus();

      await user.keyboard("{ArrowLeft}");

      expect(firstInput).toHaveFocus();
    });

    it("should focus inputs manually", async () => {
      const user = userEvent.setup();
      render(<TwoFactorInput label="2FA Code" name="totp" />);

      const sixthInput = screen.getByLabelText("Digit 6 of 6");

      await user.click(sixthInput);

      // This test is just to verify the input is focusable
      expect(sixthInput).toHaveFocus();
    });
  });

  describe("Accessibility", () => {
    it("should have proper aria-describedby for error message", () => {
      render(
        <TwoFactorInput
          label="2FA Code"
          name="totp"
          error="Invalid code"
        />
      );

      const inputs = screen.getAllByRole("textbox");
      const errorMessage = screen.getByRole("alert");

      // At least one input should reference the error message
      const hasErrorReference = inputs.some((input) => {
        const describedBy = input.getAttribute("aria-describedby");
        return describedBy === errorMessage.id;
      });

      expect(hasErrorReference).toBe(true);
    });

    it("should be fully keyboard navigable", async () => {
      const user = userEvent.setup();
      render(<TwoFactorInput label="2FA Code" name="totp" />);

      const firstInput = screen.getByLabelText("Digit 1 of 6");
      const sixthInput = screen.getByLabelText("Digit 6 of 6");

      // Tab through all inputs
      await user.click(firstInput);

      for (let i = 0; i < 5; i++) {
        await user.keyboard("{Tab}");
      }

      expect(sixthInput).toHaveFocus();
    });
  });

  describe("Edge Cases", () => {
    it("should ignore non-numeric input", async () => {
      const user = userEvent.setup();
      render(<TwoFactorInput label="2FA Code" name="totp" />);

      const firstInput = screen.getByLabelText("Digit 1 of 6") as HTMLInputElement;

      await user.click(firstInput);
      await user.keyboard("a");

      expect(firstInput).toHaveValue("");
    });

    it("should replace digit when typing in non-empty input", async () => {
      const user = userEvent.setup();
      render(<TwoFactorInput label="2FA Code" name="totp" />);

      const firstInput = screen.getByLabelText("Digit 1 of 6") as HTMLInputElement;

      await user.click(firstInput);
      await user.keyboard("1");
      expect(firstInput).toHaveValue("1");

      // Clear and type new digit
      await user.click(firstInput);
      await user.keyboard("{Backspace}");
      await user.keyboard("2");

      expect(firstInput).toHaveValue("2");
    });

    it("should handle rapid typing correctly", async () => {
      const user = userEvent.setup();
      render(<TwoFactorInput label="2FA Code" name="totp" />);

      const firstInput = screen.getByLabelText("Digit 1 of 6");

      await user.click(firstInput);
      await user.keyboard("999999");

      const inputs = screen.getAllByRole<HTMLInputElement>("textbox");
      inputs.forEach((input) => {
        expect(input).toHaveValue("9");
      });
    });
  });
});
