"use client";

/**
 * Settings › Seguridad — ProSell security settings.
 *
 * Sections:
 *   1. Change password (react-hook-form + zod + useChangePassword)
 *   2. Two-factor authentication (useDisableTwoFactor + TOTP confirm dialog)
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Shield, ShieldCheck, Loader2, Eye, EyeOff, X } from "lucide-react";
import { toast } from "sonner";
import {
  useChangePassword,
  useDisableTwoFactor,
  mapSecurityErrorMessage,
} from "@/lib/api/userApi";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const securitySchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, { message: "La contraseña actual es requerida" }),
    newPassword: z.string().min(8, {
      message: "La nueva contraseña debe tener al menos 8 caracteres",
    }),
    confirmPassword: z
      .string()
      .min(1, { message: "Confirmá tu nueva contraseña" }),
  })
  .superRefine((value, ctx) => {
    if (value.newPassword !== value.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "La confirmación no coincide con la nueva contraseña",
      });
    }
    if (value.currentPassword === value.newPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newPassword"],
        message: "La nueva contraseña debe ser diferente a la actual",
      });
    }
  }) as z.ZodType<{
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}>;

type SecurityFormValues = z.infer<typeof securitySchema>;

// Password field with show/hide toggle
function PasswordField({
  id,
  label,
  hint,
  error,
  autoComplete,
  ...inputProps
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  autoComplete: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          className="pr-10"
          {...inputProps}
        />
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(e) => {
            e.preventDefault();
            setShow((v) => !v);
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-ps-tertiary hover:text-foreground"
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// Disable 2FA modal
function Disable2FAModal({
  open,
  onClose,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (code: string) => void;
  isPending: boolean;
}) {
  const [code, setCode] = useState("");

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-background/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[420px] bg-card border border-border rounded-xl p-7 flex flex-col gap-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-base font-bold text-foreground">
              Deshabilitar 2FA
            </p>
            <p className="mt-1.5 text-[13px] text-muted-foreground leading-relaxed">
              Confirmá el código de tu aplicación autenticadora para desactivar
              la protección de dos factores.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-ps-tertiary hover:text-foreground shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* TOTP input */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="totp-code">Código TOTP</Label>
          <Input
            id="totp-code"
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            className="text-center text-lg font-semibold tracking-widest"
          />
          <p className="text-xs text-muted-foreground">
            Ingresá el código actual de 6 dígitos generado por tu app.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2.5 justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending || code.trim().length !== 6}
            onClick={() => onConfirm(code)}
          >
            {isPending && <Loader2 className="animate-spin" />}
            {isPending ? "Deshabilitando…" : "Confirmar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsSecurityPage() {
  const router = useRouter();
  const { is2FAEnabled, updateUser } = useAuth();
  const changePassword = useChangePassword();
  const disableTwoFactor = useDisableTwoFactor();
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<SecurityFormValues>({
    resolver: zodResolver(securitySchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await changePassword.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast.success("Contraseña actualizada", {
        description: "Tu contraseña se guardó correctamente.",
      });
      form.reset();
    } catch (error) {
      toast.error("No se pudo actualizar la contraseña", {
        description:
          error instanceof Error
            ? mapSecurityErrorMessage(error.message)
            : "Inténtalo de nuevo en unos segundos.",
      });
    }
  });

  async function handleDisable2FA(code: string) {
    try {
      await disableTwoFactor.mutateAsync({ totpCode: code });
      updateUser({ is_2fa_enabled: false });
      setDialogOpen(false);
      toast.success("2FA deshabilitado", {
        description: "Tu cuenta volvió a usar solo contraseña.",
      });
    } catch (error) {
      toast.error("No se pudo deshabilitar 2FA", {
        description:
          error instanceof Error
            ? mapSecurityErrorMessage(error.message)
            : "No se pudo deshabilitar 2FA.",
      });
    }
  }

  const { errors } = form.formState;

  return (
    <div className="flex flex-col gap-8">
      {/* Change password section */}
      <section className="flex flex-col gap-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Seguridad</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Protegé tu acceso con una contraseña robusta y autenticación de dos
            factores.
          </p>
        </div>

        <div className="h-px bg-ps-border-subtle" />

        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Cambiar contraseña
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Usá una contraseña nueva con al menos 8 caracteres.
          </p>
        </div>

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <PasswordField
            id="currentPassword"
            label="Contraseña actual"
            autoComplete="current-password"
            error={errors.currentPassword?.message}
            {...form.register("currentPassword")}
          />

          <PasswordField
            id="newPassword"
            label="Nueva contraseña"
            autoComplete="new-password"
            hint="Debe incluir mayúsculas, minúsculas, números y un carácter especial."
            error={errors.newPassword?.message}
            {...form.register("newPassword")}
          />

          <PasswordField
            id="confirmPassword"
            label="Confirmar nueva contraseña"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...form.register("confirmPassword")}
          />

          <div className="flex justify-end pt-1">
            <Button type="submit" disabled={changePassword.isPending}>
              {changePassword.isPending && <Loader2 className="animate-spin" />}
              {changePassword.isPending
                ? "Actualizando…"
                : "Actualizar contraseña"}
            </Button>
          </div>
        </form>
      </section>

      <div className="h-px bg-ps-border-subtle" />

      {/* Two-factor authentication section */}
      <section className="flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Autenticación de dos factores
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Agregá una capa adicional de seguridad a tu cuenta.
          </p>
        </div>

        {/* Status card */}
        <div className="flex items-center justify-between gap-5 p-4 rounded-[10px] bg-ps-elevated border border-ps-border-subtle">
          {/* Left: icon + status text */}
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-[38px] h-[38px] rounded-[10px] flex items-center justify-center shrink-0 border",
                is2FAEnabled
                  ? "bg-ps-success-bg border-ps-success/25"
                  : "bg-card border-border",
              )}
            >
              {is2FAEnabled ? (
                <ShieldCheck size={18} className="text-ps-success" />
              ) : (
                <Shield size={18} className="text-ps-tertiary" />
              )}
            </div>
            <div>
              <p className="text-[13px] font-semibold text-foreground">
                {is2FAEnabled ? "2FA habilitado" : "2FA deshabilitado"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {is2FAEnabled
                  ? "Tu cuenta requiere un código adicional al iniciar sesión."
                  : "Activalo para proteger mejor el acceso a tu cuenta."}
              </p>
            </div>
          </div>

          {/* Right: action button */}
          {is2FAEnabled ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(true)}
              className="shrink-0 hover:border-destructive hover:text-destructive"
            >
              Deshabilitar 2FA
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => router.push("/auth/setup-2fa")}
              className="shrink-0"
            >
              Habilitar 2FA
            </Button>
          )}
        </div>
      </section>

      {/* Disable 2FA modal */}
      <Disable2FAModal
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleDisable2FA}
        isPending={disableTwoFactor.isPending}
      />
    </div>
  );
}
