"use client";

/**
 * ResetPasswordForm Component (Legacy)
 *
 * NOTA: Este componente es legacy. La implementación activa está en
 * app/auth/reset-password/ResetPasswordPageContent.tsx
 *
 * Migrado a ProSell design tokens — sin colores hardcodeados.
 * All colors via var(--ps-*) tokens — dark/light automatic.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authApi } from "@/lib/api/authApi";
import { getErrorMessage } from "@/lib/utils/error";
import { PasswordInput } from "./PasswordInput";
import { CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";

// ============================================
// SCHEMA & TYPES
// ============================================

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

type FormState = "idle" | "loading" | "success" | "error";

interface ResetPasswordFormProps {
  token?: string;
}

// ============================================
// STYLES
// ============================================

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--ps-bg-base)",
  padding: "16px",
};

const cardStyle: React.CSSProperties = {
  background: "var(--ps-bg-surface)",
  border: "1px solid var(--ps-border-default)",
  borderRadius: 14,
  padding: 32,
};

// ============================================
// COMPONENT
// ============================================

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<boolean>(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onTouched",
    defaultValues: { password: "", confirmPassword: "" },
  });

  // Validar token al montar
  useEffect(() => {
    if (!token || token.trim() === "") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTokenError(true);
    }
  }, [token]);

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!token || token.trim() === "") {
      setTokenError(true);
      return;
    }

    setFormState("loading");
    setErrorMessage(null);

    try {
      await authApi.resetPassword(token, data.password);
      setFormState("success");
    } catch (err) {
      setFormState("error");
      setErrorMessage(
        getErrorMessage(
          err,
          "No pudimos restablecer tu contraseña. Intentá de nuevo.",
        ),
      );
    }
  };

  // ── Token inválido ─────────────────────────────────────────────────────────

  if (tokenError) {
    return (
      <div style={pageStyle}>
        <div style={{ width: "100%", maxWidth: 440 }}>
          <div style={cardStyle}>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "var(--ps-error-bg)",
                  border: "1px solid rgba(240,68,56,0.25)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 20,
                }}
              >
                <AlertTriangle
                  size={28}
                  strokeWidth={1.8}
                  style={{ color: "var(--ps-error)" }}
                />
              </div>

              <h2
                style={{
                  margin: "0 0 8px",
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  color: "var(--ps-text-primary)",
                }}
              >
                Enlace inválido
              </h2>
              <p
                style={{
                  margin: "0 0 24px",
                  fontSize: 14,
                  color: "var(--ps-text-secondary)",
                  lineHeight: 1.6,
                }}
              >
                El enlace de recuperación no es válido o expiró. Solicitá uno
                nuevo.
              </p>

              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                <Link
                  href="/auth/forgot-password"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: 44,
                    background: "var(--ps-cyan)",
                    color: "var(--ps-bg-base)",
                    border: 0,
                    borderRadius: 8,
                    fontSize: 15,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Solicitar nuevo enlace
                </Link>
                <Link
                  href="/auth/login"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: 44,
                    background: "transparent",
                    color: "var(--ps-text-secondary)",
                    border: "1px solid var(--ps-border-default)",
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 500,
                    textDecoration: "none",
                  }}
                >
                  Volver al inicio de sesión
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Success ────────────────────────────────────────────────────────────────

  if (formState === "success") {
    return (
      <div style={pageStyle}>
        <div style={{ width: "100%", maxWidth: 440 }}>
          <div style={cardStyle}>
            <div style={{ textAlign: "center" }}>
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
                  marginBottom: 20,
                }}
              >
                <CheckCircle2
                  size={28}
                  strokeWidth={1.8}
                  style={{ color: "var(--ps-success)" }}
                />
              </div>

              <h2
                style={{
                  margin: "0 0 8px",
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  color: "var(--ps-text-primary)",
                }}
              >
                ¡Contraseña actualizada!
              </h2>
              <p
                style={{
                  margin: "0 0 24px",
                  fontSize: 14,
                  color: "var(--ps-text-secondary)",
                  lineHeight: 1.6,
                }}
              >
                Tu contraseña se actualizó correctamente. Ya podés iniciar
                sesión.
              </p>

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
                  textDecoration: "none",
                }}
              >
                Iniciar sesión
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────

  const isDisabled = isSubmitting || formState === "loading";

  return (
    <div style={pageStyle}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={cardStyle}>
          <h2
            style={{
              margin: "0 0 6px",
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--ps-text-primary)",
            }}
          >
            Nueva contraseña
          </h2>
          <p
            style={{
              margin: "0 0 24px",
              fontSize: 14,
              color: "var(--ps-text-secondary)",
              lineHeight: 1.5,
            }}
          >
            Elegí una contraseña segura para tu cuenta.
          </p>

          {formState === "error" && errorMessage && (
            <div
              role="alert"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                borderRadius: 8,
                marginBottom: 16,
                background: "var(--ps-error-bg)",
                border: "1px solid rgba(240,68,56,0.25)",
              }}
            >
              <AlertCircle
                size={14}
                style={{ color: "var(--ps-error)", flexShrink: 0 }}
                strokeWidth={2.5}
              />
              <p style={{ margin: 0, fontSize: 13, color: "var(--ps-error)" }}>
                {errorMessage}
              </p>
            </div>
          )}

          <form
            onSubmit={handleSubmit(onSubmit)}
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            <Controller
              name="password"
              control={control}
              render={({ field, fieldState }) => (
                <PasswordInput
                  label="Nueva contraseña"
                  name="password"
                  placeholder="Ingresá tu nueva contraseña"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={fieldState.error?.message || null}
                  disabled={isDisabled}
                  required
                />
              )}
            />

            <Controller
              name="confirmPassword"
              control={control}
              render={({ field, fieldState }) => (
                <PasswordInput
                  label="Confirmá la contraseña"
                  name="confirmPassword"
                  placeholder="Confirmá tu nueva contraseña"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={fieldState.error?.message || null}
                  disabled={isDisabled}
                  required
                />
              )}
            />

            <button
              type="submit"
              disabled={isDisabled}
              style={{
                marginTop: 8,
                width: "100%",
                height: 44,
                background: isDisabled
                  ? "rgba(77,184,255,0.4)"
                  : "var(--ps-cyan)",
                color: "var(--ps-bg-base)",
                border: 0,
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                cursor: isDisabled ? "not-allowed" : "pointer",
                transition: "background 180ms",
              }}
            >
              {formState === "loading"
                ? "Restableciendo..."
                : "Restablecer contraseña"}
            </button>

            <div style={{ textAlign: "center" }}>
              <Link
                href="/auth/login"
                style={{
                  fontSize: 13,
                  color: "var(--ps-text-secondary)",
                  textDecoration: "none",
                  fontWeight: 500,
                }}
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
