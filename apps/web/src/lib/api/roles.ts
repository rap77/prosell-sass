/**
 * rolesApi — admin permission-profile endpoints (bloque 3).
 *
 * GET    /api/v1/admin/roles
 * GET    /api/v1/admin/roles/{id}
 * POST   /api/v1/admin/roles
 * PATCH  /api/v1/admin/roles/{id}
 * DELETE /api/v1/admin/roles/{id}
 * POST   /api/v1/admin/roles/{id}/clone
 * POST   /api/v1/admin/roles/{roleId}/users/{userId}
 * DELETE /api/v1/admin/roles/{roleId}/users/{userId}
 * GET    /api/v1/admin/users/by-email
 *
 * All gated server-side behind the `roles`/`users` zone grants — a
 * caller without them gets a 403, surfaced here as a thrown Error.
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { extractErrorMessage } from "@/lib/api/extractErrorMessage";
import {
  RoleListResponseSchema,
  RoleSchema,
  UserSummaryListSchema,
  UserSummarySchema,
  type Role,
  type RoleGrant,
  type RoleScope,
  type UserSummary,
} from "@/lib/api/schemas/roles";

const ROLES_KEY = ["admin-roles"] as const;

interface RoleGrantInput {
  zone: string;
  action: string;
}

interface RoleScopeInput {
  scope_type: string;
  organization_ids?: string[];
}

interface CreateRoleInput {
  name: string;
  description?: string | null;
  grants?: RoleGrantInput[];
  scope?: RoleScopeInput | null;
}

type UpdateRoleInput = CreateRoleInput;

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    const body: unknown = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(body, "Error en la petición"));
  }
  return res.json();
}

async function sendJson(
  url: string,
  method: "POST" | "PATCH",
  body?: unknown,
): Promise<unknown> {
  const res = await fetch(url, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    const responseBody: unknown = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(responseBody, "Error en la petición"));
  }
  // 201/200 carry a JSON body; 204 (e.g. assign) does not.
  if (res.status === 204) {
    return undefined;
  }
  return res.json();
}

async function sendDelete(url: string): Promise<void> {
  const res = await fetch(url, { method: "DELETE", credentials: "include" });
  if (!res.ok) {
    const body: unknown = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(body, "Error en la petición"));
  }
  // 204 No Content — nothing to parse.
}

/** List every permission profile (system templates + the caller's own
 * tenant's custom ones; every tenant's if the caller has AllScope). */
export function useRoles(): UseQueryResult<Role[], Error> {
  return useQuery({
    queryKey: ROLES_KEY,
    queryFn: async () => {
      const raw = await getJson("/api/v1/admin/roles");
      return RoleListResponseSchema.parse(raw).items;
    },
  });
}

/** Get one profile by id, with its current grants/scope. */
export function useRole(
  roleId: string | undefined,
): UseQueryResult<Role, Error> {
  return useQuery({
    queryKey: [...ROLES_KEY, roleId],
    queryFn: async () => {
      const raw = await getJson(`/api/v1/admin/roles/${roleId}`);
      return RoleSchema.parse(raw);
    },
    enabled: !!roleId,
  });
}

/** Create a new custom profile. */
export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateRoleInput): Promise<Role> => {
      const raw = await sendJson("/api/v1/admin/roles", "POST", input);
      return RoleSchema.parse(raw);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLES_KEY });
    },
  });
}

/** Full replace of a profile's name/description/grants/scope. */
export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      roleId,
      data,
    }: {
      roleId: string;
      data: UpdateRoleInput;
    }): Promise<Role> => {
      const raw = await sendJson(
        `/api/v1/admin/roles/${roleId}`,
        "PATCH",
        data,
      );
      return RoleSchema.parse(raw);
    },
    onSuccess: (_, { roleId }) => {
      queryClient.invalidateQueries({ queryKey: ROLES_KEY });
      queryClient.invalidateQueries({ queryKey: [...ROLES_KEY, roleId] });
    },
  });
}

/** Delete a custom profile. */
export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (roleId: string): Promise<void> => {
      await sendDelete(`/api/v1/admin/roles/${roleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLES_KEY });
    },
  });
}

/** Clone a profile (system template or existing custom one) into a new
 * custom profile — grants/scope come from the source, only name/description
 * are supplied here. */
export function useCloneRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sourceRoleId,
      name,
      description,
    }: {
      sourceRoleId: string;
      name: string;
      description?: string | null;
    }): Promise<Role> => {
      const raw = await sendJson(
        `/api/v1/admin/roles/${sourceRoleId}/clone`,
        "POST",
        {
          name,
          description,
        },
      );
      return RoleSchema.parse(raw);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLES_KEY });
    },
  });
}

/** List the users currently assigned a profile. */
export function useRoleUsers(
  roleId: string | undefined,
): UseQueryResult<UserSummary[], Error> {
  return useQuery({
    queryKey: [...ROLES_KEY, roleId, "users"],
    queryFn: async () => {
      const raw = await getJson(`/api/v1/admin/roles/${roleId}/users`);
      return UserSummaryListSchema.parse(raw);
    },
    enabled: !!roleId,
  });
}

/** Assign a profile to a user. */
export function useAssignRoleToUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      roleId,
      userId,
    }: {
      roleId: string;
      userId: string;
    }): Promise<void> => {
      await sendJson(`/api/v1/admin/roles/${roleId}/users/${userId}`, "POST");
    },
    onSuccess: (_, { roleId }) => {
      queryClient.invalidateQueries({
        queryKey: [...ROLES_KEY, roleId, "users"],
      });
    },
  });
}

/** Remove a profile from a user. */
export function useRemoveRoleFromUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      roleId,
      userId,
    }: {
      roleId: string;
      userId: string;
    }): Promise<void> => {
      await sendDelete(`/api/v1/admin/roles/${roleId}/users/${userId}`);
    },
    onSuccess: (_, { roleId }) => {
      queryClient.invalidateQueries({
        queryKey: [...ROLES_KEY, roleId, "users"],
      });
    },
  });
}

/** Find a user by exact email for the "assign user" panel. A 404 (no
 * match) resolves to `null` — it's a normal search miss, not an error
 * to toast; any other failure (e.g. 403) still throws. */
export function useLookupUserByEmail() {
  return useMutation({
    mutationFn: async (email: string): Promise<UserSummary | null> => {
      const res = await fetch(
        `/api/v1/admin/users/by-email?email=${encodeURIComponent(email)}`,
        { credentials: "include" },
      );
      if (res.status === 404) {
        return null;
      }
      if (!res.ok) {
        const body: unknown = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(body, "Error en la petición"));
      }
      return UserSummarySchema.parse(await res.json());
    },
  });
}

export type { Role, RoleGrant, RoleScope, UserSummary };
