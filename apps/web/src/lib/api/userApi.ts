import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

const currentUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  full_name: z.string().min(1),
  tenant_id: z.string().nullable().optional(),
});

const organizationSchema = z.object({
  id: z.string(),
  phone: z.string().nullable().optional(),
});

const updateProfileInputSchema = z.object({
  firstName: z.string().trim().min(1, "El nombre es requerido"),
  lastName: z.string().trim().min(1, "El apellido es requerido"),
  email: z.string().trim().email("Correo inválido"),
  phone: z.string().trim().optional(),
  organizationId: z.string().optional(),
});

export interface CurrentUserProfile {
  id: string;
  email: string;
  full_name: string;
  tenant_id?: string | null;
}

export interface OrganizationProfile {
  id: string;
  phone?: string | null;
}

export interface UpdateProfileInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  organizationId?: string;
}

interface ApiErrorPayload {
  detail?: unknown;
  message?: unknown;
}

function getErrorMessage(payload: ApiErrorPayload): string {
  if (typeof payload.detail === "string") {
    return payload.detail;
  }
  if (typeof payload.message === "string") {
    return payload.message;
  }
  return "Error en la petición";
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
    const payload: ApiErrorPayload = await response
      .json()
      .catch(() => ({ message: "No se pudo cargar la organización" }));
    throw new Error(getErrorMessage(payload));
  }

  return parseJson(response, organizationSchema);
}

async function updateOrganizationPhone(
  organizationId: string,
  phone: string,
): Promise<void> {
  const response = await fetch(`/api/v1/org/${organizationId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ phone }),
  });

  if (!response.ok) {
    const payload: ApiErrorPayload = await response
      .json()
      .catch(() => ({ message: "No se pudo guardar el teléfono" }));
    throw new Error(getErrorMessage(payload));
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
      const parsedInput = updateProfileInputSchema.parse(input);
      const fullName = `${parsedInput.firstName} ${parsedInput.lastName}`.trim();

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
        const payload: ApiErrorPayload = await response
          .json()
          .catch(() => ({ message: "No se pudo guardar el perfil" }));
        throw new Error(getErrorMessage(payload));
      }

      const updatedUser = await parseJson(response, currentUserSchema);

      if (parsedInput.organizationId) {
        await updateOrganizationPhone(
          parsedInput.organizationId,
          parsedInput.phone ?? "",
        );
      }

      return updatedUser;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["organization-profile"] });
    },
  });
}
