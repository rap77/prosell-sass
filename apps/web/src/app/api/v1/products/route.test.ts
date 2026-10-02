/**
 * Bug: the base products proxy copied query params via `forEach` +
 * `.set()`, which overwrites on every repeated key instead of
 * accumulating — the catalog's multi-select organization filter sends
 * `organization_ids` once per selected organization, so only the LAST
 * one ever reached the backend, silently narrowing the grid back down
 * to a single organization after the second (or later) pick.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockResolvedValue(
    new Response(
      JSON.stringify({ products: [], total: 0, skip: 0, limit: 50 }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    ),
  );
});

describe("products proxy base route", () => {
  it("forwards every repeated organization_ids value to the backend, not just the last", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/v1/products?organization_ids=org-a&organization_ids=org-b&limit=50",
      { method: "GET" },
    );

    await GET(request);

    const calledUrl = new URL(mockFetch.mock.calls[0][0] as string);
    expect(calledUrl.searchParams.getAll("organization_ids")).toEqual([
      "org-a",
      "org-b",
    ]);
  });

  it("still forwards single-value query params unchanged", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/v1/products?status=published&limit=50",
      { method: "GET" },
    );

    await GET(request);

    const calledUrl = new URL(mockFetch.mock.calls[0][0] as string);
    expect(calledUrl.searchParams.get("status")).toBe("published");
    expect(calledUrl.searchParams.get("limit")).toBe("50");
  });
});
