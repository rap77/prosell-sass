import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useInferCategory } from "@/lib/api/useInferCategory";

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useInferCategory", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns suggestion when the endpoint returns one", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          suggestion: {
            category_id: "11111111-1111-1111-1111-111111111111",
            name: "Vehicles",
            score: 0.87,
          },
          alternatives: [
            {
              category_id: "11111111-1111-1111-1111-111111111111",
              name: "Vehicles",
              score: 0.87,
            },
          ],
        }),
      }),
    );
    const { result } = renderHook(
      () =>
        useInferCategory(
          { title: "Honda", attributes: { make: "Honda" } },
          { enabled: true },
        ),
      { wrapper },
    );
    await waitFor(() =>
      expect(result.current.suggestion?.name).toBe("Vehicles"),
    );
  });

  it("returns null suggestion and no error on network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    const { result } = renderHook(
      () => useInferCategory({ title: "X", attributes: {} }, { enabled: true }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.suggestion).toBeNull();
  });

  it("does NOT call fetch when enabled=false (default)", async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
    const { result } = renderHook(
      () => useInferCategory({ title: "Honda", attributes: {} }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.suggestion).toBeNull();
  });

  it("returns null suggestion on non-2xx response (4xx, 5xx)", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }),
    );
    const { result } = renderHook(
      () => useInferCategory({ title: "X", attributes: {} }, { enabled: true }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.suggestion).toBeNull();
  });

  it("returns null suggestion when the response fails schema validation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ suggestion: "not-an-object", alternatives: [] }),
      }),
    );
    const { result } = renderHook(
      () => useInferCategory({ title: "X", attributes: {} }, { enabled: true }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.suggestion).toBeNull();
  });
});
