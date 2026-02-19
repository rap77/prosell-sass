/**
 * TwoFactorInput Component
 *
 * A 6-digit input component for two-factor authentication codes.
 * Features auto-focus, paste support, backspace navigation, and full accessibility.
 *
 * @example
 * ```tsx
 * <TwoFactorInput
 *   label="2FA Code"
 *   name="totp"
 *   value={code}
 *   onChange={setCode}
 *   error={error}
 *   required
 * />
 * ```
 */
"use client";

import { useState, useRef, useEffect, type ChangeEvent, type ClipboardEvent, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

export interface TwoFactorInputProps {
  /**
   * Label for the input group (accessible via aria-label)
   */
  label: string;

  /**
   * Name attribute for form submission
   */
  name: string;

  /**
   * Current 6-digit value (controlled component)
   */
  value?: string;

  /**
   * Callback when complete 6-digit code is entered
   */
  onChange?: (value: string) => void;

  /**
   * Error message to display
   */
  error?: string | null;

  /**
   * Disable all inputs
   */
  disabled?: boolean;

  /**
   * Mark as required field
   */
  required?: boolean;

  /**
   * Additional CSS classes for container
   */
  className?: string;
}

// ============================================
// CONSTANTS
// ============================================

const CODE_LENGTH = 6;
const VALID_DIGITS = /^[0-9]$/;

// ============================================
// COMPONENT
// ============================================

/**
 * TwoFactorInput component for 6-digit authentication codes
 *
 * Features:
 * - 6 individual input fields for each digit
 * - Auto-focus to next input after typing
 * - Backspace clears and moves to previous input
 * - Paste support for complete 6-digit codes
 * - Full keyboard navigation (arrow keys)
 * - Accessibility with proper ARIA labels
 * - Error state styling
 * - Controlled and uncontrolled modes
 */
export function TwoFactorInput({
  label,
  name,
  value: controlledValue,
  onChange,
  error = null,
  disabled = false,
  required = false,
  className,
}: TwoFactorInputProps) {
  // Refs for each input
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Local state for all digits
  const [digits, setDigits] = useState<string[]>(() => {
    if (controlledValue === undefined) {
      return Array(CODE_LENGTH).fill("");
    }
    if (controlledValue === "") {
      return Array(CODE_LENGTH).fill("");
    }
    const digits = controlledValue.split("").slice(0, CODE_LENGTH);
    while (digits.length < CODE_LENGTH) {
      digits.push("");
    }
    return digits;
  });

  // Determine if controlled mode
  const isControlled = controlledValue !== undefined;

  // Update local state when controlled value changes
  useEffect(() => {
    if (isControlled) {
      if (controlledValue === "") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDigits(Array(CODE_LENGTH).fill(""));
      } else {
        const newDigits = controlledValue.split("").slice(0, CODE_LENGTH);
        while (newDigits.length < CODE_LENGTH) {
          newDigits.push("");
        }
        setDigits(newDigits);
      }
    }
  }, [isControlled, controlledValue]);

  // Initialize input refs
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, CODE_LENGTH);
  }, []);

  // ============================================
  // HANDLERS
  // ============================================

  /**
   * Handle digit input change
   */
  const handleChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    // Get the input value - with maxLength=1, this will be at most 1 character
    const inputValue = e.target.value;

    // Determine what the new value should be
    let newChar = "";
    if (inputValue.length > 0) {
      const lastChar = inputValue.slice(-1);
      if (VALID_DIGITS.test(lastChar)) {
        newChar = lastChar;
      }
    }

    const newDigits = [...digits];
    newDigits[index] = newChar;

    // Special handling for uncontrolled mode: we need to update state
    // but also allow the input to show the newly typed character
    if (!isControlled) {
      setDigits(newDigits);

      // Check if we have a complete code (no empty strings)
      const hasEmptyDigit = newDigits.some((d) => d === "");
      const code = newDigits.join("");
      if (!hasEmptyDigit && /^\d{6}$/.test(code)) {
        onChange?.(code);
      }

      // Auto-focus next input in uncontrolled mode
      if (index < CODE_LENGTH - 1 && newChar) {
        inputRefs.current[index + 1]?.focus();
      }
      return;
    }

    // Controlled mode
    if (isControlled) {
      // Update local state for immediate UI feedback
      // This keeps the input showing what the user types
      setDigits(newDigits);

      // Notify parent of changes ALWAYS (not just when complete)
      // This allows parent to track partial codes for button enable/disable logic
      const newCode = newDigits.join("");
      onChange?.(newCode);

      // Auto-focus next input when a digit is entered
      if (index < CODE_LENGTH - 1 && newChar) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    // Backspace: clear and move to previous
    if (e.key === "Backspace") {
      const currentInput = inputRefs.current[index];
      if (!currentInput) return;

      if (digits[index] === "" && index > 0) {
        // Move to previous input and clear it
        e.preventDefault();

        const newDigits = [...digits];
        newDigits[index - 1] = "";

        // Always update local state for UI
        setDigits(newDigits);

        // Notify parent in controlled mode
        if (isControlled) {
          onChange?.(newDigits.join(""));
        }

        inputRefs.current[index - 1]?.focus();
      } else if (digits[index] !== "") {
        // Clear current digit
        e.preventDefault();

        const newDigits = [...digits];
        newDigits[index] = "";

        // Always update local state for UI
        setDigits(newDigits);

        // Notify parent in controlled mode
        if (isControlled) {
          onChange?.(newDigits.join(""));
        }
      }

      return;
    }

    // Arrow keys: navigate between inputs
    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
      return;
    }

    if (e.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
      return;
    }
  };

  /**
   * Handle paste event for complete codes
   */
  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();

    const pastedData = e.clipboardData.getData("text");

    // Validate: must be exactly 6 digits
    if (!/^\d{6}$/.test(pastedData)) {
      return;
    }

    const newDigits = pastedData.split("");

    if (isControlled) {
      // In controlled mode, update local state for visual feedback
      setDigits(newDigits);
      // Then call onChange to notify parent
      onChange?.(pastedData);
    } else {
      // In uncontrolled mode, update local state
      setDigits(newDigits);

      // Notify parent of complete code
      onChange?.(pastedData);

      // Focus last input
      inputRefs.current[CODE_LENGTH - 1]?.focus();
    }
  };

  /**
   * Handle focus: select all text for easy replacement
   */
  const handleFocus = (e: ChangeEvent<HTMLInputElement>) => {
    e.target.select();
  };

  // ============================================
  // RENDER
  // ============================================

  const errorId = `error-${name}`;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Label */}
      <label className="text-sm font-medium text-foreground">
        {label}
        {required && (
          <span aria-hidden="true" className="text-destructive ml-1">
            *
          </span>
        )}
      </label>

      {/* 6-digit input grid */}
      <div
        role="group"
        aria-label={label}
        className="grid grid-cols-6 gap-2"
      >
        {Array.from({ length: CODE_LENGTH }).map((_, index) => (
          <input
            key={`${name}-${index}`}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            className={cn(
              // Base styles
              "w-full aspect-square",
              "text-center text-2xl font-bold",
              "rounded-lg border-2",
              "bg-background",
              "text-foreground",
              // Focus states
              "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
              // Transition
              "transition-all duration-200",
              // Disabled state
              "disabled:opacity-50 disabled:cursor-not-allowed",
              // Error state
              error && "border-destructive focus:ring-destructive",
              !error && "border-input"
            )}
            aria-label={`Digit ${index + 1} of ${CODE_LENGTH}`}
            aria-required={required}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            disabled={disabled}
            required={required}
            value={digits[index] || ""}
            onChange={(e) => handleChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            onFocus={handleFocus}
          />
        ))}
      </div>

      {/* Error message */}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-sm text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
}
