/**
 * Unit tests for the public products API hook (no-auth public catalog, 4.6).
 * Behavior: fetches GET /api/v1/public/products through the BFF proxy,
 * parses the public list response, sends filters/pagination as query
 * params, and surfaces the backend detail on failure.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePublicProducts } from "./publicProducts";

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const mockListResponse = {
  items: [
    {
      id: "pub-1",
      title: "Toyota Corolla 2022",
      slug: "toyota-corolla-2022",
      price_cents: 2500000,
      currency: "USD",
      condition: "used",
      status: "published",
      location_city: "Caracas",
      location_state: "Distrito Capital",
      image_urls: [],
      cover_url: "https://cdn.example.com/signed",
      is_featured: false,
    },
  ],
  total: 1,
  skip: 0,
  limit: 24,
};

function renderPublicProductsHook(
  filters?: Parameters<typeof usePublicProducts>[0],
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => usePublicProducts(filters, 24, 0), { wrapper });
}

describe("usePublicProducts", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("fetches the public listing and returns parsed items", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockListResponse,
    });
    const { result } = renderPublicProductsHook();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].title).toBe("Toyota Corolla 2022");
    expect(result.current.data?.[0].cover_url).toBe(
      "https://cdn.example.com/signed",
    );
  });

  it("sends filters and pagination as query params", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockListResponse, items: [] }),
    });
    const { result } = renderPublicProductsHook({
      search: "corolla",
      condition: "used",
      min_price: 100,
      max_price: 500,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const [url] = mockFetch.mock.calls[0];
    expect(String(url)).toContain("/api/v1/public/products?");
    expect(String(url)).toContain("search=corolla");
    expect(String(url)).toContain("condition=used");
    expect(String(url)).toContain("min_price=100");
    expect(String(url)).toContain("max_price=500");
    expect(String(url)).toContain("limit=24");
  });

  it("throws with the backend detail on API failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: "Backend down" }),
    });
    const { result } = renderPublicProductsHook();
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Backend down");
  });
});
