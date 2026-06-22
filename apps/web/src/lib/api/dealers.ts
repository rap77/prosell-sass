/**
 * dealersApi — admin dealer endpoints (Subsystem D Phase 4 backend).
 *
 * GET /api/v1/admin/dealers
 * GET /api/v1/admin/dealers/{id}/products
 *
 * Both endpoints are gated server-side behind Permission.DEALER_ADMIN_VIEW_ALL
 * — a non-admin caller gets a 403, surfaced here as a thrown Error.
 */
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { extractErrorMessage } from "@/lib/api/extractErrorMessage";
import {
  DealerListResponseSchema,
  DealerProductListResponseSchema,
  type Dealer,
  type DealerProduct,
} from "@/lib/api/schemas/dealers";

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { credentials: "include" });

  if (!res.ok) {
    const body: unknown = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(body, "Error en la petición"));
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
