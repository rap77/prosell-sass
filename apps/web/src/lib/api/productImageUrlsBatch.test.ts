import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useProductImageUrlsBatch } from "./productImageUrlsBatch";

// We mock global.fetch; the hook uses it directly (same pattern as
// verticals.test.ts and leads.test.tsx). The new contract is a single
// POST against /api/v1/products/image-urls:batch (FR1, FR5.2), not a
// per-product GET — the tests pin the new endpoint URL, the body
// shape, and the fact that exactly one request fires per page render
// regardless of how many product IDs are visible (FR1.1, NFR1.1).
const mockFetch = vi.fn();
beforeEach(() => {
  mockFetch.mockReset();
  global.fetch = mockFetch as unknown as typeof fetch;
});

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function QueryWrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children);
  }
  return QueryWrapper;
}

const fakeBatchResponse = (productIds: string[]) => ({
  covers: productIds.map((id) => ({
    product_id: id,
    key: `cover-${id}`,
    url: `https://signed/${id}/cover.jpg`,
    expires_in: 900,
  })),
  batch_size: productIds.length,
});

describe("useProductImageUrlsBatch", () => {
  it("fires a single POST for all visible product IDs", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => fakeBatchResponse(["p1", "p2"]),
    });

    const { result } = renderHook(
      () => useProductImageUrlsBatch(["p1", "p2"]),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // NFR1.1 — exactly one request, regardless of visible count.
    expect(mockFetch).toHaveBeenCalledTimes(1);
    // Endpoint + method + body shape pinned by the schema tests.
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/v1/products/image-urls:batch");
    expect(options.method).toBe("POST");
    expect(options.credentials).toBe("include");
    expect(JSON.parse(options.body)).toEqual({ product_ids: ["p1", "p2"] });

    expect(result.current.urls.get("p1")).toBe("https://signed/p1/cover.jpg");
    expect(result.current.urls.get("p2")).toBe("https://signed/p2/cover.jpg");
  });

  it("is a no-op (empty Map, no fetch) when the ids list is empty", async () => {
    const { result } = renderHook(() => useProductImageUrlsBatch([]), {
      wrapper: makeWrapper(),
    });
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.urls.size).toBe(0);
    expect(result.current.isLoading).toBe(false);
  });

  it("degrades to null for every visible id when the payload shape is invalid", async () => {
    // The signed-URL endpoint is an untrusted network boundary. A
    // payload whose shape fails the Zod schema must NOT leak through
    // as the image URL — the card falls back to its placeholder
    // (spec §8: never crash, degrade).
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        covers: [
          { product_id: "p1", key: "k", url: 12345, expires_in: "oops" },
        ],
        batch_size: 1,
      }),
    });

    const { result } = renderHook(() => useProductImageUrlsBatch(["p1"]), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.urls.get("p1")).toBeNull();
  });

  it("degrades to null for every visible id when the response is 4xx/5xx", async () => {
    // OQ3 — an over-cap batch hits 413; the hook must NOT crash the
    // page, every visible id should degrade to null so the cards
    // render the placeholder.
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: "batch_size 200 exceeds the limit of 100" }),
    });

    const { result } = renderHook(() => useProductImageUrlsBatch(["p1"]), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.urls.get("p1")).toBeNull();
  });

  it("populates null for products the backend omitted (not found / cross-tenant)", async () => {
    // Backend returns only the products it could resolve. The map
    // must expose null for the ones it dropped so the catalog grid's
    // `urls.get(id) ?? null` fallback keeps working uniformly.
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        covers: [
          {
            product_id: "p1",
            key: "cover-p1",
            url: "https://signed/p1/cover.jpg",
            expires_in: 900,
          },
        ],
        batch_size: 2,
      }),
    });

    const { result } = renderHook(
      () => useProductImageUrlsBatch(["p1", "p2"]),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.urls.get("p1")).toBe("https://signed/p1/cover.jpg");
    expect(result.current.urls.get("p2")).toBeNull();
  });
});
