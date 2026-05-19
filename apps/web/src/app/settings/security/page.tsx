"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Shield, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  useChangePassword,
  useDisableTwoFactor,
  mapSecurityErrorMessage,
} from "@/lib/api/userApi";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const securitySchema = z
  .object({
    currentPassword: z.string().min(1, "La contraseña actual es requerida"),
    newPassword: z
      .string()
      .min(8, "La nueva contraseña debe tener al menos 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirma tu nueva contraseña"),
  })
  .superRefine((value, context) => {
    if (value.newPassword !== value.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "La confirmación no coincide con la nueva contraseña",
      });
    }

    if (value.currentPassword === value.newPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newPassword"],
        message: "La nueva contraseña debe ser diferente a la actual",
      });
    }
  });

type SecurityFormValues = z.infer<typeof securitySchema>;

export default function SettingsSecurityPage() {
  const router = useRouter();
  const { is2FAEnabled, updateUser } = useAuth();
  const changePassword = useChangePassword();
  const disableTwoFactor = useDisableTwoFactor();
  const [disableCode, setDisableCode] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
      const description =
        error instanceof Error
          ? mapSecurityErrorMessage(error.message)
          : "Inténtalo de nuevo en unos segundos.";

      toast.error("No se pudo actualizar la contraseña", {
        description,
      });
    }
  });

  async function handleDisableTwoFactor() {
    try {
      await disableTwoFactor.mutateAsync({
        totpCode: disableCode,
      });

      updateUser({ is_2fa_enabled: false });
      setDisableCode("");
      setIsDialogOpen(false);

      toast.success("2FA deshabilitado", {
        description: "Tu cuenta volvió a usar solo contraseña.",
      });
    } catch (error) {
      const description =
        error instanceof Error
          ? mapSecurityErrorMessage(error.message)
          : "No se pudo deshabilitar 2FA.";

      toast.error("No se pudo deshabilitar 2FA", {
        description,
      });
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold">Seguridad</h2>
        <p className="text-sm text-muted-foreground">
          Protege tu acceso con una contraseña robusta y autenticación de dos
          factores.
        </p>
      </div>

      <section className="space-y-6">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Cambiar contraseña</h3>
          <p className="text-sm text-muted-foreground">
            Usa una contraseña nueva con al menos 8 caracteres.
          </p>
        </div>

        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Contraseña actual</Label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              {...form.register("currentPassword")}
            />
            {form.formState.errors.currentPassword ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.currentPassword.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">Nueva contraseña</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              {...form.register("newPassword")}
            />
            <p className="text-sm text-muted-foreground">
              Debe incluir mayúsculas, minúsculas, números y un carácter especial.
            </p>
            {form.formState.errors.newPassword ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.newPassword.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar nueva contraseña</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...form.register("confirmPassword")}
            />
            {form.formState.errors.confirmPassword ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.confirmPassword.message}
              </p>
            ) : null}
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={changePassword.isPending}>
              {changePassword.isPending ? "Guardando..." : "Actualizar contraseña"}
            </Button>
          </div>
        </form>
      </section>

      <Separator />

      <section className="space-y-6">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">
            Autenticación de dos factores
          </h3>
          <p className="text-sm text-muted-foreground">
            Agrega una capa adicional de seguridad a tu cuenta.
          </p>
        </div>

        <div className="rounded-xl border bg-muted/30 p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {is2FAEnabled ? (
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                ) : (
                  <Shield className="h-5 w-5 text-muted-foreground" />
                )}
                <p className="font-medium">
                  {is2FAEnabled ? "2FA habilitado" : "2FA deshabilitado"}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                {is2FAEnabled
                  ? "Tu cuenta requiere un código adicional al iniciar sesión."
                  : "Actívalo para proteger mejor el acceso a tu cuenta."}
              </p>
            </div>

            {is2FAEnabled ? (
              <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="outline">Deshabilitar 2FA</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Deshabilitar 2FA</AlertDialogTitle>
                    <AlertDialogDescription>
                      Confirma el código de tu aplicación autenticadora para
                      desactivar la protección de dos factores.
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  <div className="space-y-2">
                    <Label htmlFor="disable-2fa-code">Código TOTP</Label>
                    <Input
                      id="disable-2fa-code"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="123456"
                      value={disableCode}
                      onChange={(event) => {
                        setDisableCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                      }}
                    />
                    <p className="text-sm text-muted-foreground">
                      Ingresa el código actual de 6 dígitos generado por tu app.
                    </p>
                  </div>

                  <AlertDialogFooter>
                    <AlertDialogCancel
                      onClick={() => {
                        setDisableCode("");
                      }}
                    >
                      Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={(event) => {
                        event.preventDefault();
                        void handleDisableTwoFactor();
                      }}
                      disabled={
                        disableTwoFactor.isPending || disableCode.trim().length !== 6
                      }
                    >
                      {disableTwoFactor.isPending
                        ? "Deshabilitando..."
                        : "Confirmar"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Button onClick={() => router.push("/auth/setup-2fa")}>
                Habilitar 2FA
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
