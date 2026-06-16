import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useProductImageUrlsBatch } from "./productImageUrlsBatch";

// We mock global.fetch; the hook uses it directly (same pattern as
// verticals.test.ts and leads.test.tsx).
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

const fakeImageUrlsResponse = (productId: string) => ({
  product_id: productId,
  images: [
    {
      key: `cover-${productId}`,
      url: `https://signed/${productId}/cover.jpg`,
      expires_in: 3600,
    },
  ],
});

describe("useProductImageUrlsBatch", () => {
  it("returns a Map<productId, imageUrl|null> populated from per-product queries", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => fakeImageUrlsResponse("p1"),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => fakeImageUrlsResponse("p2"),
      });

    const { result } = renderHook(() => useProductImageUrlsBatch(["p1", "p2"]), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
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

  it("populates null for products whose signed-URL fetch fails (4xx/5xx)", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => fakeImageUrlsResponse("p1"),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: "Not found" }),
      });

    const { result } = renderHook(() => useProductImageUrlsBatch(["p1", "p2"]), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.urls.get("p1")).toBe("https://signed/p1/cover.jpg");
    expect(result.current.urls.get("p2")).toBeNull();
  });
});
