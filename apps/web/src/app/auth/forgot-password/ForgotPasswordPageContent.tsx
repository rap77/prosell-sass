"use client";

/**
 * ForgotPasswordPageContent — ProSell forgot-password screen.
 * Uses AuthShell for the split brand+form layout.
 * Two render states: form (idle/loading/error) and success.
 * Logic: react-hook-form + zod + authApi.forgotPassword
 */

import { useState } from "react";
import Link from "next/link";
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
  authInputStyle,
  focusAuthInput,
  blurAuthInput,
} from "@/components/auth/AuthShell";

// ─── Schema ───────────────────────────────────────────────────────────────────

const forgotSchema = z.object({
  email: z
    .string()
    .min(1, "El email es requerido")
    .email("El email no es válido"),
});
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
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          textAlign: "center",
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "var(--ps-success-bg)",
            border: "1px solid rgba(34,211,160,0.25)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CheckCircle2
            size={28}
            style={{ color: "var(--ps-success)" }}
            strokeWidth={1.8}
          />
        </div>

        {/* Heading */}
        <div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
              margin: "0 0 8px",
              color: "var(--ps-text-primary)",
            }}
          >
            Revisá tu email
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "var(--ps-text-secondary)",
              margin: 0,
              lineHeight: 1.6,
              maxWidth: 320,
            }}
          >
            Te enviamos un enlace de recuperación a{" "}
            <span style={{ color: "var(--ps-text-primary)", fontWeight: 600 }}>
              {email}
            </span>
            . El link expira en 24 horas.
          </p>
        </div>

        {/* CTA */}
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <Link
            href="/auth/login"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              height: 44,
              width: "100%",
              background: "var(--ps-cyan)",
              color: "var(--ps-bg-base)",
              border: 0,
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: "-0.005em",
              textDecoration: "none",
            }}
          >
            Volver al inicio de sesión
          </Link>

          <button
            type="button"
            onClick={onResend}
            style={{
              height: 44,
              background: "transparent",
              border: "1px solid var(--ps-input-border)",
              borderRadius: 8,
              color: "var(--ps-text-secondary)",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Reenviar email
          </button>
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
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        {/* Email field */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label
            htmlFor="forgot-email"
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--ps-text-secondary)",
            }}
          >
            Email
          </label>
          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--ps-text-tertiary)",
                pointerEvents: "none",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              <Mail size={16} strokeWidth={2} />
            </span>
            <input
              {...register("email", {
                onChange: () => apiError && setApiError(null),
              })}
              id="forgot-email"
              type="email"
              placeholder="vos@empresa.com"
              autoComplete="email"
              disabled={isSubmitting}
              aria-invalid={!!errors.email}
              style={{ ...authInputStyle(!!errors.email), paddingLeft: 38 }}
              onFocus={(e) => focusAuthInput(e.currentTarget, !!errors.email)}
              onBlur={(e) => blurAuthInput(e.currentTarget, !!errors.email)}
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

      <p style={{ textAlign: "center", margin: 0 }}>
        <Link
          href="/auth/login"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: "var(--ps-text-secondary)",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Volver al inicio de sesión
        </Link>
      </p>
    </AuthShell>
  );
}
