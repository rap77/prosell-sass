"use client";

/**
 * ForgotPasswordPageContent — ProSell forgot-password screen.
 * Uses AuthShell for the split brand+form layout.
 * Two render states: form (idle/loading/error) and success.
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authApi } from "@/lib/api/authApi";
import { getErrorMessage } from "@/lib/utils/error";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import {
  AuthShell,
  AuthFormHead,
  AuthFieldError,
  AuthErrorBanner,
  AuthSubmitButton,
  AuthInput,
  AuthLabel,
  AuthStatusBadge,
  AuthCtaLink,
  AuthBackLink,
} from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";

// ─── Schema ───────────────────────────────────────────────────────────────────

const forgotSchema = z.object({
  email: z
    .string()
    .min(1, { message: "El email es requerido" })
    .email({ message: "El email no es válido" }),
}) as any;
type ForgotValues = z.infer<typeof forgotSchema>;

// ─── Success panel ────────────────────────────────────────────────────────────

function SuccessPanel({
  email,
  onResend,
}: {
  email: string;
  onResend: () => void;
}) {
  return (
    <AuthShell>
      <div className="flex flex-col items-center gap-5 text-center">
        <AuthStatusBadge variant="success">
          <CheckCircle2 size={28} strokeWidth={1.8} />
        </AuthStatusBadge>

        <div>
          <h1 className="text-[26px] font-bold tracking-tight leading-tight mb-2 text-foreground">
            Revisá tu email
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-[320px] m-0">
            Te enviamos un enlace de recuperación a{" "}
            <span className="text-foreground font-semibold">{email}</span>. El
            link expira en 24 horas.
          </p>
        </div>

        <div className="w-full flex flex-col gap-2.5">
          <AuthCtaLink href="/auth/login">
            Volver al inicio de sesión
          </AuthCtaLink>
          <Button type="button" variant="outline" onClick={onResend}>
            Reenviar email
          </Button>
        </div>
      </div>
    </AuthShell>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ForgotPasswordPageContent() {
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues,
    reset,
  } = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
    mode: "onTouched",
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotValues) => {
    setApiError(null);
    try {
      await authApi.forgotPassword(data.email);
      setSubmittedEmail(data.email);
    } catch (err) {
      setApiError(
        getErrorMessage(err, "No pudimos enviar el email. Intentá de nuevo."),
      );
    }
  };

  const handleResend = () => {
    setSubmittedEmail(null);
    setApiError(null);
    reset({ email: getValues("email") });
  };

  // ── Success ────────────────────────────────────────────────────────────────
  if (submittedEmail) {
    return <SuccessPanel email={submittedEmail} onResend={handleResend} />;
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <AuthShell>
      <AuthFormHead
        title="¿Olvidaste tu contraseña?"
        subtitle="Ingresá tu email y te mandamos un enlace para recuperarla."
      />

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4"
      >
        {/* Email field */}
        <div className="flex flex-col gap-1.5">
          <AuthLabel htmlFor="forgot-email">Email</AuthLabel>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ps-tertiary pointer-events-none inline-flex items-center">
              <Mail size={16} strokeWidth={2} />
            </span>
            <AuthInput
              {...register("email", {
                onChange: () => apiError && setApiError(null),
              })}
              id="forgot-email"
              type="email"
              placeholder="vos@empresa.com"
              autoComplete="email"
              disabled={isSubmitting}
              hasError={!!errors.email}
              aria-invalid={!!errors.email}
              className="pl-10"
            />
          </div>
          {errors.email && (
            <AuthFieldError message={errors.email.message ?? ""} />
          )}
        </div>

        {apiError && <AuthErrorBanner message={apiError} />}

        <AuthSubmitButton
          label="Enviar enlace de recuperación"
          loadingLabel="Enviando..."
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
