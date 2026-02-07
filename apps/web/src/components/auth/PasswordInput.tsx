/**
 * PasswordInput Component
 *
 * A password input field with show/hide toggle and optional strength indicator.
 * Fully accessible with ARIA labels and keyboard navigation.
 *
 * @example
 * ```tsx
 * <PasswordInput
 *   label="Password"
 *   name="password"
 *   placeholder="Enter your password"
 *   showStrength
 *   error={errors.password?.message}
 *   required
 * />
 * ```
 */
"use client";

import { useState, forwardRef, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

export interface PasswordInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  /**
   * Label for the input (accessible via aria-label)
   */
  label: string;

  /**
   * Error message to display
   */
  error?: string | null;

  /**
   * Show password strength indicator
   */
  showStrength?: boolean;

  /**
   * Callback to clear error when user starts typing
   */
  onClearError?: () => void;
}

// ============================================
// PASSWORD STRENGTH CALCULATION
// ============================================

type PasswordStrength = "weak" | "medium" | "strong";

function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return "weak";
  }

  let score = 0;

  // Length check
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;

  // Character variety
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 2) {
    return "weak";
  } else if (score <= 4) {
    return "medium";
  }
  return "strong";
}

function getStrengthColor(strength: PasswordStrength): string {
  const COLORS = {
    weak: "bg-red-500",
    medium: "bg-yellow-500",
    strong: "bg-green-500",
  } as const;

  return COLORS[strength];
}

function getStrengthText(strength: PasswordStrength): string {
  const TEXTS = {
    weak: "Weak",
    medium: "Medium",
    strong: "Strong",
  } as const;

  return TEXTS[strength];
}

// ============================================
// COMPONENT
// ============================================

/**
 * PasswordInput component with show/hide toggle and optional strength indicator
 *
 * Features:
 * - Show/hide password toggle with eye icon
 * - Optional password strength indicator
 * - Error display with ARIA attributes
 * - Full keyboard navigation
 * - React Hook Form compatible (ref forwarding)
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      label,
      name,
      placeholder,
      error = null,
      showStrength = false,
      onClearError,
      disabled = false,
      required = false,
      value: controlledValue,
      onChange,
      onBlur,
      className,
      ...props
    },
    ref
  ) => {
    // Local state for visibility toggle
    const [isVisible, setIsVisible] = useState(false);

    // Local state for uncontrolled input
    const [uncontrolledValue, setUncontrolledValue] = useState("");

    // Determine if controlled or uncontrolled
    const isControlled = controlledValue !== undefined;

    // Get current value
    const currentValue = isControlled ? controlledValue : uncontrolledValue;

    // Calculate strength from current value
    // Convert to string as controlledValue can be string | number
    const strength = calculatePasswordStrength(String(currentValue || ""));

    // Toggle visibility
    const toggleVisibility = () => {
      setIsVisible((prev) => !prev);
    };

    // Handle input change
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;

      // Update uncontrolled state if needed
      if (!isControlled) {
        setUncontrolledValue(newValue);
      }

      onChange?.(e);

      // Clear error when user starts typing
      if (error && onClearError) {
        onClearError();
      }
    };

    // Generate unique IDs for ARIA attributes
    const inputId = `password-${name}`;
    const errorId = `error-${name}`;
    const strengthId = `strength-${name}`;

    // Described by for accessibility
    const ariaDescribedBy = [
      error ? errorId : null,
      showStrength ? strengthId : null,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className="flex flex-col gap-2">
        {/* Label with required indicator */}
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          {label}
          {required && (
            <span aria-hidden="true" className="text-red-500 ml-1">
              *
            </span>
          )}
        </label>

        {/* Input wrapper with toggle button */}
        <div className="relative">
          <input
            {...props}
            id={inputId}
            name={name}
            type={isVisible ? "text" : "password"}
            placeholder={placeholder}
            value={currentValue}
            onChange={handleChange}
            onBlur={onBlur}
            disabled={disabled}
            required={required}
            aria-required={required}
            aria-describedby={ariaDescribedBy || undefined}
            aria-invalid={!!error}
            ref={ref}
            className={cn(
              // Base styles
              "w-full px-4 py-2 pr-12 rounded-lg border",
              "bg-white dark:bg-slate-800",
              "text-slate-900 dark:text-slate-100",
              "placeholder:text-slate-400 dark:placeholder:text-slate-500",
              // Focus states
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
              // Disabled state
              "disabled:opacity-50 disabled:cursor-not-allowed",
              // Error state
              error && "border-red-500 focus:ring-red-500",
              // Default border
              !error && "border-slate-300 dark:border-slate-700",
              className
            )}
          />

          {/* Toggle visibility button */}
          <button
            type="button"
            onClick={toggleVisibility}
            disabled={disabled}
            aria-label={isVisible ? "Hide password" : "Show password"}
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2",
              "p-1 rounded transition-colors",
              "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
              "focus:outline-none focus:ring-2 focus:ring-blue-500",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-slate-500"
            )}
          >
            {isVisible ? (
              <EyeOff className="w-5 h-5" aria-hidden="true" />
            ) : (
              <Eye className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Error message */}
        {error && (
          <p
            id={errorId}
            role="alert"
            className="text-sm text-red-500 dark:text-red-400"
          >
            {error}
          </p>
        )}

        {/* Password strength indicator */}
        {showStrength && currentValue && (
          <div
            id={strengthId}
            data-testid="password-strength"
            className="flex items-center gap-2"
          >
            {/* Strength bar */}
            <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-300",
                  getStrengthColor(strength),
                  strength === "weak" && "w-1/3",
                  strength === "medium" && "w-2/3",
                  strength === "strong" && "w-full"
                )}
              />
            </div>

            {/* Strength text */}
            <span
              className={cn(
                "text-xs font-medium uppercase",
                strength === "weak" && "text-red-500",
                strength === "medium" && "text-yellow-500",
                strength === "strong" && "text-green-500"
              )}
            >
              {getStrengthText(strength)}
            </span>
          </div>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";
