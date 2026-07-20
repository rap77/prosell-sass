"use client";

/**
 * ResetPasswordPageContent — ProSell reset-password screen.
 * Uses AuthShell for the split brand+form layout.
 * Three render states: invalid-token, form (idle/loading/error), success.
 */

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authApi } from "@/lib/api/authApi";
import { getErrorMessage } from "@/lib/utils/error";
import { CheckCircle2, AlertTriangle, ArrowLeft } from "lucide-react";
import {
  AuthShell,
  AuthFormHead,
  AuthFieldError,
  AuthErrorBanner,
  AuthSubmitButton,
  AuthPasswordInput,
  AuthLabel,
  AuthStatusBadge,
  AuthCtaLink,
  AuthBackLink,
} from "@/components/auth/AuthShell";

// ─── Schema ───────────────────────────────────────────────────────────────────

const resetSchema = z
  .object({
    password: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
        "Debe tener mayúscula, minúscula, número y símbolo (@$!%*?&)",
      ),
    confirmPassword: z.string().min(1, "Confirmá tu contraseña"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type ResetValues = z.infer<typeof resetSchema>;

// ─── Status panels (success / invalid-token) ──────────────────────────────────

function StatusPanel({ variant }: { variant: "success" | "invalid-token" }) {
  const isSuccess = variant === "success";
  return (
    <AuthShell>
      <div className="flex flex-col items-center gap-5 text-center">
        <AuthStatusBadge variant={isSuccess ? "success" : "error"}>
          {isSuccess ? (
            <CheckCircle2 size={28} strokeWidth={1.8} />
          ) : (
            <AlertTriangle size={28} strokeWidth={1.8} />
          )}
        </AuthStatusBadge>

        <div>
          <h1 className="text-[26px] font-bold tracking-tight leading-tight mb-2 text-foreground">
            {isSuccess ? "¡Contraseña actualizada!" : "Enlace inválido"}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-[320px] m-0">
            {isSuccess
              ? "Tu contraseña se actualizó correctamente. Ya podés iniciar sesión."
              : "El enlace de recuperación no es válido o expiró. Solicitá uno nuevo."}
          </p>
        </div>

        <div className="w-full flex flex-col gap-2.5">
          <AuthCtaLink href="/auth/login">
            {isSuccess ? "Iniciar sesión" : "Volver al inicio de sesión"}
          </AuthCtaLink>
          {!isSuccess && (
            <AuthCtaLink href="/auth/forgot-password" variant="secondary">
              Solicitar nuevo enlace
            </AuthCtaLink>
          )}
        </div>
      </div>
    </AuthShell>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface ResetPasswordPageContentProps {
  token?: string;
}

export function ResetPasswordPageContent({
  token,
}: ResetPasswordPageContentProps) {
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // ponytail: derived state, no setter needed
  const tokenInvalid = !token || token.trim() === "";

  const {
    control,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    mode: "onTouched",
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (data: ResetValues) => {
    if (!token || token.trim() === "") {
      return;
    }
    setApiError(null);
    try {
      await authApi.resetPassword(token, data.password);
      setSuccess(true);
    } catch (err) {
      setApiError(
        getErrorMessage(
          err,
          "No pudimos restablecer tu contraseña. Intentá de nuevo.",
        ),
      );
    }
  };

  if (tokenInvalid) return <StatusPanel variant="invalid-token" />;
  if (success) return <StatusPanel variant="success" />;

  return (
    <AuthShell>
      <AuthFormHead
        title="Nueva contraseña"
        subtitle="Elegí una contraseña segura para tu cuenta."
      />

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <AuthLabel htmlFor="reset-password">Nueva contraseña</AuthLabel>
          <Controller
            name="password"
            control={control}
            render={({ field, fieldState }) => (
              <AuthPasswordInput
                id="reset-password"
                value={field.value}
                onChange={(e) => {
                  field.onChange(e);
                  if (apiError) setApiError(null);
                }}
                onBlur={field.onBlur}
                disabled={isSubmitting}
                hasError={!!fieldState.error}
                aria-invalid={!!fieldState.error}
              />
            )}
          />
          {errors.password && (
            <AuthFieldError message={errors.password.message ?? ""} />
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <AuthLabel htmlFor="reset-confirm-password">
            Confirmar contraseña
          </AuthLabel>
          <Controller
            name="confirmPassword"
            control={control}
            render={({ field, fieldState }) => (
              <AuthPasswordInput
                id="reset-confirm-password"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                disabled={isSubmitting}
                hasError={!!fieldState.error}
                aria-invalid={!!fieldState.error}
              />
            )}
          />
          {errors.confirmPassword && (
            <AuthFieldError message={errors.confirmPassword.message ?? ""} />
          )}
        </div>

        {apiError && <AuthErrorBanner message={apiError} />}

        <AuthSubmitButton
          label="Restablecer contraseña"
          loadingLabel="Restableciendo..."
          isLoading={isSubmitting}
          disabled={isSubmitting}
        />
      </form>

      <AuthBackLink href="/auth/login">
        <ArrowLeft size={14} strokeWidth={2} />
        Volver al inicio de sesión
      </AuthBackLink>
    </AuthShell>
  );
}
