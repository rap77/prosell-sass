/**
 * Proxy API Route: Products (v1) - Base path
 *
 * Handles requests to /api/v1/products (without subpath)
 * Proxies to backend FastAPI server at localhost:8000
 */

import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.API_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  return proxyRequest(request);
}

export async function POST(request: NextRequest) {
  return proxyRequest(request);
}

async function proxyRequest(request: NextRequest) {
  try {
    // Build backend URL
    const url = new URL(`${BACKEND_URL}/api/v1/products`);

    // Copy query parameters verbatim, including repeated keys (e.g.
    // `organization_ids` sent once per selected org by the catalog's
    // multi-select filter) — forEach+set() previously collapsed repeats
    // to the last value, silently dropping every org but the last one.
    url.search = request.nextUrl.search;

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
    const contentType = response.headers.get("Content-Type");
    if (contentType) {
      nextResponse.headers.set("Content-Type", contentType);
    }

    return nextResponse;
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { detail: "Proxy error: Failed to reach backend" },
      { status: 502 },
    );
  }
}
