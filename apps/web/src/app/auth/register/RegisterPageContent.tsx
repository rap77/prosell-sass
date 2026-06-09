"use client";

/**
 * RegisterPageContent — ProSell register screen.
 * Uses AuthShell for the split brand+form layout.
 * Logic: react-hook-form + zod + useAuth().register
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/stores/authStore";
import { Eye, EyeOff } from "lucide-react";
import {
  AuthShell,
  AuthFormHead,
  AuthFieldError,
  AuthErrorBanner,
  AuthDivider,
  AuthSubmitButton,
  authInputStyle,
  focusAuthInput,
  blurAuthInput,
} from "@/components/auth/AuthShell";

// ─── Schema (same as RegisterForm) ────────────────────────────────────────────

const registerSchema = z
  .object({
    fullName: z.string().min(2, "Mínimo 2 caracteres").max(100).trim(),
    email: z
      .string()
      .min(1, "El email es requerido")
      .email("El email no es válido"),
    password: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
        "Debe tener mayúscula, minúscula, número y símbolo (@$!%*?&)",
      ),
    confirmPassword: z.string().min(1, "Confirmá tu contraseña"),
    acceptTerms: z
      .boolean()
      .refine((v) => v === true, { message: "Debés aceptar los términos" }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type RegisterValues = z.infer<typeof registerSchema>;

// ─── Name splitter ────────────────────────────────────────────────────────────

function splitName(fullName: string) {
  const parts = fullName.trim().split(" ");
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

// ─── Password field ───────────────────────────────────────────────────────────

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

// ─── OAuth SVGs ───────────────────────────────────────────────────────────────

function GoogleSvg() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1-3.3 0-6-2.74-6-6.1s2.7-6.1 6-6.1c1.88 0 3.14.8 3.86 1.5l2.64-2.55C16.83 3.4 14.66 2.4 12 2.4 6.78 2.4 2.6 6.58 2.6 11.8s4.18 9.4 9.4 9.4c5.43 0 9.02-3.82 9.02-9.2 0-.62-.07-1.1-.15-1.6H12z"
      />
    </svg>
  );
}
function MicrosoftSvg() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="2" width="9" height="9" fill="#F25022" />
      <rect x="13" y="2" width="9" height="9" fill="#7FBA00" />
      <rect x="2" y="13" width="9" height="9" fill="#00A4EF" />
      <rect x="13" y="13" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}
function OAuthBtn({
  label,
  icon,
  loading,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      style={{
        height: 40,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        background: "transparent",
        border: "1px solid var(--ps-input-border)",
        borderRadius: 8,
        color: "var(--ps-text-secondary)",
        fontSize: 13,
        fontWeight: 500,
        cursor: loading ? "not-allowed" : "pointer",
        transition: "border-color 180ms, color 180ms, background 180ms",
        opacity: loading ? 0.6 : 1,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--ps-border-strong)";
        e.currentTarget.style.color = "var(--ps-text-primary)";
        e.currentTarget.style.background = "var(--ps-hover-bg-xs)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--ps-input-border)";
        e.currentTarget.style.color = "var(--ps-text-secondary)";
        e.currentTarget.style.background = "transparent";
      }}
    >
      {icon}
      {label}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function RegisterPageContent() {
  const { register: registerUser, isLoading, error, clearError } = useAuth();
  const router = useRouter();
  const [loadingOAuth, setLoadingOAuth] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    mode: "onTouched",
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },
  });

  const isDisabled = isLoading || isSubmitting;

  // Clear validation cache on unmount
  useEffect(() => () => {}, []);

  const onSubmit = async (data: RegisterValues) => {
    if (isDisabled) return;
    const { firstName, lastName } = splitName(data.fullName);
    await registerUser(data.email.trim(), data.password, firstName, lastName);
    if (!useAuthStore.getState().error) {
      router.push("/auth/verify-email");
    }
  };

  return (
    <AuthShell>
      <AuthFormHead
        title="Creá tu cuenta"
        subtitle="14 días gratis · sin tarjeta de crédito"
      />

      {/* OAuth first (matches design order) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <OAuthBtn
          label="Google"
          icon={<GoogleSvg />}
          loading={loadingOAuth === "google"}
          onClick={() => {
            setLoadingOAuth("google");
            const b =
              process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
            window.location.href = `${b}/api/auth/oauth/google/authorize`;
          }}
        />
        <OAuthBtn
          label="Microsoft"
          icon={<MicrosoftSvg />}
          loading={loadingOAuth === "microsoft"}
          onClick={() => {
            setLoadingOAuth("microsoft");
            const b =
              process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
            window.location.href = `${b}/api/auth/oauth/microsoft/authorize`;
          }}
        />
      </div>

      <AuthDivider label="o registrate con email" />

      {/* ── Form ──────────────────────────────────────────────────────────── */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        {/* Full name */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label
            htmlFor="fullName"
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--ps-text-secondary)",
            }}
          >
            Nombre completo
          </label>
          <input
            {...register("fullName", { onChange: () => error && clearError() })}
            id="fullName"
            type="text"
            placeholder="Juan Pérez"
            autoComplete="name"
            disabled={isDisabled}
            aria-invalid={!!errors.fullName}
            style={authInputStyle(!!errors.fullName)}
            onFocus={(e) => focusAuthInput(e.currentTarget, !!errors.fullName)}
            onBlur={(e) => blurAuthInput(e.currentTarget, !!errors.fullName)}
          />
          {errors.fullName && (
            <AuthFieldError message={errors.fullName.message ?? ""} />
          )}
        </div>

        {/* Email */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label
            htmlFor="reg-email"
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--ps-text-secondary)",
            }}
          >
            Email
          </label>
          <input
            {...register("email", { onChange: () => error && clearError() })}
            id="reg-email"
            type="email"
            placeholder="vos@empresa.com"
            autoComplete="email"
            disabled={isDisabled}
            aria-invalid={!!errors.email}
            style={authInputStyle(!!errors.email)}
            onFocus={(e) => focusAuthInput(e.currentTarget, !!errors.email)}
            onBlur={(e) => blurAuthInput(e.currentTarget, !!errors.email)}
          />
          {errors.email && (
            <AuthFieldError message={errors.email.message ?? ""} />
          )}
        </div>

        {/* Password */}
        <Controller
          name="password"
          control={control}
          render={({ field, fieldState }) => (
            <PwField
              id="reg-password"
              label="Contraseña"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              hasError={!!fieldState.error}
              errorMsg={fieldState.error?.message}
              disabled={isDisabled}
            />
          )}
        />

        {/* Confirm password */}
        <Controller
          name="confirmPassword"
          control={control}
          render={({ field, fieldState }) => (
            <PwField
              id="reg-confirm-password"
              label="Confirmar contraseña"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              hasError={!!fieldState.error}
              errorMsg={fieldState.error?.message}
              disabled={isDisabled}
            />
          )}
        />

        {/* Terms checkbox */}
        <Controller
          name="acceptTerms"
          control={control}
          render={({ field, fieldState }) => (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={field.onChange}
                  disabled={isDisabled}
                  style={{
                    marginTop: 2,
                    accentColor: "var(--ps-cyan)",
                    width: 16,
                    height: 16,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 13,
                    color: "var(--ps-text-secondary)",
                    lineHeight: 1.5,
                  }}
                >
                  Acepto los{" "}
                  <Link
                    href="/terms"
                    style={{
                      color: "var(--ps-cyan)",
                      textDecoration: "none",
                      fontWeight: 500,
                    }}
                  >
                    Términos de Servicio
                  </Link>{" "}
                  y la{" "}
                  <Link
                    href="/privacy"
                    style={{
                      color: "var(--ps-cyan)",
                      textDecoration: "none",
                      fontWeight: 500,
                    }}
                  >
                    Política de Privacidad
                  </Link>
                </span>
              </label>
              {fieldState.error && (
                <AuthFieldError message={fieldState.error.message ?? ""} />
              )}
            </div>
          )}
        />

        {error && <AuthErrorBanner message={error.message} />}

        <AuthSubmitButton
          label="Crear cuenta"
          loadingLabel="Creando cuenta..."
          isLoading={isLoading}
          disabled={isDisabled}
        />
      </form>

      <p
        style={{
          textAlign: "center",
          fontSize: 13,
          color: "var(--ps-text-secondary)",
          margin: 0,
        }}
      >
        ¿Ya tenés cuenta?
        <Link
          href="/auth/login"
          style={{
            color: "var(--ps-cyan)",
            textDecoration: "none",
            fontWeight: 600,
            marginLeft: 4,
          }}
        >
          Iniciar sesión →
        </Link>
      </p>
    </AuthShell>
  );
}
