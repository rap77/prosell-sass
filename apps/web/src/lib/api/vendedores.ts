/**
 * Vendedores API client
 * Handles vendedor (salesperson) management
 */

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import {
  BackendVendedorListResponseSchema,
  type BackendVendedorResponse,
} from "@/lib/api/schemas/vendedores";
import { extractErrorMessage } from "./extractErrorMessage";

/**
 * Vendedor entity
 */
export interface Vendedor {
  id: string;
  name: string;
  email: string;
  role: string;
}

/**
 * Transform backend vendedor response to frontend vendedor
 */
function transformVendedor(backendVendedor: BackendVendedorResponse): Vendedor {
  return {
    id: backendVendedor.id,
    name: backendVendedor.name,
    email: backendVendedor.email,
    role: backendVendedor.role,
  };
}

/**
 * Fetch all vendedores in the team
 * @returns Query result with vendedores array
 */
export function useVendedores(
  limit: number = 100,
  offset: number = 0,
): UseQueryResult<Vendedor[], Error> {
  const queryParams = new URLSearchParams();
  queryParams.append("limit", limit.toString());
  queryParams.append("offset", offset.toString());

  return useQuery({
    queryKey: ["vendedores", limit, offset],
    queryFn: async () => {
      const res = await fetch(`/api/v1/vendedores?${queryParams.toString()}`, {
        credentials: "include",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          extractErrorMessage(body, "Failed to fetch vendedores"),
        );
      }

      const data = BackendVendedorListResponseSchema.parse(await res.json());
      return data.items.map(transformVendedor);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - vendedores don't change often
  });
}
