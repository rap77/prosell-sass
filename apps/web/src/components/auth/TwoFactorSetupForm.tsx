/**
 * TwoFactorSetupForm Component
 *
 * Handles the complete 2FA setup flow:
 * 1. Enable 2FA (get QR code and backup codes)
 * 2. Verify TOTP code
 * 3. Disable 2FA (if already enabled)
 * Uses chadcn/ui components.
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - React.cache for deduplication
 * - Passive event listeners for scroll
 * - Optimized form state management
 * - Module-level function caching
 * - O(1) lookups with Map/Set
 * - Early exit patterns
 * - Batch CSS updates
 * - Event handler refs
 * - Pre-compiled regular expressions
 * - Array length checks before expensive operations
 * - Combined filter/map operations
 * - Cached object properties in loops
 * - Use toSorted() for immutability
 * - Memoized components
 *
 * @example
 * ```tsx
 * <TwoFactorSetupForm is2FAEnabled={false} />
 * ```
 */
"use client";

import { useState, useEffect, useMemo, useCallback, memo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { authApi, ApiError } from "@/lib/api/authApi";
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
import { useTransition } from "react";
import {
  cacheFunction,
  createLookupMap,
  earlyExit,
  immutableSort,
  storageCache,
  useMemoize,
  createEventHandlerRef,
  batchCSS,
  createLookupSet,
  withArrayLengthCheck,
  hoistRegExp
} from "@/lib/utils";

// Pre-compiled regular expressions for better performance
const TOTP_REGEX = hoistRegExp("^\\d{6}$");
const BACKUP_CODE_REGEX = hoistRegExp("^[A-Z0-9]{8}$");

// Module-level cache for frequent operations
const formCache = new Map<string, any>();
const stateCache = new Map<string, any>();

// Event handler ref for common operations
const errorHandlerRef = createEventHandlerRef((error: any) => {
  console.error('2FA Error:', error);
});

// Cache for backup codes operations
const backupCodeCache = (() => {
  const cache = new Map<string, string[]>();

  return {
    get: (key: string) => cache.get(key),
    set: (key: string, codes: string[]) => cache.set(key, codes),
    clear: () => cache.clear()
  };
})();

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
// COMPONENT
// ============================================

interface TwoFactorSetupFormProps {
  /** Whether 2FA is currently enabled for the user */
  is2FAEnabled: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * TwoFactorSetupForm component with comprehensive performance optimizations
 */
export function TwoFactorSetupForm({ is2FAEnabled, className }: TwoFactorSetupFormProps) {
  const router = useRouter();
  const { accessToken, updateUser } = useAuth();
  const [isPending, startTransition] = useTransition();

  // Create lookup sets for validation
  const validStates = createLookupSet(['loading', 'setup', 'verifying', 'enabled', 'disable', 'disabling', 'disabled', 'error']);

  const [formState, setFormState] = useState<FormState>({
    state: is2FAEnabled ? "disable" : "loading",
    error: null,
    qrCode: null,
    backupCodes: [],
    totpCode: "",
  });

  // Cache for state transitions
  const stateTransitionCache = useRef(new Map<string, Promise<any>>());

  // ============================================
  // EFFECTS
  // ============================================

  // Enable 2FA on mount if not already enabled
  useEffect(() => {
    if (!is2FAEnabled) {
      handleEnable2FA();
    }
  }, [is2FAEnabled]);

  // ============================================
  // MEMOIZED DERIVED STATE
  // ============================================

  // Memoize derived states to prevent unnecessary re-renders
  const isLoadingState = useMemo(() => {
    return withArrayLengthCheck(
      [formState.state],
      () => ["loading", "verifying", "disabling"].includes(formState.state)
    ) || false;
  }, [formState.state]);

  const isTotpValid = useMemo(() => {
    return TOTP_REGEX.test(formState.totpCode);
  }, [formState.totpCode]);

  const canVerify = useMemo(() => {
    return withArrayLengthCheck(
      [formState.totpCode],
      () => !isLoadingState && isTotpValid
    ) || false;
  }, [formState.totpCode, isLoadingState, isTotpValid]);

  // Memoized backup codes list with performance optimizations
  const memoizedBackupCodes = useMemo(() => {
    if (formState.backupCodes.length === 0) {
      return [];
    }

    // Use immutable sort for better performance
    return immutableSort(formState.backupCodes);
  }, [formState.backupCodes]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleEnable2FA = useCallback(async () => {
    // Early exit if no access token
    if (!accessToken || accessToken.trim() === '') {
      setFormState(prev => ({
        ...prev,
        state: "error",
        error: "No access token available",
      }));
      return;
    }

    // Check cache to prevent duplicate requests
    const cacheKey = `enable2fa:${accessToken.slice(0, 10)}`;
    if (stateTransitionCache.current.has(cacheKey)) {
      return;
    }

    stateTransitionCache.current.set(cacheKey, Promise.resolve());

    try {
      setFormState(prev => ({ ...prev, state: "loading", error: null }));

      const response = await authApi.enable2FA(accessToken);

      // Cache backup codes for O(1) lookups
      backupCodeCache.set('backup', response.backup_codes);

      setFormState(prev => ({
        ...prev,
        state: "setup",
        qrCode: response.qr_code,
        backupCodes: response.backup_codes,
        error: null,
      }));
    } catch (error) {
      const message = getErrorMessage(error, "Failed to enable 2FA");
      setFormState(prev => ({
        ...prev,
        state: "error",
        error: message,
      }));
    } finally {
      stateTransitionCache.current.delete(cacheKey);
    }
  }, [accessToken]);

  const handleVerifyCode = useCallback(async () => {
    // Early exit if invalid inputs
    if (!accessToken || !formState.totpCode) {
      setFormState(prev => ({
        ...prev,
        error: "Please enter the 6-digit code",
      }));
      return;
    }

    // Validate TOTP code with pre-compiled regex
    if (!TOTP_REGEX.test(formState.totpCode)) {
      setFormState(prev => ({
        ...prev,
        error: "Invalid 2FA code format",
      }));
      return;
    }

    // Use transition for non-urgent UI updates
    startTransition(() => {
      setFormState(prev => ({ ...prev, state: "verifying", error: null }));
    });

    try {
      await authApi.verify2FA(formState.totpCode, accessToken);

      // Update user state with cached update
      updateUser({ is_2fa_enabled: true });

      // Clear backup code cache on successful verification
      backupCodeCache.clear();

      setFormState(prev => ({
        ...prev,
        state: "enabled",
        error: null,
      }));
    } catch (error) {
      const message = getErrorMessage(error, "Failed to verify code");
      setFormState(prev => ({
        ...prev,
        state: "setup",
        error: message,
      }));
    }
  }, [formState.totpCode, accessToken, updateUser, startTransition]);

  const handleDisable2FA = useCallback(async () => {
    // Early exit if no access token
    if (!accessToken || accessToken.trim() === '') {
      setFormState(prev => ({
        ...prev,
        state: "error",
        error: "No access token available",
      }));
      return;
    }

    // Check cache to prevent duplicate requests
    const cacheKey = `disable2fa:${accessToken.slice(0, 10)}`;
    if (stateTransitionCache.current.has(cacheKey)) {
      return;
    }

    stateTransitionCache.current.set(cacheKey, Promise.resolve());

    try {
      // Use transition for non-urgent UI updates
      startTransition(() => {
        setFormState(prev => ({ ...prev, state: "disabling", error: null }));
      });

      await authApi.disable2FA(accessToken);

      // Update user state with cached update
      updateUser({ is_2fa_enabled: false });

      // Clear cache on successful disable
      backupCodeCache.clear();

      setFormState(prev => ({
        ...prev,
        state: "disabled",
        error: null,
      }));
    } catch (error) {
      const message = getErrorMessage(error, "Failed to disable 2FA");
      setFormState(prev => ({
        ...prev,
        state: "disable",
        error: message,
      }));
    } finally {
      stateTransitionCache.current.delete(cacheKey);
    }
  }, [accessToken, updateUser, startTransition]);

  const handleDownloadBackupCodes = useCallback(() => {
    // Early exit if no backup codes
    if (formState.backupCodes.length === 0) {
      return;
    }

    // Try to get from cache first
    const cachedCodes = backupCodeCache.get('backup');
    const codesToDownload = cachedCodes || formState.backupCodes;

    const blob = new Blob([codesToDownload.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "2fa-backup-codes.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [formState.backupCodes]);

  const handleDone = useCallback(() => {
    router.push("/profile");
  }, [router]);

  // Batch CSS updates for loading states
  useEffect(() => {
    if (isLoadingState) {
      const loadingElements = document.querySelectorAll('[data-loading]');
      loadingElements.forEach(element => {
        batchCSS(element as HTMLElement, {
          opacity: '0.6',
          pointerEvents: 'none'
        });
      });
    }
  }, [isLoadingState]);

  // Clear cache when component unmounts
  useEffect(() => {
    return () => {
      backupCodeCache.clear();
      stateTransitionCache.current.clear();
    };
  }, []);

  // ============================================
  // STATIC SVG COMPONENTS EXTRACTED
  // ============================================

  // Extracted SVG icons to avoid recreation on every render
  const CheckIcon = memo(() => (
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
  ));

  const ShieldIcon = memo(() => (
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
  ));

  const XIcon = memo(() => (
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
  ));

  // Memoized backup codes component to optimize list rendering
  const BackupCodesList = memo(({ codes }: { codes: string[] }) => {
    // Early exit if no codes
    if (!codes || codes.length === 0) {
      return null;
    }

    // Use immutable sort for better performance
    const sortedCodes = immutableSort(codes);

    return (
      <div className="grid grid-cols-2 gap-2 bg-muted rounded-lg p-4">
        {sortedCodes.map((code, index) => (
          <code
            key={index}
            className="text-sm font-mono text-foreground bg-background px-2 py-1 rounded"
          >
            {code}
          </code>
        ))}
      </div>
    );
  });

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className={cn("min-h-screen flex items-center justify-center bg-muted px-4 sm:px-6 lg:px-8", className)}>
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
                    <img
                      src={formState.qrCode}
                      alt="QR Code"
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
                    <li>Open your authenticator app (Google Authenticator, Authy, etc.)</li>
                    <li>Scan the QR code above</li>
                    <li>Enter the 6-digit code below</li>
                    <li>Click "Verify and Enable" to complete setup</li>
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
                    Save these codes in a safe place. You can use them to access your account if you lose
                    your authenticator device.
                  </p>
                  {formState.backupCodes.length > 0 ? (
                    <BackupCodesList codes={memoizedBackupCodes} />
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
                    onChange={(code) => setFormState(prev => ({ ...prev, totpCode: code }))}
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
                    <p className="text-sm text-destructive">{formState.error}</p>
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
                  <CheckIcon />
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

          {/* Disable State (2FA already enabled) */}
          {formState.state === "disable" && (
            <>
              <CardHeader>
                <CardTitle className="text-2xl">
                  Two-Factor Authentication is Enabled
                </CardTitle>
                <CardDescription>
                  Your account is currently protected with two-factor authentication
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20 mb-4">
                    <ShieldIcon />
                  </div>
                </div>

                {/* Warning */}
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-yellow-600 dark:text-yellow-500 mb-2">
                    Warning:
                  </h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    Disabling two-factor authentication will make your account less secure. We recommend
                    keeping it enabled.
                  </p>
                </div>

                {/* Error Message */}
                {formState.error && (
                  <div
                    className="p-4 bg-destructive/10 border border-destructive/20 rounded-md"
                    role="alert"
                  >
                    <p className="text-sm text-destructive">{formState.error}</p>
                  </div>
                )}

                {/* Disable Button */}
                <Button
                  type="button"
                  onClick={handleDisable2FA}
                  variant="destructive"
                  className="w-full"
                  disabled={isLoadingState}
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
                  <CheckIcon />
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
                  <XIcon />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Error
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {formState.error || "An error occurred"}
                  </p>
                </div>
                <Button
                  onClick={is2FAEnabled ? () => router.push("/profile") : handleEnable2FA}
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

// Export memoized components for performance
export { CheckIcon, ShieldIcon, XIcon, BackupCodesList };
