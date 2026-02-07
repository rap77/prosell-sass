/**
 * RegisterForm Component
 *
 * Registration form with full name, email, password, confirm password, and terms agreement.
 * Integrates with useAuth hook, PasswordInput (x2), and OAuthButtons components.
 *
 * @example
 * ```tsx
 * <RegisterForm />
 * ```
 */
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { PasswordInput } from "./PasswordInput";
import { OAuthButtons } from "./OAuthButtons";
import { cn } from "@/lib/utils";

// ============================================
// SCHEMA & TYPES
// ============================================

const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(1, "Full name is required")
      .min(2, "Full name must be at least 2 characters")
      .max(100, "Full name must be less than 100 characters")
      .trim(),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Invalid email address"),
    password: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters"),
    confirmPassword: z
      .string()
      .min(1, "Confirm password is required"),
    acceptTerms: z
      .boolean()
      .refine((val) => val === true, {
        message: "You must accept the terms and conditions",
      }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

// ============================================
// COMPONENT
// ============================================

/**
 * RegisterForm component for user registration
 *
 * Features:
 * - Full name, email, password, and confirm password validation with Zod
 * - Terms of service and privacy policy agreement checkbox
 * - OAuth registration (Google, Facebook)
 * - Loading states during registration
 * - Error display from auth state
 * - Navigation to login page
 * - Full accessibility support
 */
export function RegisterForm() {
  const { register, isLoading, error, clearError } = useAuth();

  // React Hook Form setup
  const {
    handleSubmit,
    formState: { errors, isSubmitting },
    setError: setFormError,
    register: registerField,
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },
  });

  /**
   * Handle form submission
   */
  const onSubmit = async (data: RegisterFormValues) => {
    // Split fullName into firstName and lastName
    const nameParts = data.fullName.trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    // useAuth.register signature: (email, password, firstName, lastName) => Promise<void>
    await register(data.email.trim(), data.password, firstName, lastName);
  };

  /**
   * Handle input change to clear auth error when user starts typing
   */
  const handleInputChange = () => {
    if (error) {
      clearError();
    }
  };

  // ============================================
  // RENDER
  // ============================================

  const isDisabled = isLoading || isSubmitting;

  return (
    <div className="flex flex-col gap-6">
      {/* Heading */}
      <div className="text-center">
        <h2 id="register-heading" className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Create your account
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Join us today! Please enter your details
        </p>
      </div>

      {/* OAuth Buttons */}
      <OAuthButtons />

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-300 dark:border-slate-700" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white dark:bg-slate-900 px-2 text-slate-500 dark:text-slate-400">
            Or continue with email
          </span>
        </div>
      </div>

      {/* Register Form */}
      <form
        name="register"
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        {/* Full Name Input */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="fullName"
            className="text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Full Name
          </label>
          <input
            {...registerField("fullName", { onChange: handleInputChange })}
            id="fullName"
            type="text"
            placeholder="John Doe"
            autoComplete="name"
            disabled={isDisabled}
            aria-invalid={!!errors.fullName || !!error}
            aria-describedby={
              error ? "register-error" : undefined
            }
            className={cn(
              "w-full px-4 py-2 rounded-lg border",
              "bg-white dark:bg-slate-800",
              "text-slate-900 dark:text-slate-100",
              "placeholder:text-slate-400 dark:placeholder:text-slate-500",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-all duration-200",
              (errors.fullName || error) && "border-red-500 focus:ring-red-500",
              !(errors.fullName || error) && "border-slate-300 dark:border-slate-700"
            )}
          />
          {errors.fullName && (
            <p
              role="alert"
              className="text-sm text-red-500 dark:text-red-400"
            >
              {errors.fullName.message}
            </p>
          )}
        </div>

        {/* Email Input */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="email"
            className="text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Email
          </label>
          <input
            {...registerField("email", { onChange: handleInputChange })}
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            disabled={isDisabled}
            aria-invalid={!!errors.email || !!error}
            aria-describedby={
              error ? "register-error" : undefined
            }
            className={cn(
              "w-full px-4 py-2 rounded-lg border",
              "bg-white dark:bg-slate-800",
              "text-slate-900 dark:text-slate-100",
              "placeholder:text-slate-400 dark:placeholder:text-slate-500",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-all duration-200",
              (errors.email || error) && "border-red-500 focus:ring-red-500",
              !(errors.email || error) && "border-slate-300 dark:border-slate-700"
            )}
          />
          {errors.email && (
            <p
              role="alert"
              className="text-sm text-red-500 dark:text-red-400"
            >
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password Input */}
        <PasswordInput
          label="Password"
          name="password"
          placeholder="Enter your password"
          error={errors.password?.message || null}
          disabled={isDisabled}
          required
          onClearError={handleInputChange}
        />

        {/* Confirm Password Input */}
        <PasswordInput
          label="Confirm Password"
          name="confirmPassword"
          placeholder="Confirm your password"
          error={errors.confirmPassword?.message || null}
          disabled={isDisabled}
          required
          onClearError={handleInputChange}
        />

        {/* Terms and Privacy Checkbox */}
        <div className="flex flex-col gap-2">
          <label className="flex items-start gap-2">
            <input
              {...registerField("acceptTerms")}
              type="checkbox"
              disabled={isDisabled}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              I accept the{" "}
              <Link
                href="/terms"
                className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Terms of Service
              </Link>
              {" "}and{" "}
              <Link
                href="/privacy"
                className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Privacy Policy
              </Link>
            </span>
          </label>
          {errors.acceptTerms && (
            <p
              role="alert"
              className="text-sm text-red-500 dark:text-red-400"
            >
              {errors.acceptTerms.message}
            </p>
          )}
        </div>

        {/* Auth Error */}
        {error && !errors.fullName && !errors.email && !errors.password && !errors.confirmPassword && !errors.acceptTerms && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p id="register-error" role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error.message}
            </p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isDisabled}
          className={cn(
            "w-full py-3 px-4 rounded-lg font-medium",
            "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600",
            "text-white",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-all duration-200"
          )}
        >
          {isLoading ? "Creating account..." : "Create account"}
        </button>
      </form>

      {/* Login Link */}
      <p className="text-center text-sm text-slate-600 dark:text-slate-400">
        Already have an account?{" "}
        <Link
          href="/auth/login"
          className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
