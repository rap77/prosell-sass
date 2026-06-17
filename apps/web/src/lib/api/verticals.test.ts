import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// We mock global.fetch; the hook uses it directly.
const mockFetch = vi.fn();
beforeEach(() => {
  mockFetch.mockReset();
  global.fetch = mockFetch as unknown as typeof fetch;
});

import { useOrgVerticals } from "./verticals";

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function QueryWrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children);
  }
  return QueryWrapper;
}

const fakeResponse = {
  verticals: [
    {
      id: "v1",
      name: "Vehículos y transporte",
      slug: "vehiculos-y-transporte",
      presentation: {
        card_fields: [{ key: "mileage", source: "attributes.mileage" }],
        subtitle_template: "{year} · {make} · {model}",
        filter_fields: [],
      },
      categories: [
        {
          id: "c1",
          name: "Autos",
          slug: "autos",
          attribute_schema: {
            mileage: { type: "number", filter_type: "range", unit: "km" },
          },
          presentation: null,
          filter_fields: [],
        },
      ],
    },
  ],
};

describe("useOrgVerticals", () => {
  it("calls GET /api/v1/organizations/{orgId}/verticals with credentials", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => fakeResponse,
    });

    const { result } = renderHook(() => useOrgVerticals("org-1"), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v1/organizations/org-1/verticals",
      expect.objectContaining({ credentials: "include" }),
    );
    expect(result.current.data?.verticals).toHaveLength(1);
    expect(result.current.data?.verticals[0].slug).toBe(
      "vehiculos-y-transporte",
    );
  });

  it("is a no-op (data undefined) when orgId is null", async () => {
    const { result } = renderHook(() => useOrgVerticals(null), {
      wrapper: makeWrapper(),
    });
    // Query is disabled → no fetch issued, data is undefined.
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
    expect(result.current.isFetching).toBe(false);
  });

  it("throws when the response is not ok", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Forbidden" }),
    });

    const { result } = renderHook(() => useOrgVerticals("org-1"), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Forbidden");
  });
});
