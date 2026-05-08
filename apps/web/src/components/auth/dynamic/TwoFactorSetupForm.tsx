/**
 * Dynamic TwoFactorSetupForm Component
 *
 * Optimized version that loads only when needed for 2FA setup.
 * This is a large component (576 lines) that should not block initial page load.
 *
 * @example
 * ```tsx
 * const TwoFactorSetupForm = dynamic(() => import('./dynamic/TwoFactorSetupForm'), {
 *   ssr: false,
 *   loading: () => <TwoFactorSetupSkeleton />
 * });
 * ```
 */
"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { authApi, ApiError } from "@/lib/api/authApi";
import { getErrorMessage } from "@/lib/utils/error";
import { TwoFactorInput } from "../TwoFactorInput";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ShieldIcon } from "@/components/icons/dynamic";

// Pre-compiled regex for 6-digit TOTP codes
const TOTP_REGEX = /^\d{6}$/;

// ============================================
// TYPES
// ============================================

interface BackupCodes {
  qr_code: string;
  backup_codes: string[];
}

// ============================================
// STATES
// ============================================

type SetupState =
  | "loading" // Loading 2FA enable
  | "setup" // Show QR code and backup codes
  | "verifying" // Verifying TOTP code
  | "enabled" // Successfully enabled
  | "disable" // Show disable button (already enabled)
  | "disabling" // Disabling 2FA
  | "disabled" // Successfully disabled
  | "error"; // Error state

type FormState = {
  state: SetupState;
  error: string | null;
  qrCode: string | null;
  backupCodes: string[];
  totpCode: string;
};

// ============================================
// SKELETON COMPONENTS
// ============================================

export function TwoFactorSetupSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardContent className="pt-8">
            <div className="text-center py-12">
              <div
                className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                role="status"
                aria-label="Loading"
              >
                <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                  Loading...
                </span>
              </div>
              <h2 className="mt-4 text-xl font-semibold text-foreground">
                Loading Security Features...
              </h2>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function SetupStateSkeleton() {
  return (
    <div className="space-y-6">
      {/* QR Code skeleton */}
      <div className="flex justify-center">
        <div className="w-64 h-64 bg-muted rounded-lg border-2 border-muted animate-pulse" />
      </div>

      {/* Backup codes skeleton */}
      <div className="grid grid-cols-2 gap-2 bg-muted rounded-lg p-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-8 bg-muted animate-pulse rounded" />
        ))}
      </div>

      {/* Input skeleton */}
      <div className="space-y-3">
        <div className="h-10 bg-muted animate-pulse rounded" />
        <div className="h-12 bg-muted animate-pulse rounded" />
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

interface TwoFactorSetupFormProps {
  /** Whether 2FA is currently enabled for the user */
  is2FAEnabled: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function TwoFactorSetupForm({
  is2FAEnabled,
  className,
}: TwoFactorSetupFormProps) {
  const router = useRouter();
  const { updateUser } = useAuth();

  const [formState, setFormState] = useState<FormState>({
    state: is2FAEnabled ? "disable" : "loading",
    error: null,
    qrCode: null,
    backupCodes: [],
    totpCode: "",
  });

  // ============================================
  // EFFECTS
  // ============================================

  // Enable 2FA on mount if not already enabled
  useEffect(() => {
    if (!is2FAEnabled) {
      (async () => {
        try {
          setFormState((prev) => ({ ...prev, state: "loading", error: null }));
          const response = await authApi.enable2FA();
          setFormState((prev) => ({
            ...prev,
            state: "setup",
            qrCode: response.qr_code,
            backupCodes: response.backup_codes,
            error: null,
          }));
        } catch (error) {
          const message = getErrorMessage(error, "Failed to enable 2FA");
          setFormState((prev) => ({
            ...prev,
            state: "error",
            error: message,
          }));
        }
      })();
    }
  }, [is2FAEnabled]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleEnable2FA = async () => {
    setFormState((prev) => ({ ...prev, state: "loading", error: null }));

    try {
      const response = await authApi.enable2FA();
      setFormState((prev) => ({
        ...prev,
        state: "setup",
        qrCode: response.qr_code,
        backupCodes: response.backup_codes,
        error: null,
      }));
    } catch (error) {
      const message = getErrorMessage(error, "Failed to enable 2FA");
      setFormState((prev) => ({
        ...prev,
        state: "error",
        error: message,
      }));
    }
  };

  const handleVerifyCode = async () => {
    try {
      setFormState((prev) => ({ ...prev, state: "verifying", error: null }));

      await authApi.verify2FA(formState.totpCode);

      // Update user state
      updateUser({ is_2fa_enabled: true });

      setFormState((prev) => ({
        ...prev,
        state: "enabled",
        error: null,
      }));
    } catch (error) {
      const message = getErrorMessage(error, "Failed to verify code");
      setFormState((prev) => ({
        ...prev,
        state: "setup",
        error: message,
      }));
    }
  };

  const handleDisable2FA = async () => {
    try {
      setFormState((prev) => ({ ...prev, state: "disabling", error: null }));

      await authApi.disable2FA();

      // Update user state
      updateUser({ is_2fa_enabled: false });

      setFormState((prev) => ({
        ...prev,
        state: "disabled",
        error: null,
      }));
    } catch (error) {
      const message = getErrorMessage(error, "Failed to disable 2FA");
      setFormState((prev) => ({
        ...prev,
        state: "disable",
        error: message,
      }));
    }
  };

  const handleDownloadBackupCodes = () => {
    const blob = new Blob([formState.backupCodes.join("\n")], {
      type: "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "2fa-backup-codes.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDone = () => {
    router.push("/profile");
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div
      className={cn(
        "min-h-screen flex items-center justify-center bg-muted px-4 sm:px-6 lg:px-8",
        className,
      )}
    >
      <div className="max-w-md w-full">
        <Card>
          {/* Loading State */}
          {formState.state === "loading" && (
            <CardContent className="pt-8">
              <div className="text-center py-12">
                <div
                  className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                  role="status"
                  aria-label="Loading"
                >
                  <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                    Loading...
                  </span>
                </div>
                <h2 className="mt-4 text-xl font-semibold text-foreground">
                  Setting Up Two-Factor Authentication
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Please wait while we generate your QR code...
                </p>
              </div>
            </CardContent>
          )}

          {/* Setup State - Show QR Code and Backup Codes */}
          {formState.state === "setup" && (
            <>
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <ShieldIcon className="w-6 h-6 text-blue-600" />
                  Set Up Two-Factor Authentication
                </CardTitle>
                <CardDescription>
                  Scan the QR code with your authenticator app
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* QR Code */}
                <div className="flex justify-center">
                  {formState.qrCode && (
                    <Image
                      src={formState.qrCode}
                      alt="QR Code"
                      width={256}
                      height={256}
                      className="w-64 h-64 rounded-lg border-2 border"
                    />
                  )}
                </div>

                {/* Instructions */}
                <div className="bg-primary/10 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-primary mb-2">
                    Instructions:
                  </h3>
                  <ol className="text-sm text-primary space-y-1 list-decimal list-inside">
                    <li>
                      Open your authenticator app (Google Authenticator, Authy,
                      etc.)
                    </li>
                    <li>Scan the QR code above</li>
                    <li>Enter the 6-digit code below</li>
                    <li>
                      Click &quot;Verify and Enable&quot; to complete setup
                    </li>
                  </ol>
                </div>

                <Separator />

                {/* Backup Codes */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-foreground">
                      Backup Codes
                    </h3>
                    <Button
                      type="button"
                      variant="link"
                      onClick={handleDownloadBackupCodes}
                      className="text-sm"
                    >
                      Download Backup Codes
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Save these codes in a safe place. You can use them to access
                    your account if you lose your authenticator device.
                  </p>
                  {formState.backupCodes.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 bg-muted rounded-lg p-4">
                      {formState.backupCodes.map((code, index) => (
                        <code
                          key={index}
                          className="text-sm font-mono text-foreground bg-background px-2 py-1 rounded"
                        >
                          {code}
                        </code>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No backup codes available
                    </p>
                  )}
                </div>

                {/* TOTP Code Input */}
                <div>
                  <TwoFactorInput
                    label="2FA Code"
                    name="totp"
                    value={formState.totpCode}
                    onChange={(code) =>
                      setFormState((prev) => ({ ...prev, totpCode: code }))
                    }
                    error={formState.error}
                    required
                  />
                </div>

                {/* Verify Button */}
                <Button
                  type="button"
                  onClick={handleVerifyCode}
                  disabled={
                    !formState.totpCode || formState.totpCode.length !== 6
                  }
                  className="w-full"
                >
                  Verify and Enable
                </Button>

                {/* Error Message */}
                {formState.error && (
                  <div
                    className="p-4 bg-destructive/10 border border-destructive/20 rounded-md"
                    role="alert"
                  >
                    <p className="text-sm text-destructive">
                      {formState.error}
                    </p>
                  </div>
                )}
              </CardContent>
            </>
          )}

          {/* Verifying State */}
          {formState.state === "verifying" && (
            <CardContent className="pt-8">
              <div className="text-center py-12">
                <div
                  className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                  role="status"
                  aria-label="Loading"
                >
                  <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                    Loading...
                  </span>
                </div>
                <h2 className="mt-4 text-xl font-semibold text-foreground">
                  Verifying...
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Please wait while we verify your code
                </p>
              </div>
            </CardContent>
          )}

          {/* Enabled State */}
          {formState.state === "enabled" && (
            <CardContent className="pt-8">
              <div className="text-center py-12 space-y-6">
                <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                  <svg
                    className="h-10 w-10 text-green-600 dark:text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <ShieldIcon className="w-6 h-6 text-green-600" />
                    Two-Factor Authentication Enabled
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Your account is now protected with two-factor authentication
                  </p>
                </div>
                <Button onClick={handleDone} className="w-full">
                  Done
                </Button>
              </div>
            </CardContent>
          )}

          {/* Disable State (2FA already enabled) */}
          {formState.state === "disable" && (
            <>
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <ShieldIcon className="w-6 h-6 text-green-600" />
                  Two-Factor Authentication is Enabled
                </CardTitle>
                <CardDescription>
                  Your account is currently protected with two-factor
                  authentication
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20 mb-4">
                    <ShieldIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                </div>

                {/* Warning */}
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-yellow-600 dark:text-yellow-600 mb-2">
                    Warning:
                  </h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-500">
                    Disabling two-factor authentication will make your account
                    less secure. We recommend keeping it enabled.
                  </p>
                </div>

                {/* Error Message */}
                {formState.error && (
                  <div
                    className="p-4 bg-destructive/10 border border-destructive/20 rounded-md"
                    role="alert"
                  >
                    <p className="text-sm text-destructive">
                      {formState.error}
                    </p>
                  </div>
                )}

                {/* Disable Button */}
                <Button
                  type="button"
                  onClick={handleDisable2FA}
                  variant="destructive"
                  className="w-full"
                >
                  Disable 2FA
                </Button>
              </CardContent>
            </>
          )}

          {/* Disabling State */}
          {formState.state === "disabling" && (
            <CardContent className="pt-8">
              <div className="text-center py-12">
                <div
                  className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                  role="status"
                  aria-label="Loading"
                >
                  <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                    Loading...
                  </span>
                </div>
                <h2 className="mt-4 text-xl font-semibold text-foreground">
                  Disabling...
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Please wait while we disable two-factor authentication
                </p>
              </div>
            </CardContent>
          )}

          {/* Disabled State */}
          {formState.state === "disabled" && (
            <CardContent className="pt-8">
              <div className="text-center py-12 space-y-6">
                <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                  <svg
                    className="h-10 w-10 text-green-600 dark:text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Two-Factor Authentication Disabled
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Two-factor authentication has been disabled for your account
                  </p>
                </div>
                <Button onClick={handleDone} className="w-full">
                  Done
                </Button>
              </div>
            </CardContent>
          )}

          {/* Error State */}
          {formState.state === "error" && (
            <CardContent className="pt-8">
              <div className="text-center py-12 space-y-6">
                <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                  <svg
                    className="h-10 w-10 text-red-600 dark:text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Error</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {formState.error || "An error occurred"}
                  </p>
                </div>
                <Button
                  onClick={
                    is2FAEnabled
                      ? () => router.push("/profile")
                      : handleEnable2FA
                  }
                  className="w-full"
                >
                  {is2FAEnabled ? "Back to Profile" : "Try Again"}
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}

// Export dynamic version for use with next/dynamic
export default TwoFactorSetupForm;
