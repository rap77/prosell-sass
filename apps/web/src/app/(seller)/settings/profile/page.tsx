"use client";

/**
 * Settings › Perfil — ProSell profile form.
 *
 * Business logic:
 *   - react-hook-form + zod for validation
 *   - useAuth() for current user data
 *   - useCurrentOrganizationProfile() for phone
 *   - useUpdateProfile() mutation on submit
 *
 * All colors via var(--ps-*) tokens — dark/light automatic.
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

// ─── Schema ───────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  firstName: z.string().trim().min(1, "El nombre es requerido"),
  lastName: z.string().trim().min(1, "El apellido es requerido"),
  email: z.string().email("Correo inválido"),
  phone: z.string().trim().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

// ─── Shared input styles ──────────────────────────────────────────────────────

const inputBase: React.CSSProperties = {
  width: "100%",
  height: 40,
  padding: "0 12px",
  background: "var(--ps-input-bg)",
  border: "1px solid var(--ps-input-border)",
  borderRadius: 8,
  color: "var(--ps-text-primary)",
  fontSize: 14,
  outline: "none",
  fontFamily: "inherit",
  transition: "border-color 150ms, box-shadow 150ms",
};

function focusInput(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = "var(--ps-cyan)";
  e.currentTarget.style.boxShadow = "var(--ps-input-focus-shadow)";
}
function blurInput(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = "var(--ps-input-border)";
  e.currentTarget.style.boxShadow = "none";
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}

function Field({ id, label, hint, error, children }: FieldProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label
        htmlFor={id}
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: "var(--ps-text-primary)",
        }}
      >
        {label}
      </label>
      {children}
      {hint && !error && (
        <p
          style={{ margin: 0, fontSize: 12, color: "var(--ps-text-secondary)" }}
        >
          {hint}
        </p>
      )}
      {error && (
        <p style={{ margin: 0, fontSize: 12, color: "var(--ps-error)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

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

  // Sync form when remote data arrives
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

  const isPending = updateProfile.isPending || organizationQuery.isLoading;

  // Merges react-hook-form register() with custom focus/blur handlers
  // to avoid "specified more than once" TS2783 error from double-spreading onBlur.
  function reg(name: keyof ProfileFormValues) {
    const { onBlur: rhfOnBlur, ...rest } = form.register(name);
    return {
      ...rest,
      onFocus: focusInput,
      onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
        blurInput(e);
        void rhfOnBlur(e);
      },
    };
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Section title */}
      <div>
        <h2
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 600,
            color: "var(--ps-text-primary)",
          }}
        >
          Perfil
        </h2>
        <p
          style={{
            margin: "4px 0 0",
            fontSize: 13,
            color: "var(--ps-text-secondary)",
          }}
        >
          Actualizá tu información personal visible dentro de ProSell.
        </p>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "var(--ps-border-subtle)" }} />

      <form
        onSubmit={onSubmit}
        noValidate
        style={{ display: "flex", flexDirection: "column", gap: 20 }}
      >
        {/* Name row */}
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
        >
          <Field
            id="firstName"
            label="Nombre"
            error={form.formState.errors.firstName?.message}
          >
            <input
              id="firstName"
              autoComplete="given-name"
              style={inputBase}
              {...reg("firstName")}
            />
          </Field>

          <Field
            id="lastName"
            label="Apellido"
            error={form.formState.errors.lastName?.message}
          >
            <input
              id="lastName"
              autoComplete="family-name"
              style={inputBase}
              {...reg("lastName")}
            />
          </Field>
        </div>

        {/* Email */}
        <Field
          id="email"
          label="Correo electrónico"
          error={form.formState.errors.email?.message}
        >
          <input
            id="email"
            type="email"
            autoComplete="email"
            style={inputBase}
            {...reg("email")}
          />
        </Field>

        {/* Phone */}
        <Field
          id="phone"
          label="Teléfono"
          hint="Contacto principal de tu organización."
          error={form.formState.errors.phone?.message}
        >
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+54 11 0000 0000"
            style={inputBase}
            {...reg("phone")}
          />
        </Field>

        {/* Submit */}
        <div
          style={{ display: "flex", justifyContent: "flex-end", paddingTop: 4 }}
        >
          <button
            type="submit"
            disabled={isPending}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              height: 38,
              padding: "0 20px",
              background: isPending ? "rgba(77,184,255,0.6)" : "var(--ps-cyan)",
              color: "var(--ps-bg-base)",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: isPending ? "not-allowed" : "pointer",
              transition: "background 150ms, opacity 150ms",
            }}
          >
            {isPending && (
              <Loader2
                size={14}
                strokeWidth={2}
                style={{ animation: "spin 0.8s linear infinite" }}
              />
            )}
            {isPending ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
