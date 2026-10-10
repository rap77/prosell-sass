/**
 * Public products API client — the no-auth public catalog (workbook 4.6).
 *
 * Plain `fetch`, NOT `fetchWithAuth`: the public visitor never passes
 * through the internal auth/session (§7 del diagnóstico). The browser
 * reaches the backend through the BFF proxy at
 * `/api/v1/public/products` (app/api/v1/public/products/route.ts).
 */

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { z } from "zod";
import { extractErrorMessage } from "./extractErrorMessage";

const PublicProductItemSchema = z.looseObject({
  id: z.string(),
  title: z.string(),
  slug: z.string().nullable(),
  price_cents: z.number(),
  currency: z.string(),
  condition: z.string(),
  status: z.string(),
  location_city: z.string().nullable(),
  location_state: z.string().nullable(),
  image_urls: z.array(z.string()),
  cover_url: z.string().nullable(),
  is_featured: z.boolean(),
});

const PublicProductsListSchema = z.object({
  items: z.array(PublicProductItemSchema),
  total: z.number(),
  skip: z.number(),
  limit: z.number(),
});

export type PublicProductItem = z.infer<typeof PublicProductItemSchema>;

export interface PublicProductsFilters {
  search?: string;
  condition?: string;
  min_price?: number;
  max_price?: number;
}

export function usePublicProducts(
  filters?: PublicProductsFilters,
  limit: number = 24,
  offset: number = 0,
): UseQueryResult<PublicProductItem[], Error> {
  return useQuery({
    queryKey: ["public-products", filters, limit, offset],
    queryFn: async () => {
      // Build params inside queryFn to avoid stale closure on background refetches
      const queryParams = new URLSearchParams();
      queryParams.append("limit", limit.toString());
      queryParams.append("skip", offset.toString());
      if (filters?.search) queryParams.append("search", filters.search);
      if (filters?.condition)
        queryParams.append("condition", filters.condition);
      if (filters?.min_price != null)
        queryParams.append("min_price", String(filters.min_price));
      if (filters?.max_price != null)
        queryParams.append("max_price", String(filters.max_price));

      const res = await fetch(
        `/api/v1/public/products?${queryParams.toString()}`,
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          extractErrorMessage(body, "Failed to fetch public products"),
        );
      }

      const data = PublicProductsListSchema.parse(await res.json());
      return data.items;
    },
  });
}
