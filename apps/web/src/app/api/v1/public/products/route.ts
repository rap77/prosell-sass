/**
 * Proxy API Route: Public products (v1) — the no-auth public catalog list
 * (workbook bloque 4, ítem 4.6).
 *
 * Handles requests to /api/v1/public/products (the listing root — subpaths
 * like /{slug}/image-urls are fetched server-side by /p/[slug], not here).
 * Proxies to the backend FastAPI server:
 *   /api/v1/public/products?limit=24 → http://localhost:8000/api/v1/public/products?limit=24
 *
 * No auth headers are forwarded: the public endpoint is unauthenticated by
 * design (§7 del diagnóstico) — the visitor never passes through the
 * internal RBAC.
 */

import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.API_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(`${BACKEND_URL}/api/v1/public/products`);
    // Copy query parameters verbatim (search/condition/min_price/max_price/
    // limit/skip from the landing catalog's filters).
    url.search = request.nextUrl.search;

    const response = await fetch(url.toString());

    const contentType = response.headers.get("Content-Type") || "";

    // Same JSON/blob branching as the products proxy: non-JSON bodies pass
    // through as a raw blob instead of forcing response.json() on them.
    const nextResponse = contentType.includes("application/json")
      ? NextResponse.json(await response.json(), {
          status: response.status,
          statusText: response.statusText,
        })
      : new NextResponse(await response.blob(), {
          status: response.status,
          statusText: response.statusText,
        });

    if (contentType) {
      nextResponse.headers.set("Content-Type", contentType);
    }

    return nextResponse;
  } catch {
    // Error propagated via response status
    return NextResponse.json(
      { detail: "Proxy error: Failed to reach backend" },
      { status: 502 },
    );
  }
}
