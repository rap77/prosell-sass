"use client";

/**
 * VerifyEmailForm Component
 *
 * Handles email verification flow when user clicks link from email.
 * Expects a token prop from URL query params.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { authApi, ApiError } from "@/lib/api/authApi";

type VerificationState = "idle" | "loading" | "success" | "error";

interface VerifyEmailFormProps {
  token?: string;
}

export function VerifyEmailForm({ token }: VerifyEmailFormProps) {
  const [state, setState] = useState<VerificationState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Validate token exists
    if (!token || token.trim() === "") {
      setState("error");
      setError("Missing or invalid token");
      return;
    }

    // Start verification
    const verifyEmail = async () => {
      setState("loading");
      setError(null);

      try {
        await authApi.verifyEmail(token);
        setState("success");
      } catch (err) {
        setState("error");
        // Handle ApiError instances
        if (err instanceof ApiError) {
          if (err.status === 404) {
            setError("Verification link not found");
          } else if (err.status === 400) {
            setError(err.message || "Invalid or expired token");
          } else {
            setError("Unable to verify email. Please try again.");
          }
        }
        // Handle plain objects with status (for mocks/tests)
        else if (err && typeof err === "object" && "status" in err) {
          const errorObj = err as { status?: number; message?: string };
          if (errorObj.status === 404) {
            setError("Verification link not found");
          } else if (errorObj.status === 400) {
            setError(errorObj.message || "Invalid or expired token");
          } else {
            setError("Unable to verify email. Please try again.");
          }
        }
        // Handle regular Error instances
        else if (err instanceof Error) {
          setError(err.message);
        }
        // Handle unknown errors
        else {
          setError("Unable to verify email. Please try again.");
        }
      }
    };

    verifyEmail();
  }, [token]);

  // Render different UI based on state
  const renderContent = () => {
    switch (state) {
      case "idle":
      case "loading":
        return (
          <div className="flex flex-col items-center justify-center py-12">
            <div
              className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600 mb-6"
              role="status"
              aria-label="Loading"
            />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Verifying your email...
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Please wait while we verify your email address.
            </p>
          </div>
        );

      case "success":
        return (
          <div className="flex flex-col items-center justify-center py-12">
            <div
              className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-6"
              role="status"
              aria-live="polite"
            >
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
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Email Verified Successfully!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-center mb-8">
              Your email has been verified. You can now log in to your account.
            </p>
            <Link
              href="/auth/login"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              aria-label="Continue to login page"
            >
              Continue to Login
            </Link>
          </div>
        );

      case "error":
        return (
          <div className="flex flex-col items-center justify-center py-12">
            <div
              className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-6"
              role="alert"
              aria-live="assertive"
            >
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {state === "error" && error?.includes("not found")
                ? "Verification Link Not Found"
                : "Verification Failed"}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-center mb-2">
              {error ||
                "Invalid or expired token. The verification link may have expired."}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back to Login
              </Link>
              <Link
                href="/auth/register"
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                aria-label="Request new verification email"
              >
                Request New Verification
              </Link>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-8">
              Email Verification
            </h1>
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
