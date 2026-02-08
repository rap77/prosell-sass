"use client";

/**
 * ForgotPasswordForm Component
 *
 * Handles password reset request flow.
 * User enters email and receives reset link via email.
 */

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authApi } from "@/lib/api/authApi";

// Zod schema for form validation
const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

type FormState = "idle" | "loading" | "success" | "error";

export function ForgotPasswordForm() {
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError: setFieldError,
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onTouched",
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setFormState("loading");
    setErrorMessage(null);

    try {
      await authApi.forgotPassword(data.email);
      setFormState("success");
      setSubmittedEmail(data.email);
    } catch (err) {
      setFormState("error");
      if (err && typeof err === "object" && "status" in err) {
        const errorObj = err as { status?: number; message?: string };
        setErrorMessage(errorObj.message || "Unable to send reset email. Please try again.");
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Unable to send reset email. Please try again.");
      }
    }
  };

  // Success state
  if (formState === "success" && submittedEmail) {
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
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>

              <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
                Check Your Email
              </h1>

              <p className="text-gray-600 dark:text-gray-400 mb-2">
                We sent a password reset link to{" "}
                <span className="font-medium text-gray-900 dark:text-white">{submittedEmail}</span>
              </p>

              <p className="text-sm text-gray-500 dark:text-gray-500 mb-8">
                Click the link in the email to reset your password. The link expires in 24 hours.
              </p>

              <div className="flex flex-col gap-4">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Back to Login
                </Link>

                <button
                  onClick={() => {
                    setFormState("idle");
                    setSubmittedEmail(null);
                  }}
                  className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Send Another Email
                </button>
              </div>
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
              Forgot Your Password?
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Enter your email address and we'll send you a link to reset your password.
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
              {/* Email input */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  {...register("email")}
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={errors.email ? "true" : "false"}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                  placeholder="you@example.com"
                />
                {errors.email && (
                  <p id="email-error" className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {errors.email.message}
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
                  {formState === "loading" ? "Sending..." : "Send Reset Link"}
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
