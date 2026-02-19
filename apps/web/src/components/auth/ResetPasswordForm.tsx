"use client";

/**
 * ResetPasswordForm Component
 *
 * Handles password reset flow with token from URL.
 * Uses chadcn/ui components.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authApi } from "@/lib/api/authApi";
import { getErrorMessage } from "@/lib/utils/error";
import { PasswordInput } from "./PasswordInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// Zod schema for form validation
const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

type FormState = "idle" | "loading" | "success" | "error";

interface ResetPasswordFormProps {
  token?: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<boolean>(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onTouched",
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Validate token on mount
  useEffect(() => {
    if (!token || token.trim() === "") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTokenError(true);
    }
  }, [token]);

  const onSubmit = async (data: ResetPasswordFormValues) => {
    // Check token validity
    if (!token || token.trim() === "") {
      setTokenError(true);
      return;
    }

    setFormState("loading");
    setErrorMessage(null);

    try {
      await authApi.resetPassword(token, data.password);
      setFormState("success");
    } catch (err) {
      setFormState("error");
      setErrorMessage(getErrorMessage(err, "Unable to reset password. Please try again."));
    }
  };

  // Token error state
  if (tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <Card>
            <CardContent className="pt-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg
                    className="w-8 h-8 text-red-600 dark:text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>

                {/* Use h2 for proper heading order after h1 (sr-only) */}
                <h2 className="text-3xl font-semibold leading-none tracking-tight mb-2">
                  Invalid Reset Link
                </h2>

                <CardDescription className="mb-8">
                  The password reset link is invalid or has expired. Please request a new one.
                </CardDescription>

                <div className="flex flex-col gap-4">
                  <Button asChild>
                    <Link href="/auth/forgot-password">
                      Request New Reset Link
                    </Link>
                  </Button>

                  <Button variant="outline" asChild>
                    <Link href="/auth/login">
                      Back to Login
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Success state
  if (formState === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <Card>
            <CardContent className="pt-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg
                    className="w-8 h-8 text-green-600 dark:text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>

                {/* Use h2 for proper heading order after h1 (sr-only) */}
                <h2 className="text-3xl font-semibold leading-none tracking-tight mb-2">
                  Password Reset Successful
                </h2>

                <CardDescription className="mb-8">
                  Your password has been successfully reset. You can now sign in with your new password.
                </CardDescription>

                <Button asChild className="w-full">
                  <Link href="/auth/login">
                    Continue to Login
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Form state
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Card>
          <CardHeader>
            {/* Use h2 for proper heading order after h1 (sr-only) */}
            <h2 className="text-3xl font-semibold leading-none tracking-tight">
              Reset Your Password
            </h2>
            <CardDescription>
              Enter your new password below.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Error message */}
            {formState === "error" && errorMessage && (
              <div
                className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-md"
                role="alert"
              >
                <p className="text-sm text-destructive">{errorMessage}</p>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Password input */}
              <Controller
                name="password"
                control={control}
                render={({ field, fieldState }) => (
                  <PasswordInput
                    label="New Password"
                    name="password"
                    placeholder="Enter your new password"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={fieldState.error?.message || null}
                    disabled={isSubmitting || formState === "loading"}
                    required
                  />
                )}
              />

              {/* Confirm password input */}
              <Controller
                name="confirmPassword"
                control={control}
                render={({ field, fieldState }) => (
                  <PasswordInput
                    label="Confirm New Password"
                    name="confirmPassword"
                    placeholder="Confirm your new password"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={fieldState.error?.message || null}
                    disabled={isSubmitting || formState === "loading"}
                    required
                  />
                )}
              />

              {/* Submit button */}
              <Button
                type="submit"
                disabled={isSubmitting || formState === "loading"}
                className="w-full"
              >
                {formState === "loading" ? "Resetting..." : "Reset Password"}
              </Button>

              {/* Back to login link */}
              <div className="text-center">
                <Link
                  href="/auth/login"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Back to Login
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
