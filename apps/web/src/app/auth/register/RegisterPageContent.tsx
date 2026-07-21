"use client";

/**
 * RegisterPageContent — ProSell register screen.
 * Uses AuthShell for the split brand+form layout.
 */

import { useState } from "react";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
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
import { Checkbox } from "@/components/ui/checkbox";

// ─── Schema ────────────────────────────────────────────────────────────────────

const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(2, { message: "Mínimo 2 caracteres" })
      .max(100)
      .trim(),
    email: z
      .string()
      .min(1, { message: "El email es requerido" })
      .email({ message: "El email no es válido" }),
    password: z
      .string()
      .min(8, { message: "Mínimo 8 caracteres" })
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
        {
          message:
            "Debe tener mayúscula, minúscula, número y símbolo (@$!%*?&)",
        },
      ),
    confirmPassword: z.string().min(1, { message: "Confirmá tu contraseña" }),
    acceptTerms: z
      .boolean()
      .refine((v) => v === true, { message: "Debés aceptar los términos" }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  }) as z.ZodType<{
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}>;

type RegisterValues = z.infer<typeof registerSchema>;

// ─── Name splitter ────────────────────────────────────────────────────────────

function splitName(fullName: string) {
  const parts = fullName.trim().split(" ");
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
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
      <div className="grid grid-cols-2 gap-2.5">
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

      <AuthDivider label="o registrate con email" />

      {/* ── Form ──────────────────────────────────────────────────────────── */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4"
      >
        {/* Full name */}
        <div className="flex flex-col gap-1.5">
          <AuthLabel htmlFor="fullName">Nombre completo</AuthLabel>
          <AuthInput
            {...register("fullName", { onChange: () => error && clearError() })}
            id="fullName"
            type="text"
            placeholder="Juan Pérez"
            autoComplete="name"
            disabled={isDisabled}
            hasError={!!errors.fullName}
            aria-invalid={!!errors.fullName}
          />
          {errors.fullName && (
            <AuthFieldError message={errors.fullName.message ?? ""} />
          )}
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <AuthLabel htmlFor="reg-email">Email</AuthLabel>
          <AuthInput
            {...register("email", { onChange: () => error && clearError() })}
            id="reg-email"
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
          <AuthLabel htmlFor="reg-password">Contraseña</AuthLabel>
          <Controller
            name="password"
            control={control}
            render={({ field, fieldState }) => (
              <AuthPasswordInput
                id="reg-password"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                disabled={isDisabled}
                hasError={!!fieldState.error}
                aria-invalid={!!fieldState.error}
              />
            )}
          />
          {errors.password && (
            <AuthFieldError message={errors.password.message ?? ""} />
          )}
        </div>

        {/* Confirm password */}
        <div className="flex flex-col gap-1.5">
          <AuthLabel htmlFor="reg-confirm-password">
            Confirmar contraseña
          </AuthLabel>
          <Controller
            name="confirmPassword"
            control={control}
            render={({ field, fieldState }) => (
              <AuthPasswordInput
                id="reg-confirm-password"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                disabled={isDisabled}
                hasError={!!fieldState.error}
                aria-invalid={!!fieldState.error}
              />
            )}
          />
          {errors.confirmPassword && (
            <AuthFieldError message={errors.confirmPassword.message ?? ""} />
          )}
        </div>

        {/* Terms checkbox */}
        <Controller
          name="acceptTerms"
          control={control}
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-1.5">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isDisabled}
                  className="mt-0.5"
                />
                <span className="text-[13px] text-muted-foreground leading-relaxed">
                  Acepto los{" "}
                  <Link
                    href="/terms"
                    className="text-primary no-underline font-medium"
                  >
                    Términos de Servicio
                  </Link>{" "}
                  y la{" "}
                  <Link
                    href="/privacy"
                    className="text-primary no-underline font-medium"
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

      <AuthFooterLink
        text="¿Ya tenés cuenta?"
        href="/auth/login"
        linkText="Iniciar sesión →"
      />
    </AuthShell>
  );
}
