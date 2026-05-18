"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import {
  useCurrentOrganizationProfile,
  useUpdateProfile,
} from "@/lib/api/userApi";

const profileSchema = z.object({
  firstName: z.string().trim().min(1, "El nombre es requerido"),
  lastName: z.string().trim().min(1, "El apellido es requerido"),
  email: z.string().trim().email("Correo inválido"),
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
        organizationId: organizationQuery.data?.id,
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

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold">Perfil</h2>
        <p className="text-sm text-muted-foreground">
          Actualiza tu información personal visible dentro de ProSell.
        </p>
      </div>

      <form className="space-y-6" onSubmit={onSubmit} noValidate>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">Nombre</Label>
            <Input
              id="firstName"
              autoComplete="given-name"
              {...form.register("firstName")}
            />
            {form.formState.errors.firstName ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.firstName.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Apellido</Label>
            <Input
              id="lastName"
              autoComplete="family-name"
              {...form.register("lastName")}
            />
            {form.formState.errors.lastName ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.lastName.message}
              </p>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            {...form.register("email")}
          />
          {form.formState.errors.email ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.email.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Teléfono</Label>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+58 412 000 0000"
            {...form.register("phone")}
          />
          <p className="text-sm text-muted-foreground">
            Este teléfono se guarda como contacto principal de tu organización.
          </p>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={updateProfile.isPending || organizationQuery.isLoading}
          >
            {updateProfile.isPending ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </div>
  );
}
