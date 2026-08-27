/**
 * Bug (same class as products/[...path]/route.ts's If-Match fix): this proxy
 * forced `response.json()` on every backend response, which throws on a
 * non-JSON body (e.g. downloadSchemaTemplate's CSV) and masks it as a
 * generic 502.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe("categories proxy route", () => {
  it("passes through a JSON response as before", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ id: "cat-1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const request = new NextRequest(
      "http://localhost:3000/api/v1/categories/cat-1",
    );

    const response = await GET(request, {
      params: Promise.resolve({ path: ["cat-1"] }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ id: "cat-1" });
  });

  it("passes through a non-JSON response (e.g. CSV template) as a blob instead of throwing", async () => {
    mockFetch.mockResolvedValue(
      new Response("title,price,category_id\n", {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": 'attachment; filename="template.csv"',
        },
      }),
    );

    const request = new NextRequest(
      "http://localhost:3000/api/v1/categories/cat-1/schema/template.csv",
    );

    const response = await GET(request, {
      params: Promise.resolve({ path: ["cat-1", "schema", "template.csv"] }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/csv");
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="template.csv"',
    );
    const responseBlob = await response.blob();
    expect(responseBlob.size).toBeGreaterThan(0);
  });
});
