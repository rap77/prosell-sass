/**
 * LoginForm Component
 *
 * Login form with email/password, OAuth options, remember me, and form validation.
 * Integrates with useAuth hook, PasswordInput, and OAuthButtons components.
 *
 * @example
 * ```tsx
 * <LoginForm />
 * ```
 */
"use client";

import { useForm, Controller } from "react-hook-form";
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

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(1, "Password is required").min(8, "Password must be at least 8 characters"),
  rememberMe: z.boolean().optional().default(false),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

// ============================================
// COMPONENT
// ============================================

/**
 * LoginForm component for user authentication
 *
 * Features:
 * - Email and password validation with Zod
 * - Remember me checkbox
 * - OAuth login (Google, GitHub)
 * - Loading states during authentication
 * - Error display from auth state
 * - Navigation to forgot password and register
 * - Full accessibility support
 */
export function LoginForm() {
  const { login, isLoading, error, clearError } = useAuth();

  // React Hook Form setup
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError: setFormError,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  /**
   * Handle form submission
   */
  const onSubmit = async (data: LoginFormValues) => {
    // useAuth.login signature: (email: string, password: string) => Promise<void>
    await login(data.email, data.password);
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
        <h2 id="login-heading" className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Sign in to your account
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Welcome back! Please enter your details
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

      {/* Login Form */}
      <form
        name="login"
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        {/* Email Input */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="email"
            className="text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Email
          </label>
          <input
            {...register("email", { onChange: handleInputChange })}
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            disabled={isDisabled}
            aria-invalid={!!errors.email || !!error}
            aria-describedby={
              error ? "login-error" : undefined
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
        <Controller
          name="password"
          control={control}
          render={({ field, fieldState }) => (
            <PasswordInput
              label="Password"
              name="password"
              placeholder="Enter your password"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message || errors.password?.message || null}
              disabled={isDisabled}
              required
              onClearError={handleInputChange}
            />
          )}
        />

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2">
            <input
              {...register("rememberMe")}
              type="checkbox"
              disabled={isDisabled}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Remember me
            </span>
          </label>

          <Link
            href="/auth/forgot-password"
            className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Forgot password?
          </Link>
        </div>

        {/* Auth Error */}
        {error && !errors.email && !errors.password && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p id="login-error" role="alert" className="text-sm text-red-600 dark:text-red-400">
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
          {isLoading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      {/* Register Link */}
      <p className="text-center text-sm text-slate-600 dark:text-slate-400">
        Don't have an account?{" "}
        <Link
          href="/auth/register"
          className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
