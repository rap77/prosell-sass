/**
 * Proxy API Route: Vehicles (v1)
 *
 * Proxies requests to the backend FastAPI server at localhost:8000
 * This is necessary because Next.js rewrites don't forward httpOnly cookies.
 *
 * Pattern: /api/v1/vehicles/[...path] → http://localhost:8000/api/v1/vehicles/[...path]
 */

import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

async function proxyRequest(request: NextRequest, path: string[]) {
  try {
    // Build backend URL
    const pathStr = path.join("/");
    const url = new URL(`${BACKEND_URL}/api/v1/vehicles/${pathStr}`);

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
    const nextResponse = NextResponse.json(await response.json(), {
      status: response.status,
      statusText: response.statusText,
    });

    // Forward Set-Cookie headers to browser
    setCookieHeaders.forEach((cookie) => {
      nextResponse.headers.append("Set-Cookie", cookie);
    });

    // Forward other relevant headers
    if (response.headers.get("Content-Type")) {
      nextResponse.headers.set("Content-Type", response.headers.get("Content-Type")!);
    }

    return nextResponse;
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { detail: "Proxy error: Failed to reach backend" },
      { status: 502 }
    );
  }
}
