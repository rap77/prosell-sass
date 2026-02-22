"use client";

/**
 * VerifyEmailForm Component
 *
 * Handles email verification flow when user clicks link from email.
 * Expects a token prop from URL query params.
 * Uses chadcn/ui components.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { authApi, ApiError } from "@/lib/api/authApi";
import { getErrorMessage } from "@/lib/utils/error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckIcon, XIcon } from "@/components/icons";

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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
        // Handle ApiError with specific status codes
        if (err instanceof ApiError) {
          if (err.status === 404) {
            setError("Verification link not found");
          } else if (err.status === 400) {
            setError(err.message || "Invalid or expired token");
          } else {
            // For other ApiError statuses, use the error message
            setError(
              err.message || "Unable to verify email. Please try again.",
            );
          }
        } else {
          // Handle all other error types (Error instances, plain objects, unknown types)
          setError(
            getErrorMessage(err, "Unable to verify email. Please try again."),
          );
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
              className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary mb-6"
              role="status"
              aria-label="Loading"
            />
            <h2 className="text-xl font-semibold text-foreground">
              Verifying your email...
            </h2>
            <p className="text-muted-foreground mt-2">
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
              <CheckIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            {/* Use h2 for proper heading order after h1 (sr-only) */}
            <h2 className="text-2xl font-semibold leading-none tracking-tight mb-2">
              Email Verified Successfully!
            </h2>
            <p className="text-muted-foreground text-center mb-8">
              Your email has been verified. You can now log in to your account.
            </p>
            <Button asChild className="w-full">
              <Link href="/auth/login">Continue to Login</Link>
            </Button>
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
              <XIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            {/* Use h2 for proper heading order after h1 (sr-only) */}
            <h2 className="text-2xl font-semibold leading-none tracking-tight mb-2">
              {state === "error" && error?.includes("not found")
                ? "Verification Link Not Found"
                : "Verification Failed"}
            </h2>
            <p className="text-muted-foreground text-center mb-2">
              {error ||
                "Invalid or expired token. The verification link may have expired."}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <Button variant="outline" asChild className="flex-1">
                <Link href="/auth/login">Back to Login</Link>
              </Button>
              <Button asChild className="flex-1">
                <Link href="/auth/register">Request New Verification</Link>
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Card>
          <CardHeader>
            {/* Use h2 for proper heading order after h1 (sr-only) */}
            <h2 className="text-3xl font-semibold leading-none tracking-tight">
              Email Verification
            </h2>
          </CardHeader>
          <CardContent>{renderContent()}</CardContent>
        </Card>
      </div>
    </div>
  );
}
