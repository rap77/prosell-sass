"use client";

/**
 * ForgotPasswordForm Component
 *
 * Handles password reset request flow.
 * User enters email and receives reset link via email.
 * Uses chadcn/ui components.
 */

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authApi } from "@/lib/api/authApi";
import { getErrorMessage } from "@/lib/utils/error";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "@/components/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

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
      setErrorMessage(getErrorMessage(err, "Unable to send reset email. Please try again."));
    }
  };

  // Success state
  if (formState === "success" && submittedEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <Card>
            <CardContent className="pt-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>

                {/* Use h2 for proper heading order after h1 (sr-only) */}
                <h2 className="text-3xl font-semibold leading-none tracking-tight mb-2">
                  Check Your Email
                </h2>

                <CardDescription className="mb-2">
                  We sent a password reset link to{" "}
                  <span className="font-medium text-foreground">{submittedEmail}</span>
                </CardDescription>

                <p className="text-sm text-muted-foreground mb-8">
                  Click the link in the email to reset your password. The link expires in 24 hours.
                </p>

                <div className="flex flex-col gap-4">
                  <Button asChild>
                    <Link href="/auth/login">
                      Back to Login
                    </Link>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setFormState("idle");
                      setSubmittedEmail(null);
                    }}
                  >
                    Send Another Email
                  </Button>
                </div>
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
              Forgot Your Password?
            </h2>
            <CardDescription>
              Enter your email address and we&apos;ll send you a link to reset your password.
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
              {/* Email input */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  {...register("email")}
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  aria-invalid={errors.email ? "true" : "false"}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  className={errors.email ? "border-destructive focus:ring-destructive" : ""}
                />
                {errors.email && (
                  <p id="email-error" className="mt-2 text-sm text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                disabled={isSubmitting || formState === "loading"}
                className="w-full"
              >
                {formState === "loading" ? "Sending..." : "Send Reset Link"}
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
