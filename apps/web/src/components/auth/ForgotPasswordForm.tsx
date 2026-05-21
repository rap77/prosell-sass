"use client";

/**
 * ForgotPasswordForm Component (Legacy)
 *
 * NOTA: Este componente es legacy. La implementación activa está en
 * app/auth/forgot-password/ForgotPasswordPageContent.tsx
 *
 * Migrado a ProSell design tokens — sin colores hardcodeados.
 * All colors via var(--ps-*) tokens — dark/light automatic.
 */

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authApi } from "@/lib/api/authApi";
import { getErrorMessage } from "@/lib/utils/error";
import { CheckCircle2, AlertCircle } from "lucide-react";

// ============================================
// SCHEMA & TYPES
// ============================================

const forgotPasswordSchema = z.object({
  email: z.string().min(1, "El email es requerido").email("El email no es válido"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

type FormState = "idle" | "loading" | "success" | "error";

// ============================================
// STYLES
// ============================================

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--ps-bg-base)',
  padding: '16px',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--ps-bg-surface)',
  border: '1px solid var(--ps-border-default)',
  borderRadius: 14,
  padding: 32,
};

// ============================================
// COMPONENT
// ============================================

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
    defaultValues: { email: "" },
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
      setErrorMessage(
        getErrorMessage(err, "No pudimos enviar el email. Intentá de nuevo."),
      );
    }
  };

  // ── Success state ──────────────────────────────────────────────────────────

  if (formState === "success" && submittedEmail) {
    return (
      <div style={pageStyle}>
        <div style={{ width: '100%', maxWidth: 440 }}>
          <div style={cardStyle}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'var(--ps-success-bg)',
                border: '1px solid rgba(34,211,160,0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
              }}>
                <CheckCircle2 size={28} strokeWidth={1.8} style={{ color: 'var(--ps-success)' }} />
              </div>

              <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ps-text-primary)' }}>
                Revisá tu email
              </h2>
              <p style={{ margin: '0 0 6px', fontSize: 14, color: 'var(--ps-text-secondary)', lineHeight: 1.6 }}>
                Te enviamos un enlace de recuperación a{' '}
                <span style={{ color: 'var(--ps-text-primary)', fontWeight: 600 }}>
                  {submittedEmail}
                </span>.
              </p>
              <p style={{ margin: '0 0 24px', fontSize: 13, color: 'var(--ps-text-disabled)', lineHeight: 1.6 }}>
                El enlace expira en 24 horas.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Link
                  href="/auth/login"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 44,
                    background: 'var(--ps-cyan)',
                    color: 'var(--ps-bg-base)',
                    border: 0,
                    borderRadius: 8,
                    fontSize: 15,
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Volver al inicio de sesión
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setFormState("idle");
                    setSubmittedEmail(null);
                  }}
                  style={{
                    height: 44,
                    background: 'transparent',
                    border: '1px solid var(--ps-border-default)',
                    borderRadius: 8,
                    color: 'var(--ps-text-secondary)',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Reenviar email
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Form state ─────────────────────────────────────────────────────────────

  const isDisabled = isSubmitting || formState === "loading";

  return (
    <div style={pageStyle}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={cardStyle}>
          <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ps-text-primary)' }}>
            ¿Olvidaste tu contraseña?
          </h2>
          <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--ps-text-secondary)', lineHeight: 1.5 }}>
            Ingresá tu email y te mandamos un enlace para recuperarla.
          </p>

          {formState === "error" && errorMessage && (
            <div
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                borderRadius: 8,
                marginBottom: 16,
                background: 'var(--ps-error-bg)',
                border: '1px solid rgba(240,68,56,0.25)',
              }}
            >
              <AlertCircle size={14} style={{ color: 'var(--ps-error)', flexShrink: 0 }} strokeWidth={2.5} />
              <p style={{ margin: 0, fontSize: 13, color: 'var(--ps-error)' }}>{errorMessage}</p>
            </div>
          )}

          <form
            onSubmit={handleSubmit(onSubmit)}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
            noValidate
          >
            {/* Email field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label
                htmlFor="forgot-email"
                style={{ fontSize: 13, fontWeight: 500, color: 'var(--ps-text-secondary)' }}
              >
                Dirección de email
              </label>
              <input
                {...register("email")}
                id="forgot-email"
                type="email"
                autoComplete="email"
                placeholder="vos@empresa.com"
                disabled={isDisabled}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "forgot-email-error" : undefined}
                style={{
                  height: 44,
                  padding: '0 14px',
                  background: 'var(--ps-input-bg)',
                  border: `1px solid ${errors.email ? 'var(--ps-error)' : 'var(--ps-input-border)'}`,
                  borderRadius: 8,
                  color: 'var(--ps-text-primary)',
                  fontSize: 15,
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                  transition: 'border-color 180ms',
                  opacity: isDisabled ? 0.6 : 1,
                }}
              />
              {errors.email && (
                <span
                  id="forgot-email-error"
                  role="alert"
                  style={{ fontSize: 12, color: 'var(--ps-error)' }}
                >
                  {errors.email.message}
                </span>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isDisabled}
              style={{
                marginTop: 8,
                width: '100%',
                height: 44,
                background: isDisabled ? 'rgba(77,184,255,0.4)' : 'var(--ps-cyan)',
                color: 'var(--ps-bg-base)',
                border: 0,
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                transition: 'background 180ms',
              }}
            >
              {formState === "loading" ? "Enviando..." : "Enviar enlace de recuperación"}
            </button>

            {/* Back link */}
            <div style={{ textAlign: 'center' }}>
              <Link
                href="/auth/login"
                style={{ fontSize: 13, color: 'var(--ps-text-secondary)', textDecoration: 'none', fontWeight: 500 }}
              >
                Volver al inicio de sesión
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
