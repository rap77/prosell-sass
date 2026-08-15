/**
 * Marketplace Access API - cross-organization authorization hooks.
 *
 * Endpoints:
 * - POST /api/v1/marketplace-access/request
 * - GET  /api/v1/marketplace-access/requests
 * - POST /api/v1/marketplace-access/{id}/approve
 * - POST /api/v1/marketplace-access/{id}/reject
 * - POST /api/v1/marketplace-access/{id}/revoke
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { extractErrorMessage } from "@/lib/api/extractErrorMessage";
import {
  MarketplaceAccessGrantSchema,
  MarketplaceAccessListResponseSchema,
  type MarketplaceAccessGrant,
} from "@/lib/api/schemas/marketplace-access";

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

/** List all marketplace access grants (admin + owner view). */
export function useMarketplaceAccessGrants(): UseQueryResult<
  MarketplaceAccessGrant[],
  Error
> {
  return useQuery({
    queryKey: ["marketplace-access-grants"],
    queryFn: async () => {
      const raw = await getJson("/api/v1/marketplace-access/requests");
      return MarketplaceAccessListResponseSchema.parse(raw);
    },
  });
}

interface RequestAccessInput {
  operator_organization_id: string;
  can_publish_marketplace?: boolean;
  can_manage_inventory?: boolean;
}

/** Request marketplace access (inventory owner → operator). */
export function useRequestMarketplaceAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: RequestAccessInput,
    ): Promise<MarketplaceAccessGrant> => {
      const raw = await postJson("/api/v1/marketplace-access/request", input);
      return MarketplaceAccessGrantSchema.parse(raw);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["marketplace-access-grants"],
      });
    },
  });
}

/** Approve marketplace access (operator admin only). */
export function useApproveMarketplaceAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (grantId: string): Promise<MarketplaceAccessGrant> => {
      const raw = await postJson(
        `/api/v1/marketplace-access/${grantId}/approve`,
        {},
      );
      return MarketplaceAccessGrantSchema.parse(raw);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["marketplace-access-grants"],
      });
    },
  });
}

interface RejectAccessInput {
  reason: string;
}

/** Reject marketplace access (operator admin only). */
export function useRejectMarketplaceAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      grantId,
      reason,
    }: {
      grantId: string;
      reason: string;
    }): Promise<MarketplaceAccessGrant> => {
      const raw = await postJson(
        `/api/v1/marketplace-access/${grantId}/reject`,
        { reason },
      );
      return MarketplaceAccessGrantSchema.parse(raw);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["marketplace-access-grants"],
      });
    },
  });
}

interface RevokeAccessInput {
  reason: string;
}

/** Revoke marketplace access (inventory owner or operator admin). */
export function useRevokeMarketplaceAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      grantId,
      reason,
    }: {
      grantId: string;
      reason: string;
    }): Promise<MarketplaceAccessGrant> => {
      const raw = await postJson(
        `/api/v1/marketplace-access/${grantId}/revoke`,
        { reason },
      );
      return MarketplaceAccessGrantSchema.parse(raw);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["marketplace-access-grants"],
      });
    },
  });
}
