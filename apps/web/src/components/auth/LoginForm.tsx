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
 * - chadcn/ui components
 */
export function LoginForm() {
  const { login, isLoading, error, clearError } = useAuth();

  // React Hook Form setup
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
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
        <h2 id="login-heading" className="text-2xl font-bold text-foreground">
          Sign in to your account
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Welcome back! Please enter your details
        </p>
      </div>

      {/* OAuth Buttons */}
      <OAuthButtons />

      {/* Divider */}
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

      {/* Login Form */}
      <form
        name="login"
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        {/* Email Input */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            {...register("email", { onChange: handleInputChange })}
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            disabled={isDisabled}
            aria-invalid={!!errors.email || !!error}
            aria-describedby={error ? "login-error" : undefined}
            className={cn(
              (errors.email || error) && "border-destructive focus:ring-destructive"
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
            />
          )}
        />

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2">
            <Checkbox
              {...register("rememberMe")}
              disabled={isDisabled}
            />
            <span className="text-sm text-foreground">
              Remember me
            </span>
          </label>

          <Link
            href="/auth/forgot-password"
            className="text-sm font-medium text-primary hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        {/* Auth Error */}
        {error && !errors.email && !errors.password && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <p id="login-error" role="alert" className="text-sm text-destructive">
              {error.message}
            </p>
          </div>
        )}

        {/* Submit Button */}
        <Button type="submit" disabled={isDisabled} className="w-full">
          {isLoading ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      {/* Register Link */}
      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/auth/register"
          className="font-medium text-primary hover:underline"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
