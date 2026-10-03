import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePriceRange } from "@/lib/api/products";

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("usePriceRange", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns the real min/max when the backend finds matching products", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        min_price_cents: 500_000,
        max_price_cents: 3_000_000,
      }),
    } as Response);

    const { result } = renderHook(() => usePriceRange(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ min: 500_000, max: 3_000_000 });
  });

  it("returns null when nothing matches (empty catalog under scope)", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ min_price_cents: null, max_price_cents: null }),
    } as Response);

    const { result } = renderHook(() => usePriceRange(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it("sends every scope field on the wire, with organization_ids repeated", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ min_price_cents: 1, max_price_cents: 2 }),
    } as Response);

    renderHook(
      () =>
        usePriceRange({
          organization_ids: ["org-a", "org-b"],
          category_id: "cat-1",
          status: "published",
          published_to_marketplace: true,
          has_images: false,
          search: "toyota",
        }),
      { wrapper },
    );

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const calledUrl = String(vi.mocked(fetch).mock.calls[0]?.[0]);
    expect(calledUrl).toContain("/api/v1/products/price-range?");
    expect(calledUrl).toContain("organization_ids=org-a");
    expect(calledUrl).toContain("organization_ids=org-b");
    expect(calledUrl).toContain("category_id=cat-1");
    expect(calledUrl).toContain("status=published");
    expect(calledUrl).toContain("published_to_marketplace=true");
    expect(calledUrl).toContain("has_images=false");
    expect(calledUrl).toContain("search=toyota");
    // organization_ids is non-empty, so the mutually-exclusive single-org
    // param must never also be sent.
    expect(calledUrl).not.toContain("organization_id=");
  });

  it("never fires while disabled (panel collapsed)", () => {
    renderHook(() => usePriceRange(undefined, { enabled: false }), {
      wrapper,
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});
