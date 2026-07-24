"use client";

/**
 * LoginPageContent — ProSell login screen.
 * Uses AuthShell for the split brand+form layout.
 */

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/stores/authStore";
import {
  AuthShell,
  AuthFormHead,
  AuthFieldError,
  AuthErrorBanner,
  AuthDivider,
  AuthSubmitButton,
  AuthInput,
  AuthPasswordInput,
  AuthLabel,
  AuthOAuthButton,
  AuthFooterLink,
} from "@/components/auth/AuthShell";
import Link from "next/link";

// ─── Schema ───────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: "El email es requerido" })
    .email({ message: "El email no es válido" }),
  password: z
    .string()
    .min(1, { message: "La contraseña es requerida" })
    .min(8, { message: "Mínimo 8 caracteres" }),
});
type LoginValues = z.infer<typeof loginSchema>;

// ─── OAuth SVG icons ──────────────────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export function LoginPageContent() {
  const { login, isLoading, error, clearError } = useAuth();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loadingOAuth, setLoadingOAuth] = useState<string | null>(null);
  // ponytail: use global store flag instead of local state to survive navigation
  const setNavigating = useAuthStore((s) => s.setNavigating);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
    defaultValues: { email: "", password: "" },
  });

  const isDisabled = isLoading || isSubmitting || isPending;

  const onSubmit = async (data: LoginValues) => {
    if (isDisabled) return;
    startTransition(async () => {
      await login(data.email, data.password);
      // ponytail: only navigate if login succeeded (store.login sets error, doesn't throw)
      const { isAuthenticated } = useAuthStore.getState();
      if (isAuthenticated) {
        setNavigating(true);
        router.push("/dashboard");
      }
    });
  };

  return (
    <AuthShell>
      <AuthFormHead
        title="Bienvenido de vuelta"
        subtitle="Ingresá tu cuenta para continuar"
      />

      {/* ── Form ──────────────────────────────────────────────────────────── */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        autoComplete="on"
        noValidate
        className="flex flex-col gap-4 md:gap-5"
      >
        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <AuthLabel htmlFor="email">Email</AuthLabel>
          <AuthInput
            {...register("email", { onChange: () => error && clearError() })}
            id="email"
            type="email"
            placeholder="vos@empresa.com"
            autoComplete="email"
            disabled={isDisabled}
            hasError={!!errors.email}
            aria-invalid={!!errors.email}
          />
          {errors.email && (
            <AuthFieldError message={errors.email.message ?? ""} />
          )}
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <AuthLabel htmlFor="login-password">Contraseña</AuthLabel>
            <Link
              href="/auth/forgot-password"
              className="text-xs text-primary no-underline font-medium"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <AuthPasswordInput
            {...register("password", { onChange: () => error && clearError() })}
            id="login-password"
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={isDisabled}
            hasError={!!errors.password}
            aria-invalid={!!errors.password}
          />
          {errors.password && (
            <AuthFieldError message={errors.password.message ?? ""} />
          )}
        </div>

        {error && <AuthErrorBanner message={error.message} />}

        <AuthSubmitButton
          label="Iniciar sesión"
          loadingLabel="Ingresando..."
          isLoading={isLoading || isPending}
          disabled={isDisabled}
        />
      </form>

      <AuthDivider label="o continuá con" />

      {/* OAuth */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <AuthOAuthButton
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
        <AuthOAuthButton
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

      <AuthFooterLink
        text="¿No tenés cuenta?"
        href="/auth/register"
        linkText="Registrate gratis →"
      />
    </AuthShell>
  );
}
