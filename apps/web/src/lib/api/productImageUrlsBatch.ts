import { useQueries } from "@tanstack/react-query";
import type { ProductImageUrlsResponse } from "@/lib/api/products";

/**
 * Batched version of `useProductImageUrls` for the catalog container.
 *
 * The legacy `VehicleCard` invoked `useProductImageUrls(productId)` per
 * card; TanStack Query dedup'd the cache key, but the network still saw
 * N round-trips per visible page. The new container is the right place
 * to fan the requests out and assemble a single Map<productId, url|null>
 * for the per-product view model.
 *
 * The container calls this once per render with the visible `productId`s.
 * Each per-product query still uses the existing
 * `GET /api/v1/products/{id}/image-urls` endpoint — no backend change
 * is required for this slice. A future optimization (out of scope) is a
 * single batch endpoint `POST /products/image-urls:batch`.
 */
export function useProductImageUrlsBatch(productIds: string[]): {
  urls: Map<string, string | null>;
  isLoading: boolean;
} {
  const queries = useQueries({
    queries: productIds.map((productId) => ({
      queryKey: ["products", productId, "image-urls"] as const,
      queryFn: async (): Promise<string | null> => {
        const res = await fetch(`/api/v1/products/${productId}/image-urls`, {
          credentials: "include",
        });
        if (!res.ok) return null;
        const payload = (await res.json()) as ProductImageUrlsResponse;
        // Pick the first image (the cover) — `ProductImageUrlsResponse.images`
        // is ordered with the cover first per the backend contract.
        return payload.images[0]?.url ?? null;
      },
      staleTime: 5 * 60 * 1000,
      retry: 1,
    })),
  });

  const urls = new Map<string, string | null>();
  for (let i = 0; i < productIds.length; i++) {
    urls.set(productIds[i], (queries[i]?.data as string | null | undefined) ?? null);
  }
  const isLoading = queries.some((q) => q.isLoading);

  return { urls, isLoading };
}
