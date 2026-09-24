import { useQuery } from "@tanstack/react-query";
import { BatchProductCoverUrlsResponseSchema } from "@/lib/api/schemas/batchProductCoverUrls";

/**
 * Batched cover-URL consumer for the catalog container.
 *
 * The legacy `useProductImageUrlsBatch` fired one React Query request per
 * visible product via `useQueries` — even though TanStack Query dedup'd
 * the cache key, the network still saw N round-trips per visible page.
 * Each request also signed the FULL gallery even though the card only
 * consumes one URL.
 *
 * This hook replaces that fan-out with a single `POST` against the new
 * batch endpoint (`POST /api/v1/products/image-urls:batch`, see FR1,
 * FR5.2). The endpoint signs only the selected cover (thumbnail
 * derivative when present, gallery-cover fallback when null per FR2.5)
 * and routes the URL through the CDN (FR3.1, FR5.1), so the browser
 * gets a 1-RTT image map regardless of how many cards are visible.
 *
 * Behavior preserved from the legacy hook:
 *   - Empty `productIds` is a no-op (no fetch, empty map, isLoading=false).
 *   - Network / validation failure degrades to `null` per card (spec §8:
 *     never crash, degrade). The card falls back to its placeholder.
 *   - Same `Map<productId, url|null>` shape so `CatalogPage`'s wiring
 *     stays untouched.
 *
 * OQ3 — the backend enforces a 100-product cap; requests over the cap
 * get a 413 and the hook returns an empty map (degraded, not crashed).
 */
export function useProductImageUrlsBatch(productIds: string[]): {
  urls: Map<string, string | null>;
  isLoading: boolean;
} {
  const query = useQuery({
    // Cache key includes the ids in order so two catalog pages with
    // different visible windows don't share the same response.
    queryKey: ["products", "image-urls", "cover-batch", ...productIds] as const,
    enabled: productIds.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    queryFn: async (): Promise<Map<string, string | null>> => {
      const result = new Map<string, string | null>();
      // De-dupe on the wire too — the backend also dedupes, but
      // keeping the request small helps when a card list has the same
      // product twice (e.g. duplicate fallback in a transition).
      const uniqueIds = Array.from(new Set(productIds));
      const res = await fetch("/api/v1/products/image-urls:batch", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_ids: uniqueIds }),
      });
      if (!res.ok) {
        // Degraded: leave every visible id at null so the card
        // falls back to its placeholder.
        for (const id of uniqueIds) {
          result.set(id, null);
        }
        return result;
      }
      const parsed = BatchProductCoverUrlsResponseSchema.safeParse(
        await res.json(),
      );
      if (!parsed.success) {
        for (const id of uniqueIds) {
          result.set(id, null);
        }
        return result;
      }
      // Build the map from the validated wire response. Products
      // omitted by the backend (not found, cross-tenant key) get
      // null — same degraded contract as a network failure.
      for (const id of uniqueIds) {
        result.set(id, null);
      }
      for (const cover of parsed.data.covers) {
        result.set(cover.product_id, cover.url);
      }
      return result;
    },
  });

  // ponytail: keep the legacy hook signature (urls: Map, isLoading).
  // When the query hasn't resolved we still hand back a Map shaped
  // exactly like the resolved one — same `urls.get(id) ?? null`
  // pattern in CatalogPage continues to work.
  const urls = query.data ?? new Map<string, string | null>();
  // isLoading only true when there is actual work to do; an empty
  // ids list must report `false` so the table renders immediately.
  const isLoading = productIds.length > 0 && query.isLoading;

  return { urls, isLoading };
}
