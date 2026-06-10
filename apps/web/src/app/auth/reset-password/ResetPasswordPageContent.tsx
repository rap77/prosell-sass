"use client";

/**
 * ResetPasswordPageContent — ProSell reset-password screen.
 * Uses AuthShell for the split brand+form layout.
 * Three render states: invalid-token, form (idle/loading/error), success.
 * Logic: react-hook-form + zod + authApi.resetPassword
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authApi } from "@/lib/api/authApi";
import { getErrorMessage } from "@/lib/utils/error";
import {
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
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

// ─── Local password field ─────────────────────────────────────────────────────

function PwField({
  id,
  label,
  value,
  onChange,
  onBlur,
  hasError,
  errorMsg,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  hasError: boolean;
  errorMsg?: string;
  disabled: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label
        htmlFor={id}
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: "var(--ps-text-secondary)",
        }}
      >
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          disabled={disabled}
          aria-invalid={hasError}
          style={{ ...authInputStyle(hasError), paddingRight: 44 }}
          onFocus={(e) => focusAuthInput(e.currentTarget, hasError)}
          onBlur={(e) => {
            blurAuthInput(e.currentTarget, hasError);
            onBlur();
          }}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Ocultar" : "Mostrar"}
          style={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            width: 32,
            height: 32,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: 0,
            borderRadius: 6,
            color: "var(--ps-text-secondary)",
            cursor: "pointer",
            transition: "color 180ms",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = "var(--ps-text-primary)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "var(--ps-text-secondary)")
          }
        >
          {show ? (
            <EyeOff size={16} strokeWidth={2} />
          ) : (
            <Eye size={16} strokeWidth={2} />
          )}
        </button>
      </div>
      {errorMsg && <AuthFieldError message={errorMsg} />}
    </div>
  );
}

// ─── Status panels (success / invalid-token) ──────────────────────────────────

function StatusPanel({ variant }: { variant: "success" | "invalid-token" }) {
  const isSuccess = variant === "success";
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
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: isSuccess
              ? "var(--ps-success-bg)"
              : "var(--ps-error-bg)",
            border: `1px solid ${isSuccess ? "rgba(34,211,160,0.25)" : "rgba(240,68,56,0.25)"}`,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isSuccess ? (
            <CheckCircle2
              size={28}
              style={{ color: "var(--ps-success)" }}
              strokeWidth={1.8}
            />
          ) : (
            <AlertTriangle
              size={28}
              style={{ color: "var(--ps-error)" }}
              strokeWidth={1.8}
            />
          )}
        </div>

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
            {isSuccess ? "¡Contraseña actualizada!" : "Enlace inválido"}
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
            {isSuccess
              ? "Tu contraseña se actualizó correctamente. Ya podés iniciar sesión."
              : "El enlace de recuperación no es válido o expiró. Solicitá uno nuevo."}
          </p>
        </div>

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
            {isSuccess ? "Iniciar sesión" : "Volver al inicio de sesión"}
          </Link>

          {!isSuccess && (
            <Link
              href="/auth/forgot-password"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                height: 44,
                background: "transparent",
                border: "1px solid var(--ps-input-border)",
                borderRadius: 8,
                color: "var(--ps-text-secondary)",
                fontSize: 14,
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Solicitar nuevo enlace
            </Link>
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
  const [tokenInvalid, setTokenInvalid] = useState(
    () => !token || token.trim() === "",
  );
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    mode: "onTouched",
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (data: ResetValues) => {
    if (!token || token.trim() === "") {
      // The component already renders the invalid-token panel when
      // tokenInvalid is true, so a re-submit is a no-op.
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
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        <Controller
          name="password"
          control={control}
          render={({ field, fieldState }) => (
            <PwField
              id="reset-password"
              label="Nueva contraseña"
              value={field.value}
              onChange={(v) => {
                field.onChange(v);
                if (apiError) setApiError(null);
              }}
              onBlur={field.onBlur}
              hasError={!!fieldState.error}
              errorMsg={fieldState.error?.message}
              disabled={isSubmitting}
            />
          )}
        />

        <Controller
          name="confirmPassword"
          control={control}
          render={({ field, fieldState }) => (
            <PwField
              id="reset-confirm-password"
              label="Confirmar contraseña"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              hasError={!!fieldState.error}
              errorMsg={fieldState.error?.message}
              disabled={isSubmitting}
            />
          )}
        />

        {apiError && <AuthErrorBanner message={apiError} />}

        <AuthSubmitButton
          label="Restablecer contraseña"
          loadingLabel="Restableciendo..."
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
