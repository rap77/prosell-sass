"use client";

/**
 * Settings › Perfil — ProSell profile form.
 *
 * Uses shadcn/ui components (Input, Label, Button) with Tailwind utilities.
 * All colors via CSS custom properties — dark/light automatic.
 */

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  useCurrentOrganizationProfile,
  useUpdateProfile,
} from "@/lib/api/userApi";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const profileSchema = z.object({
  firstName: z.string().trim().min(1, { message: "El nombre es requerido" }),
  lastName: z.string().trim().min(1, { message: "El apellido es requerido" }),
  email: z.string().email({ message: "Correo inválido" }),
  phone: z.string().trim().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function SettingsProfilePage() {
  const { user, updateUser } = useAuth();
  const organizationQuery = useCurrentOrganizationProfile();
  const updateProfile = useUpdateProfile();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.first_name ?? "",
      lastName: user?.last_name ?? "",
      email: user?.email ?? "",
      phone: organizationQuery.data?.phone ?? "",
    },
  });

  useEffect(() => {
    form.reset({
      firstName: user?.first_name ?? "",
      lastName: user?.last_name ?? "",
      email: user?.email ?? "",
      phone: organizationQuery.data?.phone ?? "",
    });
  }, [
    form,
    organizationQuery.data?.phone,
    user?.email,
    user?.first_name,
    user?.last_name,
  ]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await updateProfile.mutateAsync({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
        // ponytail: organizationId removed — backend derives from session (tenant spoofing prevention)
      });
      updateUser({
        first_name: values.firstName,
        last_name: values.lastName,
        email: values.email,
      });
      toast.success("Perfil actualizado", {
        description: "Tus cambios se guardaron correctamente.",
      });
    } catch (error) {
      toast.error("No se pudo actualizar el perfil", {
        description:
          error instanceof Error
            ? error.message
            : "Inténtalo de nuevo en unos segundos.",
      });
    }
  });

  const isPending = updateProfile.isPending || organizationQuery.isLoading;
  const { errors } = form.formState;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Perfil</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Actualizá tu información personal visible dentro de ProSell.
        </p>
      </div>

      <div className="h-px bg-border" />

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {/* Name row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="firstName">Nombre</Label>
            <Input
              id="firstName"
              autoComplete="given-name"
              {...form.register("firstName")}
            />
            {errors.firstName && (
              <p className="text-xs text-destructive">
                {errors.firstName.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lastName">Apellido</Label>
            <Input
              id="lastName"
              autoComplete="family-name"
              {...form.register("lastName")}
            />
            {errors.lastName && (
              <p className="text-xs text-destructive">
                {errors.lastName.message}
              </p>
            )}
          </div>
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            {...form.register("email")}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        {/* Phone */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">Teléfono</Label>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+54 11 0000 0000"
            {...form.register("phone")}
          />
          <p className="text-xs text-muted-foreground">
            Contacto principal de tu organización.
          </p>
          {errors.phone && (
            <p className="text-xs text-destructive">{errors.phone.message}</p>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-1">
          <Button
            type="submit"
            disabled={isPending}
            className="w-full md:w-auto"
          >
            {isPending && <Loader2 className="animate-spin" />}
            {isPending ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </div>
  );
}
