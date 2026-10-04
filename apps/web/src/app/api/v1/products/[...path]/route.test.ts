/**
 * Bug: the products proxy route only forwarded Content-Type and Cookie
 * to the backend, silently dropping every other header. The
 * reverse-transition endpoints (reverse/resubmit/restore/revert-sale)
 * all require `If-Match`, so every one of them 422'd
 * ("Field required") the moment they were clicked through the real
 * browser, even though direct API calls (curl, integration tests)
 * worked fine — those bypass this proxy entirely.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST, DELETE } from "./route";

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockResolvedValue(
    new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
});

describe("products proxy route", () => {
  it("forwards the If-Match header to the backend", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/v1/products/prod-1/revert-sale",
      {
        method: "POST",
        headers: { "If-Match": "7" },
      },
    );

    await POST(request, {
      params: Promise.resolve({ path: ["prod-1", "revert-sale"] }),
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/products/prod-1/revert-sale"),
      expect.objectContaining({
        headers: expect.objectContaining({ "If-Match": "7" }),
      }),
    );
  });

  it("still forwards Content-Type and Cookie as before", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/v1/products/prod-1/reverse",
      {
        method: "POST",
        headers: { "If-Match": "1", Cookie: "access_token=abc" },
      },
    );

    await POST(request, {
      params: Promise.resolve({ path: ["prod-1", "reverse"] }),
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Cookie: "access_token=abc",
        }),
      }),
    );
  });

  // AC1.1.9 (260903-catalog-client-export) requires this verified through
  // the proxy end-to-end, not only against the backend directly — this
  // proxy's blob-vs-json branch (see the comment above it in `route.ts`)
  // had no test at all before this one, for any binary response.
  it("passes a ZIP response through as a blob, preserving Content-Type and Content-Disposition", async () => {
    const backendResponse = new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition":
          'attachment; filename="catalogo_MF_2026-09-05.zip"',
      },
    });
    const jsonSpy = vi.spyOn(backendResponse, "json");
    const blobSpy = vi.spyOn(backendResponse, "blob");
    mockFetch.mockResolvedValue(backendResponse);
    const request = new NextRequest(
      "http://localhost:3000/api/v1/products/export-client-format.zip",
      { method: "GET" },
    );

    const response = await GET(request, {
      params: Promise.resolve({ path: ["export-client-format.zip"] }),
    });

    // The blob branch was taken, not the JSON branch — a ZIP body would
    // throw if `response.json()` ran against it in a real backend call.
    expect(blobSpy).toHaveBeenCalledTimes(1);
    expect(jsonSpy).not.toHaveBeenCalled();
    expect(response.headers.get("Content-Type")).toBe("application/zip");
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="catalogo_MF_2026-09-05.zip"',
    );
  });

  // Bug: the proxy copied query params via `forEach` + `.set()`, which
  // overwrites on every repeated key instead of accumulating — the
  // catalog's multi-select filter sends `organization_ids` once per
  // selected organization, so only the LAST one ever reached the
  // backend, silently narrowing a multi-org export back down to one.
  it("forwards every repeated organization_ids value to the backend, not just the last", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/v1/products/export-client-format.zip?organization_ids=org-a&organization_ids=org-b&base_folder=orgs%2F&facebook_groups_fallback=General",
      { method: "GET" },
    );

    await GET(request, {
      params: Promise.resolve({ path: ["export-client-format.zip"] }),
    });

    const calledUrl = new URL(mockFetch.mock.calls[0][0] as string);
    expect(calledUrl.searchParams.getAll("organization_ids")).toEqual([
      "org-a",
      "org-b",
    ]);
  });

  // Bug: FastAPI sets Content-Type: application/json even on a 204 No
  // Content response (e.g. DELETE /products/{id}). The proxy saw that
  // header and called response.json() on the empty body, which throws and
  // gets caught by the generic try/catch as a 502 "Proxy error: Failed to
  // reach backend" — even though the backend had already deleted the
  // product. The browser showed the error toast, but the delete had
  // already succeeded, confirmed by the item disappearing from the grid.
  it("passes a 204 No Content response through without parsing its body", async () => {
    const backendResponse = new Response(null, {
      status: 204,
      headers: { "Content-Type": "application/json" },
    });
    const jsonSpy = vi.spyOn(backendResponse, "json");
    mockFetch.mockResolvedValue(backendResponse);
    const request = new NextRequest(
      "http://localhost:3000/api/v1/products/prod-1",
      { method: "DELETE" },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ path: ["prod-1"] }),
    });

    expect(jsonSpy).not.toHaveBeenCalled();
    expect(response.status).toBe(204);
  });
});
