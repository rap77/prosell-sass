import { useQueries } from "@tanstack/react-query";
import { ProductImageUrlsResponseSchema } from "@/lib/api/schemas/productImageUrls";

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
      queryKey: ["products", productId, "image-urls", "cover"] as const,
      queryFn: async (): Promise<string | null> => {
        const res = await fetch(`/api/v1/products/${productId}/image-urls`, {
          credentials: "include",
        });
        if (!res.ok) return null;
        // Validate the untrusted wire shape (spec §8: degrade, never crash).
        const parsed = ProductImageUrlsResponseSchema.safeParse(
          await res.json(),
        );
        if (!parsed.success) return null;
        // Pick the first image (the cover) — `images` is ordered with the
        // cover first per the backend contract.
        return parsed.data.images[0]?.url ?? null;
      },
      staleTime: 5 * 60 * 1000,
      retry: 1,
    })),
  });

  const urls = new Map<string, string | null>();
  for (let i = 0; i < productIds.length; i++) {
    urls.set(productIds[i], queries[i]?.data ?? null);
  }
  const isLoading = queries.some((q) => q.isLoading);

  return { urls, isLoading };
}
