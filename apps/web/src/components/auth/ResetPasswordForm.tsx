"use client";

/**
 * ResetPasswordForm Component
 *
 * Handles password reset flow with token from URL.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authApi } from "@/lib/api/authApi";
import { PasswordInput } from "./PasswordInput";

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
    register,
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
      if (err && typeof err === "object" && "status" in err) {
        const errorObj = err as { status?: number; message?: string };
        setErrorMessage(errorObj.message || "Unable to reset password. Please try again.");
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Unable to reset password. Please try again.");
      }
    }
  };

  // Token error state
  if (tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
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

              <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
                Invalid Reset Link
              </h1>

              <p className="text-gray-600 dark:text-gray-400 mb-8">
                The password reset link is invalid or has expired. Please request a new one.
              </p>

              <div className="flex flex-col gap-4">
                <Link
                  href="/auth/forgot-password"
                  className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Request New Reset Link
                </Link>

                <Link
                  href="/auth/login"
                  className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Back to Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (formState === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
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

              <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
                Password Reset Successfully!
              </h1>

              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Your password has been updated. You can now log in with your new password.
              </p>

              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Log In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Form state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
              Reset Your Password
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Enter your new password below.
            </p>

            {/* Error message */}
            {formState === "error" && errorMessage && (
              <div
                className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md"
                role="alert"
              >
                <p className="text-sm text-red-800 dark:text-red-200">{errorMessage}</p>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Password input */}
              <div>
                <PasswordInput
                  id="password"
                  label="New Password"
                  {...register("password")}
                  aria-invalid={errors.password ? "true" : "false"}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  placeholder="Enter your new password"
                />
                {errors.password && (
                  <p id="password-error" className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Confirm password input */}
              <div>
                <PasswordInput
                  id="confirmPassword"
                  label="Confirm New Password"
                  {...register("confirmPassword")}
                  aria-invalid={errors.confirmPassword ? "true" : "false"}
                  aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
                  placeholder="Confirm your new password"
                />
                {errors.confirmPassword && (
                  <p id="confirmPassword-error" className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Submit button */}
              <div>
                <button
                  type="submit"
                  disabled={isSubmitting || formState === "loading"}
                  className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formState === "loading" ? "Resetting..." : "Reset Password"}
                </button>
              </div>

              {/* Back to login link */}
              <div className="text-center">
                <Link
                  href="/auth/login"
                  className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Back to Login
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
