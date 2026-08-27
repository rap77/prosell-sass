/**
 * Proxy API Route: Products (v1) - Subpath
 *
 * Handles requests to /api/v1/products/[...path]
 * Proxies to backend FastAPI server at localhost:8000
 *
 * Pattern: /api/v1/products/123 → http://localhost:8000/api/v1/products/123
 */

import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.API_URL || "http://localhost:8000";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

async function proxyRequest(request: NextRequest, path: string[]) {
  try {
    // Build backend URL
    const pathStr = path.map(encodeURIComponent).join("/");
    const url = new URL(`${BACKEND_URL}/api/v1/products/${pathStr}`);

    // Copy query parameters
    request.nextUrl.searchParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });

    // Get cookies from the incoming request
    const cookieHeader = request.headers.get("cookie");

    // Prepare headers for backend request
    const headers: HeadersInit = {
      "Content-Type": request.headers.get("Content-Type") || "application/json",
    };

    // Include cookies if present
    if (cookieHeader) {
      headers["Cookie"] = cookieHeader;
    }

    // Bug: If-Match was silently dropped, 422'ing every optimistic-locking
    // endpoint (reverse/resubmit/restore/revert-sale) when called from the
    // browser through this proxy — direct API calls never hit this file,
    // so it went unnoticed. Forward it whenever the caller sent one.
    const ifMatchHeader = request.headers.get("if-match");
    if (ifMatchHeader) {
      headers["If-Match"] = ifMatchHeader;
    }

    // Prepare request options
    const options: RequestInit = {
      method: request.method,
      headers,
    };

    // Include body for non-GET requests
    if (request.method !== "GET" && request.method !== "HEAD") {
      const body = await request.text();
      if (body) {
        options.body = body;
      }
    }

    // Forward request to backend
    const response = await fetch(url.toString(), options);

    // Get response cookies and set them in the Next.js response
    const setCookieHeaders = response.headers.getSetCookie();
    const contentType = response.headers.get("Content-Type") || "";

    // Bug (same class as the If-Match fix above): this proxy used to force
    // `response.json()` on every backend response, which throws on a
    // non-JSON body (e.g. the export.csv StreamingResponse) and masks it as
    // a generic 502. Non-JSON responses are passed through as a raw blob
    // instead, preserving Content-Disposition so file downloads still work.
    const nextResponse = contentType.includes("application/json")
      ? NextResponse.json(await response.json(), {
          status: response.status,
          statusText: response.statusText,
        })
      : new NextResponse(await response.blob(), {
          status: response.status,
          statusText: response.statusText,
        });

    // Forward Set-Cookie headers to browser
    setCookieHeaders.forEach((cookie) => {
      nextResponse.headers.append("Set-Cookie", cookie);
    });

    // Forward other relevant headers
    if (contentType) {
      nextResponse.headers.set("Content-Type", contentType);
    }
    const contentDisposition = response.headers.get("Content-Disposition");
    if (contentDisposition) {
      nextResponse.headers.set("Content-Disposition", contentDisposition);
    }

    return nextResponse;
  } catch (error) {
    // Error propagated via response status
    return NextResponse.json(
      { detail: "Proxy error: Failed to reach backend" },
      { status: 502 },
    );
  }
}
