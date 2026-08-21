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
import { POST } from "./route";

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
});
