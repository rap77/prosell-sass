/**
 * dealersApi — admin dealer endpoints (Subsystem D Phase 4 backend).
 *
 * GET /api/v1/admin/dealers
 * GET /api/v1/admin/dealers/{id}/products
 *
 * Both endpoints are gated server-side behind Permission.DEALER_ADMIN_VIEW_ALL
 * — a non-admin caller gets a 403, surfaced here as a thrown Error.
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { extractErrorMessage } from "@/lib/api/extractErrorMessage";
import {
  BrokerListResponseSchema,
  CreateDealerResponseSchema,
  DealerListResponseSchema,
  DealerProductListResponseSchema,
  type Broker,
  type CreateDealerResponse,
  type Dealer,
  type DealerProduct,
} from "@/lib/api/schemas/dealers";

interface BrokerInput {
  name: string;
  email: string;
}

interface CreateDealerInput {
  name: string;
  vertical_ids: string[];
  owner_email: string;
  brokers?: BrokerInput[];
}

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

/** List every dealer organization. */
export function useDealers(): UseQueryResult<Dealer[], Error> {
  return useQuery({
    queryKey: ["admin-dealers"],
    queryFn: async () => {
      const raw = await getJson("/api/v1/admin/dealers");
      return DealerListResponseSchema.parse(raw).organizations;
    },
  });
}

/** Find a single dealer by id from the dealers list (no dedicated GET-by-id endpoint). */
export function useDealer(
  dealerId: string | undefined,
): UseQueryResult<Dealer[], Error> & { dealer: Dealer | undefined } {
  const query = useDealers();
  const dealer = query.data?.find((d) => d.id === dealerId);
  return { ...query, dealer };
}

/** List a specific dealer's products. */
export function useDealerProducts(
  dealerId: string | undefined,
): UseQueryResult<DealerProduct[], Error> {
  return useQuery({
    queryKey: ["admin-dealer-products", dealerId],
    queryFn: async () => {
      const raw = await getJson(`/api/v1/admin/dealers/${dealerId}/products`);
      return DealerProductListResponseSchema.parse(raw).products;
    },
    enabled: !!dealerId,
  });
}

/** Create a dealer org + enable verticals + invite its owner. */
export function useCreateDealer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: CreateDealerInput,
    ): Promise<CreateDealerResponse> => {
      const raw = await postJson("/api/v1/admin/dealers", input);
      return CreateDealerResponseSchema.parse(raw);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dealers"] });
    },
  });
}

/** Resend (or freshly issue) the owner invitation for an existing dealer. */
export function useResendDealerInvitation() {
  return useMutation({
    mutationFn: async (dealerId: string): Promise<CreateDealerResponse> => {
      const raw = await postJson(
        `/api/v1/admin/dealers/${dealerId}/resend-invitation`,
        {},
      );
      return CreateDealerResponseSchema.parse(raw);
    },
  });
}

interface UpdateDealerInput {
  name?: string;
  code?: string;
  color?: string;
  description?: string;
  website?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  street_address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  tax_id?: string;
  instagram?: string;
  facebook?: string;
}

/** Update a dealer's details. */
export function useUpdateDealer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      dealerId,
      data,
    }: {
      dealerId: string;
      data: UpdateDealerInput;
    }): Promise<{ id: string; name: string; status: string }> => {
      const res = await fetch(`/api/v1/admin/dealers/${dealerId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body: unknown = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(body, "Error updating dealer"));
      }
      return res.json() as Promise<{
        id: string;
        name: string;
        status: string;
      }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dealers"] });
    },
  });
}

// -----------------------------------------------------------------------------
// Broker hooks
// -----------------------------------------------------------------------------

/** List brokers for a dealer. */
export function useDealerBrokers(
  dealerId: string | undefined,
): UseQueryResult<Broker[], Error> {
  return useQuery({
    queryKey: ["admin-dealer-brokers", dealerId],
    queryFn: async () => {
      const raw = await getJson(`/api/v1/admin/dealers/${dealerId}/brokers`);
      return BrokerListResponseSchema.parse(raw).brokers;
    },
    enabled: !!dealerId,
  });
}

/** Create a broker for a dealer. */
export function useCreateDealerBroker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      dealerId,
      name,
      email,
    }: {
      dealerId: string;
      name: string;
      email: string;
    }): Promise<Broker> => {
      const res = await fetch(`/api/v1/admin/dealers/${dealerId}/brokers`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      if (!res.ok) {
        const body: unknown = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(body, "Error creating broker"));
      }
      return res.json() as Promise<Broker>;
    },
    onSuccess: (_, { dealerId }) => {
      queryClient.invalidateQueries({
        queryKey: ["admin-dealer-brokers", dealerId],
      });
      queryClient.invalidateQueries({ queryKey: ["admin-dealers"] });
    },
  });
}

/** Update a broker (only if status is pending). */
export function useUpdateDealerBroker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      dealerId,
      brokerId,
      name,
      email,
    }: {
      dealerId: string;
      brokerId: string;
      name?: string;
      email?: string;
    }): Promise<Broker> => {
      const res = await fetch(
        `/api/v1/admin/dealers/${dealerId}/brokers/${brokerId}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email }),
        },
      );
      if (!res.ok) {
        const body: unknown = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(body, "Error updating broker"));
      }
      return res.json() as Promise<Broker>;
    },
    onSuccess: (_, { dealerId }) => {
      queryClient.invalidateQueries({
        queryKey: ["admin-dealer-brokers", dealerId],
      });
    },
  });
}

/** Delete a broker. */
export function useDeleteDealerBroker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      dealerId,
      brokerId,
    }: {
      dealerId: string;
      brokerId: string;
    }): Promise<void> => {
      const res = await fetch(
        `/api/v1/admin/dealers/${dealerId}/brokers/${brokerId}`,
        { method: "DELETE", credentials: "include" },
      );
      if (!res.ok) {
        const body: unknown = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(body, "Error deleting broker"));
      }
    },
    onSuccess: (_, { dealerId }) => {
      queryClient.invalidateQueries({
        queryKey: ["admin-dealer-brokers", dealerId],
      });
      queryClient.invalidateQueries({ queryKey: ["admin-dealers"] });
    },
  });
}

// Legacy exports for backward compatibility
export const useAddDealerBroker = useCreateDealerBroker;
export const useRemoveDealerBroker = useDeleteDealerBroker;
