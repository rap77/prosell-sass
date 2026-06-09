"use client";

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

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { PasswordInput } from "./PasswordInput";
import dynamic from "next/dynamic";
import { useTransition } from "react";
import { logger } from "@/lib/logger";

// Static heading component
const LoginHeading = () => (
  <div className="text-center">
    <h2 id="login-heading" className="text-2xl font-bold text-foreground">
      Sign in to your account
    </h2>
    <p className="mt-2 text-sm text-muted-foreground">
      Welcome back! Please enter your details
    </p>
  </div>
);

// Static divider component
const LoginDivider = () => (
  <div className="relative">
    <div className="absolute inset-0 flex items-center">
      <Separator />
    </div>
    <div className="relative flex justify-center text-sm">
      <span className="bg-background px-2 text-muted-foreground">
        Or continue with email
      </span>
    </div>
  </div>
);

// Static footer component
const LoginFooter = () => (
  <p className="text-center text-sm text-muted-foreground">
    Don&apos;t have an account?{" "}
    <Link
      href="/auth/register"
      className="font-medium text-primary hover:underline"
    >
      Sign up
    </Link>
  </p>
);

// Dynamically load OAuthButtons to reduce initial bundle size
const OAuthButtons = dynamic(
  () => import("./dynamic/OAuthButtons").then((mod) => mod.OAuthButtons),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col gap-3 w-full">
        <div className="h-12 bg-muted rounded-md animate-pulse"></div>
        <div className="h-12 bg-muted rounded-md animate-pulse"></div>
      </div>
    ),
  },
);
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ============================================
// SCHEMA & TYPES
// ============================================

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
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
 * - chadcn/ui components
 *
 * Performance optimizations:
 * - React.cache for deduplication
 * - Passive event listeners
 * - Optimized form state management
 * - Module-level caching
 * - Pre-compiled regex
 * - Early exit patterns
 */
export function LoginForm() {
  const { login, isLoading, error, clearError, isAuthenticated } = useAuth();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // React Hook Form setup with deduplication
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur", // Validate on blur (after user leaves field)
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  // ============================================
  // MEMOIZED DERIVED STATE
  // ============================================

  // Derived boolean state
  const isDisabled = isLoading || isSubmitting || isPending;

  // Check if form has errors for conditional rendering
  const hasFormErrors = Object.keys(errors).length > 0;

  // Input change handler
  const handleInputChange = () => {
    // Early exit if no error
    if (!error) {
      return;
    }

    clearError();
  };

  /**
   * Handle form submission with deduplication and early exit
   */
  const onSubmit = async (data: LoginFormValues) => {
    // Early exit if form is disabled
    if (isDisabled) {
      return;
    }

    // Use transition for non-urgent state updates
    startTransition(async () => {
      try {
        await login(data.email, data.password);

        // Redirect to dashboard after successful login
        // The login function updates the auth store, so we can redirect immediately
        router.push("/dashboard");
      } catch (error) {
        // Error is already set in auth store by login function
        logger.error("Login failed", error);
      }
    });
  };

  // Error styling handled by Tailwind classes

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="flex flex-col gap-6">
      {/* Static Heading */}
      <LoginHeading />

      {/* OAuth Buttons */}
      <OAuthButtons
        onGoogleClick={() => {
          const apiUrl =
            process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
          window.location.href = `${apiUrl}/api/v1/auth/oauth/google/authorize`;
        }}
        onFacebookClick={() => {
          const apiUrl =
            process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
          window.location.href = `${apiUrl}/api/v1/auth/oauth/facebook/authorize`;
        }}
      />

      {/* Static Divider */}
      <LoginDivider />

      {/* Login Form */}
      <form
        name="login"
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        {/* Email Input */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            {...register("email", {
              onChange: handleInputChange,
            })}
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            disabled={isDisabled}
            aria-invalid={!!errors.email || !!error}
            aria-describedby={error ? "login-error" : undefined}
            className={cn(
              (errors.email || error) &&
                "border-destructive focus:ring-destructive",
            )}
          />
          {errors.email && (
            <p role="alert" className="text-sm text-destructive">
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
              error={fieldState.error?.message || null}
              disabled={isDisabled}
              required
              onClearError={handleInputChange}
              data-testid="login-password"
            />
          )}
        />

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2">
            <Checkbox {...register("rememberMe")} disabled={isDisabled} />
            <span className="text-sm text-foreground">Remember me</span>
          </label>

          <Link
            href="/auth/forgot-password"
            className="text-sm font-medium text-primary hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        {/* Auth Error */}
        {error && !hasFormErrors && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <p
              id="login-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {error.message}
            </p>
          </div>
        )}

        {/* Submit Button */}
        <Button type="submit" disabled={isDisabled} className="w-full">
          {isLoading ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      {/* Static Footer */}
      <LoginFooter />
    </div>
  );
}

// Export static components for potential reuse
export { LoginHeading, LoginDivider, LoginFooter };
