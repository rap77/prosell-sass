/**
 * Proxy API Route: Vehicles (v1) - Base path
 *
 * Handles requests to /api/v1/vehicles (without subpath)
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
    const url = new URL(`${BACKEND_URL}/api/v1/vehicles`);

    // Copy query parameters
    request.nextUrl.searchParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });

    // Get cookies from the incoming request
    const cookieHeader = request.headers.get("cookie");

    // DEBUG: Log cookies for debugging
    console.log("[PROXY DEBUG] Cookies present:", !!cookieHeader);
    console.log("[PROXY DEBUG] access_token present:", cookieHeader?.includes("access_token"));
    console.log("[PROXY DEBUG] Cookie header length:", cookieHeader?.length || 0);

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

    // Include body for POST requests
    if (request.method === "POST") {
      const body = await request.text();
      if (body) {
        options.body = body;
      }
    }

    // Forward request to backend
    console.log("[PROXY DEBUG] Fetching backend:", url.toString());
    console.log("[PROXY DEBUG] Request headers:", JSON.stringify(headers));
    const response = await fetch(url.toString(), options);
    console.log("[PROXY DEBUG] Response status:", response.status);

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
