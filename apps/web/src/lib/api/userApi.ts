import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { extractErrorMessage } from "./extractErrorMessage";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CURRENT_USER_SCHEMA = z.object({
  id: z.string(),
  email: z
    .string()
    .trim()
    .refine((value) => EMAIL_REGEX.test(value), "Correo inválido"),
  full_name: z.string().min(1),
  tenant_id: z.string().nullable().optional(),
});

const ORGANIZATION_SCHEMA = z.object({
  id: z.string(),
  code: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
});

const UPDATE_PROFILE_INPUT_SCHEMA = z.object({
  firstName: z.string().trim().min(1, { message: "El nombre es requerido" }),
  lastName: z.string().trim().min(1, { message: "El apellido es requerido" }),
  email: z
    .string()
    .trim()
    .refine((value) => EMAIL_REGEX.test(value), "Correo inválido"),
  phone: z.string().trim().optional(),
  organizationId: z.string().optional(),
});

const CHANGE_PASSWORD_INPUT_SCHEMA = z
  .object({
    currentPassword: z
      .string()
      .min(1, { message: "La contraseña actual es requerida" }),
    newPassword: z
      .string()
      .min(8, {
        message: "La nueva contraseña debe tener al menos 8 caracteres",
      }),
  })
  .superRefine((value, context) => {
    if (value.currentPassword === value.newPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newPassword"],
        message: "La nueva contraseña debe ser diferente a la actual",
      });
    }
  });

const DISABLE_TWO_FACTOR_INPUT_SCHEMA = z.object({
  totpCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, { message: "Ingresa un código de 6 dígitos" }),
});

export interface CurrentUserProfile {
  id: string;
  email: string;
  full_name: string;
  tenant_id?: string | null;
}

export interface OrganizationProfile {
  id: string;
  code?: string | null;
  color?: string | null;
  phone?: string | null;
}

export interface UpdateProfileInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  organizationId?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface DisableTwoFactorInput {
  totpCode: string;
}

export function mapSecurityErrorMessage(message: string): string {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("invalid email or password")) {
    return "La contraseña actual no es correcta.";
  }
  if (
    normalizedMessage.includes("password must be at least 8 characters long")
  ) {
    return "La nueva contraseña debe tener al menos 8 caracteres.";
  }
  if (normalizedMessage.includes("uppercase letter")) {
    return "La nueva contraseña debe incluir al menos una letra mayúscula.";
  }
  if (normalizedMessage.includes("lowercase letter")) {
    return "La nueva contraseña debe incluir al menos una letra minúscula.";
  }
  if (normalizedMessage.includes("one number")) {
    return "La nueva contraseña debe incluir al menos un número.";
  }
  if (normalizedMessage.includes("special character")) {
    return "La nueva contraseña debe incluir al menos un carácter especial.";
  }
  if (normalizedMessage.includes("different from the current password")) {
    return "La nueva contraseña debe ser diferente a la actual.";
  }
  if (normalizedMessage.includes("invalid two-factor authentication code")) {
    return "El código de autenticación es inválido.";
  }
  return message;
}

async function parseJson<T>(
  response: Response,
  schema: z.ZodSchema<T>,
): Promise<T> {
  const data: unknown = await response.json();
  return schema.parse(data);
}

async function getCurrentOrganization(): Promise<OrganizationProfile | null> {
  const response = await fetch("/api/v1/org/me", {
    credentials: "include",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const payload: unknown = await response
      .json()
      .catch(() => ({ message: "No se pudo cargar la organización" }));
    throw new Error(extractErrorMessage(payload, "Error en la petición"));
  }

  return parseJson(response, ORGANIZATION_SCHEMA);
}

async function updateOrganizationFields(
  organizationId: string,
  fields: { phone?: string },
): Promise<void> {
  const response = await fetch(`/api/v1/org/${organizationId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(fields),
  });

  if (!response.ok) {
    const payload: unknown = await response
      .json()
      .catch(() => ({ message: "No se pudo guardar la organización" }));
    throw new Error(extractErrorMessage(payload, "Error en la petición"));
  }
}

export function useCurrentOrganizationProfile() {
  return useQuery({
    queryKey: ["organization-profile"],
    queryFn: getCurrentOrganization,
    staleTime: 60_000,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      const parsedInput = UPDATE_PROFILE_INPUT_SCHEMA.parse(input);
      const fullName =
        `${parsedInput.firstName} ${parsedInput.lastName}`.trim();

      const response = await fetch("/api/v1/users/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          full_name: fullName,
          email: parsedInput.email,
        }),
      });

      if (!response.ok) {
        const payload: unknown = await response
          .json()
          .catch(() => ({ message: "No se pudo guardar el perfil" }));
        throw new Error(extractErrorMessage(payload, "Error en la petición"));
      }

      const updatedUser = await parseJson(response, CURRENT_USER_SCHEMA);

      if (parsedInput.organizationId) {
        await updateOrganizationFields(parsedInput.organizationId, {
          phone: parsedInput.phone ?? "",
        });
      }

      return updatedUser;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["organization-profile"],
      });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (input: ChangePasswordInput) => {
      const parsedInput = CHANGE_PASSWORD_INPUT_SCHEMA.parse(input);

      const response = await fetch("/api/v1/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          current_password: parsedInput.currentPassword,
          new_password: parsedInput.newPassword,
        }),
      });

      if (!response.ok) {
        const payload: unknown = await response
          .json()
          .catch(() => ({ message: "No se pudo actualizar la contraseña" }));

        throw new Error(
          mapSecurityErrorMessage(
            extractErrorMessage(payload, "Error en la petición"),
          ),
        );
      }
    },
  });
}

export function useDisableTwoFactor() {
  return useMutation({
    mutationFn: async (input: DisableTwoFactorInput) => {
      const parsedInput = DISABLE_TWO_FACTOR_INPUT_SCHEMA.parse(input);

      const response = await fetch("/api/v1/auth/2fa/disable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          totp_code: parsedInput.totpCode,
        }),
      });

      if (!response.ok) {
        const payload: unknown = await response
          .json()
          .catch(() => ({ message: "No se pudo deshabilitar 2FA" }));

        throw new Error(
          mapSecurityErrorMessage(
            extractErrorMessage(payload, "Error en la petición"),
          ),
        );
      }
    },
  });
}
