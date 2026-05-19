/**
 * TwoFactorSetupForm Component
 *
 * Handles the complete 2FA setup flow:
 * 1. Enable 2FA (get QR code and backup codes)
 * 2. Verify TOTP code
 * 3. Disable 2FA (if already enabled)
 *
 * React 19 + React Compiler: No manual memoization needed.
 * All optimizations handled automatically by React Compiler.
 *
 * @example
 * ```tsx
 * <TwoFactorSetupForm is2FAEnabled={false} />
 * ```
 */
"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { twoFactorApi } from "@/lib/api/twoFactorApi";
import { getErrorMessage } from "@/lib/utils/error";
import { TwoFactorInput } from "./TwoFactorInput";
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

// Pre-compiled regex for 6-digit TOTP codes
const TOTP_REGEX = /^\d{6}$/;

// ============================================
// TYPES
// ============================================

type SetupState =
  | "idle" // Not started - show "Enable 2FA" button
  | "loading" // Loading 2FA enable
  | "setup" // Show QR code and backup codes
  | "verifying" // Verifying TOTP code
  | "enabled" // Successfully enabled
  | "protected" // Already enabled - show protected view
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
// PROPS
// ============================================

interface TwoFactorSetupFormProps {
  /** Whether 2FA is currently enabled for the user */
  is2FAEnabled: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function TwoFactorSetupForm({
  is2FAEnabled,
  className,
}: TwoFactorSetupFormProps) {
  const router = useRouter();
  const { updateUser, userId } = useAuth();

  // Lazy state init: derive from prop (no auto-call to API)
  const [formState, setFormState] = useState<FormState>(() => ({
    state: is2FAEnabled ? "protected" : "idle",
    error: null,
    qrCode: null,
    backupCodes: [],
    totpCode: "",
  }));

  // Sync state when is2FAEnabled prop changes (external auth update)
  // Note: This state sync is necessary because is2FAEnabled can change externally
  // (e.g., user enables 2FA in another tab). The alternative would be using a key
  // to force re-mount, but that would lose all local state (qrCode, backupCodes, etc).
  useEffect(() => {
    setFormState((prev) => ({
      ...prev,
      state: is2FAEnabled ? "protected" : "idle",
    }));
  }, [is2FAEnabled]);

  // ============================================
  // EFFECTS
  // ============================================

  // beforeunload warning during operations (prevent accidental navigation)
  useEffect(() => {
    const isOperationInProgress =
      formState.state === "loading" ||
      formState.state === "verifying" ||
      formState.state === "disabling";

    if (!isOperationInProgress) {
      return;
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Chrome requires returnValue to be set
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [formState.state]);

  // ============================================
  // DERIVED STATE (React 19: no useMemo needed)
  // ============================================

  const isLoadingState = ["loading", "verifying", "disabling"].includes(
    formState.state,
  );
  const isTotpCodeValid = TOTP_REGEX.test(formState.totpCode);
  const canVerify = !isLoadingState && isTotpCodeValid;

  // ============================================
  // HANDLERS (React 19: no useCallback needed)
  // ============================================

  async function handleEnable2FA() {
    if (!userId) {
      setFormState((prev) => ({
        ...prev,
        state: "error",
        error: "No se pudo identificar tu cuenta",
      }));
      return;
    }

    setFormState((prev) => ({ ...prev, state: "loading", error: null }));

    try {
      const response = await twoFactorApi.enable();
      setFormState((prev) => ({
        ...prev,
        state: "setup",
        qrCode: response.qrCode,
        backupCodes: response.backupCodes,
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
  }

  async function handleVerifyCode() {
    if (!formState.totpCode) {
      setFormState((prev) => ({
        ...prev,
        error: "Please enter the 6-digit code",
      }));
      return;
    }

    if (!isTotpCodeValid) {
      setFormState((prev) => ({
        ...prev,
        error: "Invalid 2FA code format",
      }));
      return;
    }

    setFormState((prev) => ({ ...prev, state: "verifying", error: null }));

    try {
      await twoFactorApi.verify(formState.totpCode);
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
  }

  async function handleDisable2FA() {
    setFormState((prev) => ({ ...prev, state: "disabling", error: null }));

    try {
      if (!userId) {
        throw new Error("No se pudo identificar tu cuenta");
      }

      await twoFactorApi.disable(formState.totpCode);
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
        state: "protected",
        error: message,
      }));
    }
  }

  function handleDownloadBackupCodes() {
    if (formState.backupCodes.length === 0) {
      return;
    }

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
  }

  function handleDone() {
    router.push("/profile");
  }

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
          {/* Idle State - Show "Enable 2FA" button */}
          {formState.state === "idle" && (
            <>
              <CardHeader>
                <CardTitle className="text-2xl">
                  Set Up Two-Factor Authentication
                </CardTitle>
                <CardDescription>
                  Add an extra layer of security to your account
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="text-center py-8">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                    <svg
                      className="h-8 w-8 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Protect your account
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Two-factor authentication adds an extra layer of security by
                    requiring a code from your authenticator app when you log
                    in.
                  </p>
                  <Button
                    type="button"
                    onClick={handleEnable2FA}
                    className="w-full"
                    size="lg"
                  >
                    Enable 2FA
                  </Button>
                </div>
              </CardContent>
            </>
          )}

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
                <CardTitle className="text-2xl">
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
                      disabled={!formState.backupCodes.length}
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
                      {formState.backupCodes.toSorted().map((code) => (
                        <code
                          key={code}
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
                  disabled={!canVerify}
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
                  <h2 className="text-2xl font-bold text-foreground">
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

          {/* Protected State (2FA already enabled) */}
          {formState.state === "protected" && (
            <>
              <CardHeader>
                <CardTitle className="text-2xl">
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
                    <svg
                      className="h-8 w-8 text-green-600 dark:text-green-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your account is protected with an authenticator app
                  </p>
                </div>

                {/* View Backup Codes Button */}
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push("/auth/backup-codes")}
                  >
                    View Backup Codes
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    View or download your backup codes for account recovery
                  </p>
                </div>

                <Separator />

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

                <TwoFactorInput
                  label="2FA Code"
                  name="disable-totp"
                  value={formState.totpCode}
                  onChange={(code) =>
                    setFormState((prev) => ({
                      ...prev,
                      totpCode: code,
                    }))
                  }
                  disabled={isLoadingState}
                  error={null}
                />

                {/* Disable Button */}
                <Button
                  type="button"
                  onClick={handleDisable2FA}
                  variant="destructive"
                  className="w-full"
                  disabled={!canVerify}
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
                {/* Show "Try Again" if not enabled, "Back to Profile" if enabled */}
                {is2FAEnabled ? (
                  <Button
                    onClick={() => router.push("/profile")}
                    className="w-full"
                  >
                    Back to Profile
                  </Button>
                ) : (
                  <Button onClick={handleEnable2FA} className="w-full">
                    Try Again
                  </Button>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
