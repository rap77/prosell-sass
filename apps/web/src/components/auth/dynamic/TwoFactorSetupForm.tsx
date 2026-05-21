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

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { twoFactorApi } from "@/lib/api/twoFactorApi";
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

// ============================================
// STATES
// ============================================

const SETUP_STATE = {
  LOADING: "loading",
  SETUP: "setup",
  VERIFYING: "verifying",
  ENABLED: "enabled",
  DISABLE: "disable",
  DISABLING: "disabling",
  DISABLED: "disabled",
  ERROR: "error",
} as const;

type SetupState = (typeof SETUP_STATE)[keyof typeof SETUP_STATE];

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
    <div style={{
      minHeight: '100vh',
      background: 'var(--ps-bg-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    }}>
      <style>{`@keyframes twoFaSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <div style={{ width: '100%', maxWidth: 448 }}>
        <div style={{
          background: 'var(--ps-bg-surface)',
          border: '1px solid var(--ps-border-default)',
          borderRadius: 14,
          padding: '32px 28px',
          textAlign: 'center',
        }}>
          <div
            role="status"
            aria-label="Cargando"
            style={{
              display: 'inline-block',
              width: 40,
              height: 40,
              border: '3px solid var(--ps-border-default)',
              borderTopColor: 'var(--ps-cyan)',
              borderRadius: '50%',
              animation: 'twoFaSpin 0.8s linear infinite',
            }}
          />
          <h2 style={{ margin: '16px 0 0', fontSize: 18, fontWeight: 600, color: 'var(--ps-text-primary)' }}>
            Cargando funciones de seguridad...
          </h2>
        </div>
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
  const { updateUser, userId } = useAuth();

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

  const enableTwoFactorQuery = useQuery({
    queryKey: ["two-factor-setup", userId],
    queryFn: async () => {
      if (!userId) {
        throw new Error("No se pudo identificar tu cuenta");
      }

      return twoFactorApi.enable();
    },
    enabled: !is2FAEnabled && Boolean(userId),
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  // Sync React Query state into the local UI state machine
  useEffect(() => {
    if (is2FAEnabled || formState.state !== "loading") {
      return;
    }

    if (enableTwoFactorQuery.isError) {
      const message = getErrorMessage(
        enableTwoFactorQuery.error,
        "Failed to enable 2FA",
      );
      queueMicrotask(() => {
        setFormState((prev) => ({
          ...prev,
          state: SETUP_STATE.ERROR,
          error: message,
        }));
      });
      return;
    }

    if (enableTwoFactorQuery.data) {
      queueMicrotask(() => {
        setFormState((prev) => ({
          ...prev,
          state: SETUP_STATE.SETUP,
          qrCode: enableTwoFactorQuery.data.qrCode,
          backupCodes: enableTwoFactorQuery.data.backupCodes,
          error: null,
        }));
      });
    }
  }, [
    enableTwoFactorQuery.data,
    enableTwoFactorQuery.error,
    enableTwoFactorQuery.isError,
    formState.state,
    is2FAEnabled,
  ]);

  // ============================================
  // DERIVED STATE
  // ============================================

  const loadingStates: readonly SetupState[] = [
    SETUP_STATE.LOADING,
    SETUP_STATE.VERIFYING,
    SETUP_STATE.DISABLING,
  ];
  const isBusy = loadingStates.includes(formState.state);
  const isTotpCodeValid = TOTP_REGEX.test(formState.totpCode);
  const canVerify = !isBusy && isTotpCodeValid;

  // ============================================
  // HANDLERS
  // ============================================

  const handleEnable2FA = async () => {
    setFormState((prev) => ({ ...prev, state: SETUP_STATE.LOADING, error: null }));
    await enableTwoFactorQuery.refetch();
  };

  const handleVerifyCode = async () => {
    try {
      setFormState((prev) => ({ ...prev, state: SETUP_STATE.VERIFYING, error: null }));

      await twoFactorApi.verify(formState.totpCode);

      // Update user state
      updateUser({ is_2fa_enabled: true });

      setFormState((prev) => ({
        ...prev,
        state: SETUP_STATE.ENABLED,
        error: null,
      }));
    } catch (error) {
      const message = getErrorMessage(error, "Failed to verify code");
      setFormState((prev) => ({
        ...prev,
        state: SETUP_STATE.SETUP,
        error: message,
      }));
    }
  };

  const handleDisable2FA = async () => {
    try {
      setFormState((prev) => ({ ...prev, state: SETUP_STATE.DISABLING, error: null }));

      await twoFactorApi.disable(formState.totpCode);

      // Update user state
      updateUser({ is_2fa_enabled: false });

      setFormState((prev) => ({
        ...prev,
        state: SETUP_STATE.DISABLED,
        error: null,
      }));
    } catch (error) {
      const message = getErrorMessage(error, "Failed to disable 2FA");
      setFormState((prev) => ({
        ...prev,
        state: SETUP_STATE.DISABLE,
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
                  Configurando autenticación de dos factores
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Aguardá mientras generamos tu código QR...
                </p>
              </div>
            </CardContent>
          )}

          {/* Setup State - Show QR Code and Backup Codes */}
          {formState.state === "setup" && (
            <>
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <ShieldIcon className="w-6 h-6" style={{ color: 'var(--ps-cyan)' }} />
                  Configurar autenticación de dos factores
                </CardTitle>
                <CardDescription>
                  Escaneá el código QR con tu app de autenticación
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
                <div style={{ background: 'var(--ps-info-bg)', borderRadius: 8, padding: 16 }}>
                  <h3 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: 'var(--ps-cyan)' }}>
                    Instrucciones:
                  </h3>
                  <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--ps-cyan)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <li>Abrí tu app de autenticación (Google Authenticator, Authy, etc.)</li>
                    <li>Escaneá el código QR de arriba</li>
                    <li>Ingresá el código de 6 dígitos abajo</li>
                    <li>Hacé click en "Verificar y activar" para completar la configuración</li>
                  </ol>
                </div>

                <Separator />

                {/* Backup Codes */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-foreground">
                      Códigos de respaldo
                    </h3>
                    <Button
                      type="button"
                      variant="link"
                      onClick={handleDownloadBackupCodes}
                      className="text-sm"
                    >
                      Descargar códigos
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Guardá estos códigos en un lugar seguro. Podés usarlos para acceder
                    a tu cuenta si perdés tu dispositivo de autenticación.
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
                      No hay códigos de respaldo disponibles
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
                  Verificar y activar
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
                  Verificando...
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Aguardá mientras verificamos tu código
                </p>
              </div>
            </CardContent>
          )}

          {/* Enabled State */}
          {formState.state === "enabled" && (
            <CardContent className="pt-8">
              <div className="text-center py-12 space-y-6">
                <div style={{ display: 'inline-flex', width: 80, height: 80, alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'var(--ps-success-bg)' }}>
                  <svg
                    style={{ width: 40, height: 40, color: 'var(--ps-success)' }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <ShieldIcon className="w-6 h-6" style={{ color: 'var(--ps-success)' }} />
                    Autenticación de dos factores activada
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Tu cuenta ahora está protegida con autenticación de dos factores
                  </p>
                </div>
                <Button onClick={handleDone} className="w-full">
                  Listo
                </Button>
              </div>
            </CardContent>
          )}

          {/* Disable State (2FA already enabled) */}
          {formState.state === "disable" && (
            <>
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <ShieldIcon className="w-6 h-6" style={{ color: 'var(--ps-success)' }} />
                  Autenticación de dos factores activada
                </CardTitle>
                <CardDescription>
                  Tu cuenta está protegida actualmente con autenticación de dos factores
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="text-center">
                  <div style={{ display: 'inline-flex', width: 64, height: 64, alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'var(--ps-success-bg)', marginBottom: 16 }}>
                    <ShieldIcon className="h-8 w-8" style={{ color: 'var(--ps-success)' }} />
                  </div>
                </div>

                {/* Advertencia */}
                <div style={{ background: 'var(--ps-warning-bg)', border: '1px solid var(--ps-warning)', borderRadius: 8, padding: 16 }}>
                  <h3 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: 'var(--ps-warning)' }}>
                    Advertencia:
                  </h3>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--ps-warning)' }}>
                    Desactivar la autenticación de dos factores hace tu cuenta menos segura.
                    Recomendamos mantenerla activada.
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
                  disabled={isBusy}
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
                  Desactivar 2FA
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
                  Desactivando...
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Aguardá mientras desactivamos la autenticación de dos factores
                </p>
              </div>
            </CardContent>
          )}

          {/* Disabled State */}
          {formState.state === "disabled" && (
            <CardContent className="pt-8">
              <div className="text-center py-12 space-y-6">
                <div style={{ display: 'inline-flex', width: 80, height: 80, alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'var(--ps-warning-bg)' }}>
                  <svg
                    style={{ width: 40, height: 40, color: 'var(--ps-warning)' }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Autenticación de dos factores desactivada
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    La autenticación de dos factores fue desactivada para tu cuenta
                  </p>
                </div>
                <Button onClick={handleDone} className="w-full">
                  Listo
                </Button>
              </div>
            </CardContent>
          )}

          {/* Error State */}
          {formState.state === "error" && (
            <CardContent className="pt-8">
              <div className="text-center py-12 space-y-6">
                <div style={{ display: 'inline-flex', width: 80, height: 80, alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'var(--ps-error-bg)' }}>
                  <svg
                    style={{ width: 40, height: 40, color: 'var(--ps-error)' }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Error</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {formState.error || "Ocurrió un error inesperado"}
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
                  {is2FAEnabled ? "Volver al perfil" : "Intentar de nuevo"}
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
