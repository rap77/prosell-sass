/**
 * FB Accounts API hooks.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { extractErrorMessage } from "@/lib/api/extractErrorMessage";
import {
  FBAccountDetailSchema,
  FBAccountListResponseSchema,
  FBAccountSchema,
  FBGroupSchema,
  type FBAccount,
  type FBAccountDetail,
  type FBGroup,
  type FBGroupCategory,
} from "@/lib/api/schemas/fb-accounts";

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    const body: unknown = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(body, "Error en la petición"));
  }
  return res.json();
}

async function postJson(url: string, body: unknown): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const responseBody: unknown = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(responseBody, "Error en la petición"));
  }
  return res.json();
}

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface FBGroupInput {
  position: number;
  fb_group_id?: string | null;
  name?: string | null;
  category?: FBGroupCategory;
  is_active?: boolean;
}

interface CreateFBAccountInput {
  email: string;
  password: string;
  alias?: string;
  broker_id?: string;
  browser?: string;
  language?: string;
  time_to_sleep?: number;
  groups?: FBGroupInput[];
}

interface UpdateFBAccountInput {
  alias?: string;
  broker_id?: string | null;
  browser?: string;
  language?: string;
  time_to_sleep?: number;
  status?: string;
}

// -----------------------------------------------------------------------------
// Query hooks
// -----------------------------------------------------------------------------

/** List all FB accounts. */
export function useFBAccounts(): UseQueryResult<FBAccount[], Error> {
  return useQuery({
    queryKey: ["fb-accounts"],
    queryFn: async () => {
      const raw = await getJson("/api/v1/fb-accounts");
      return FBAccountListResponseSchema.parse(raw);
    },
  });
}

/** Get single FB account by ID. */
export function useFBAccount(
  accountId: string | undefined,
): UseQueryResult<FBAccountDetail, Error> {
  return useQuery({
    queryKey: ["fb-accounts", accountId],
    queryFn: async () => {
      const raw = await getJson(`/api/v1/fb-accounts/${accountId}`);
      return FBAccountDetailSchema.parse(raw);
    },
    enabled: !!accountId,
  });
}

// -----------------------------------------------------------------------------
// Mutation hooks
// -----------------------------------------------------------------------------

/** Create FB account. */
export function useCreateFBAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateFBAccountInput): Promise<FBAccount> => {
      const raw = await postJson("/api/v1/fb-accounts", input);
      return FBAccountSchema.parse(raw);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fb-accounts"] });
    },
  });
}

/** Update FB account. */
export function useUpdateFBAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      accountId,
      data,
    }: {
      accountId: string;
      data: UpdateFBAccountInput;
    }): Promise<FBAccount> => {
      const res = await fetch(`/api/v1/fb-accounts/${accountId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body: unknown = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(body, "Error updating account"));
      }
      return FBAccountSchema.parse(await res.json());
    },
    onSuccess: (_, { accountId }) => {
      queryClient.invalidateQueries({ queryKey: ["fb-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["fb-accounts", accountId] });
    },
  });
}

/** Change FB account password. */
export function useChangeFBAccountPassword() {
  return useMutation({
    mutationFn: async ({
      accountId,
      newPassword,
    }: {
      accountId: string;
      newPassword: string;
    }): Promise<void> => {
      const res = await fetch(
        `/api/v1/fb-accounts/${accountId}/change-password`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ new_password: newPassword }),
        },
      );
      if (!res.ok) {
        const body: unknown = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(body, "Error changing password"));
      }
    },
  });
}

/** Delete FB account (soft delete). */
export function useDeleteFBAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (accountId: string): Promise<void> => {
      const res = await fetch(`/api/v1/fb-accounts/${accountId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const body: unknown = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(body, "Error deleting account"));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fb-accounts"] });
    },
  });
}

// -----------------------------------------------------------------------------
// Group mutations
// -----------------------------------------------------------------------------

/** Add group to account. */
export function useAddFBGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      accountId,
      group,
    }: {
      accountId: string;
      group: FBGroupInput;
    }): Promise<FBGroup> => {
      const raw = await postJson(
        `/api/v1/fb-accounts/${accountId}/groups`,
        group,
      );
      return FBGroupSchema.parse(raw);
    },
    onSuccess: (_, { accountId }) => {
      queryClient.invalidateQueries({ queryKey: ["fb-accounts", accountId] });
      queryClient.invalidateQueries({ queryKey: ["fb-accounts"] });
    },
  });
}

/** Update group. */
export function useUpdateFBGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      accountId,
      groupId,
      group,
    }: {
      accountId: string;
      groupId: string;
      group: FBGroupInput;
    }): Promise<FBGroup> => {
      const res = await fetch(
        `/api/v1/fb-accounts/${accountId}/groups/${groupId}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(group),
        },
      );
      if (!res.ok) {
        const body: unknown = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(body, "Error updating group"));
      }
      return FBGroupSchema.parse(await res.json());
    },
    onSuccess: (_, { accountId }) => {
      queryClient.invalidateQueries({ queryKey: ["fb-accounts", accountId] });
      queryClient.invalidateQueries({ queryKey: ["fb-accounts"] });
    },
  });
}
