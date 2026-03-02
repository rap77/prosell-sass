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

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/stores/authStore";
import { PasswordInput } from "./PasswordInput";
import dynamic from "next/dynamic";
import { useEffect } from "react";

// Module-level cache for validation results
const validationCache = new Map<string, boolean>();

// Module-level cache for name splitting — persists across renders
const nameSplitCache = new Map<string, { firstName: string; lastName: string }>();

function splitName(fullName: string): { firstName: string; lastName: string } {
  const cached = nameSplitCache.get(fullName);
  if (cached) return cached;

  const trimmed = fullName.trim();
  const parts = trimmed.split(" ");
  const result = { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
  nameSplitCache.set(fullName, result);
  return result;
}

// Error messages for form validation
const ERROR_MESSAGES = {
  fullName: {
    required: "Full name is required",
    min: "Full name must be at least 2 characters",
    max: "Full name must be less than 100 characters",
  },
  email: {
    required: "Email is required",
    invalid: "Invalid email address",
  },
  password: {
    required: "Password is required",
    min: "Password must be at least 8 characters",
    invalid: "Password must meet all requirements",
  },
} as const;

// ============================================
// STATIC JSX EXTRACTED FOR PERFORMANCE
// ============================================

/**
 * Heading component
 */
const RegisterHeading = () => (
  <div className="text-center">
    {/* Visual heading (hidden from screen readers to avoid duplication with PageContent h2) */}
    <p className="text-2xl font-bold text-foreground">Create your account</p>
    <p className="mt-2 text-sm text-muted-foreground">
      Join us today! Please enter your details
    </p>
  </div>
);

/**
 * Divider component
 */
const RegisterDivider = () => (
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

/**
 * Footer component
 */
const RegisterFooter = () => (
  <p className="text-center text-sm text-muted-foreground">
    Already have an account?{" "}
    <Link
      href="/auth/login"
      className="font-medium text-primary hover:underline"
    >
      Sign in
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
import { Separator } from "@/components/ui/separator";
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
    confirmPassword: z.string().min(1, "Confirm password is required"),
    acceptTerms: z.boolean().refine((val) => val === true, {
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
 * - chadcn/ui components
 */
export function RegisterForm() {
  const router = useRouter();
  const { register: registerUser, isLoading, error, clearError } = useAuth();

  // React Hook Form setup
  const {
    control,
    handleSubmit,
    register: registerInput,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: "onTouched",
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },
  });

  // ============================================
  // MEMOIZED DERIVED STATE
  // ============================================

  // Derived boolean state
  const isDisabled = isLoading || isSubmitting;

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
   * Handle form submission
   * Note: Zod schema already validates all fields, no need for duplicate validation
   */
  const onSubmit = async (data: RegisterFormValues) => {
    if (isDisabled) return;
    const { firstName, lastName } = splitName(data.fullName);
    await registerUser(data.email.trim(), data.password, firstName, lastName);
    if (!useAuthStore.getState().error) {
      router.push("/auth/verify-email");
    }
  };

  // Clear validation cache when component unmounts
  useEffect(() => {
    return () => {
      validationCache.clear();
    };
  }, []);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="flex flex-col gap-6">
      {/* Memoized Heading */}
      <RegisterHeading />

      {/* OAuth Buttons */}
      <OAuthButtons />

      {/* Memoized Divider */}
      <RegisterDivider />

      {/* Register Form */}
      <form
        name="register"
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        {/* Full Name Input */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            {...registerInput("fullName")}
            onBlur={handleInputChange}
            id="fullName"
            type="text"
            placeholder="John Doe"
            autoComplete="name"
            disabled={isDisabled}
            aria-invalid={!!errors.fullName || !!error}
            aria-describedby={error ? "register-error" : undefined}
            className={cn(
              (errors.fullName || error) &&
                "border-destructive focus:ring-destructive",
            )}
          />
          {errors.fullName && (
            <p role="alert" className="text-sm text-destructive">
              {errors.fullName.message}
            </p>
          )}
        </div>

        {/* Email Input */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            {...registerInput("email")}
            onBlur={handleInputChange}
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            disabled={isDisabled}
            aria-invalid={!!errors.email || !!error}
            aria-describedby={error ? "register-error" : undefined}
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
            />
          )}
        />

        {/* Confirm Password Input */}
        <Controller
          name="confirmPassword"
          control={control}
          render={({ field, fieldState }) => (
            <PasswordInput
              label="Confirm Password"
              name="confirmPassword"
              placeholder="Confirm your password"
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

        {/* Terms and Privacy Checkbox */}
        <Controller
          name="acceptTerms"
          control={control}
          render={({ field }) => (
            <div className="flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="acceptTerms"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isDisabled}
                />
                <label
                  htmlFor="acceptTerms"
                  className="text-sm text-foreground cursor-pointer"
                >
                  I accept the{" "}
                  <Link
                    href="/terms"
                    className="font-medium text-primary hover:underline"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy"
                    className="font-medium text-primary hover:underline"
                  >
                    Privacy Policy
                  </Link>
                </label>
              </div>
              {errors.acceptTerms && (
                <p role="alert" className="text-sm text-destructive">
                  {errors.acceptTerms.message}
                </p>
              )}
            </div>
          )}
        />

        {/* Auth Error */}
        {error && !hasFormErrors && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <p
              id="register-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {error.message}
            </p>
          </div>
        )}

        {/* Submit Button */}
        <Button type="submit" disabled={isDisabled} className="w-full">
          {isLoading ? "Creating account..." : "Create account"}
        </Button>
      </form>

      {/* Memoized Footer */}
      <RegisterFooter />
    </div>
  );
}

// Export memoized components for performance
export { RegisterHeading, RegisterDivider, RegisterFooter };
