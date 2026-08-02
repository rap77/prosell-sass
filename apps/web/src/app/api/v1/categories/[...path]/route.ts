/**
 * Proxy API Route: Categories (v1) - Subpath
 *
 * Handles requests to /api/v1/categories/[...path]
 * Proxies to backend FastAPI server
 *
 * Pattern: /api/v1/categories/123 → backend/api/v1/categories/123
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

export async function PATCH(
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
    const pathStr = path.join("/");
    const url = new URL(`${BACKEND_URL}/api/v1/categories/${pathStr}`);

    request.nextUrl.searchParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });

    const cookieHeader = request.headers.get("cookie");
    const headers: HeadersInit = {
      "Content-Type": request.headers.get("Content-Type") || "application/json",
    };
    if (cookieHeader) {
      headers["Cookie"] = cookieHeader;
    }

    const options: RequestInit = {
      method: request.method,
      headers,
    };

    if (request.method !== "GET" && request.method !== "HEAD") {
      const body = await request.text();
      if (body) {
        options.body = body;
      }
    }

    const response = await fetch(url.toString(), options);
    const setCookieHeaders = response.headers.getSetCookie();

    // ponytail: 204 has no body — return empty response
    if (response.status === 204) {
      const nextResponse = new NextResponse(null, {
        status: 204,
        statusText: response.statusText,
      });
      setCookieHeaders.forEach((cookie) => {
        nextResponse.headers.append("Set-Cookie", cookie);
      });
      return nextResponse;
    }

    const nextResponse = NextResponse.json(await response.json(), {
      status: response.status,
      statusText: response.statusText,
    });

    setCookieHeaders.forEach((cookie) => {
      nextResponse.headers.append("Set-Cookie", cookie);
    });

    if (response.headers.get("Content-Type")) {
      nextResponse.headers.set(
        "Content-Type",
        response.headers.get("Content-Type")!,
      );
    }

    return nextResponse;
  } catch {
    // ponytail: error details in response, no console in production
    return NextResponse.json(
      { detail: "Proxy error: Failed to reach backend" },
      { status: 502 },
    );
  }
}
