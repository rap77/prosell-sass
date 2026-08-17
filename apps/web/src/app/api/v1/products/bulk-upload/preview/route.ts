/**
 * Custom API route for bulk-upload preview to handle large ZIP files (60MB+).
 *
 * Next.js has a 4MB body size limit by default when using rewrites/proxy.
 * This route disables body parsing and proxies the multipart request directly
 * to the FastAPI backend without size limits.
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs"; // Required for fetch with body stream
export const maxDuration = 60; // 60 seconds for large uploads

// Disable Next.js body parser to allow streaming large files
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const apiUrl =
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000";

  try {
    // Forward the request to FastAPI backend with the same headers
    const headers = new Headers();

    // Copy relevant headers (skip host, connection, etc.)
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      headers.set("cookie", cookieHeader);
    }

    // Important: preserve the content-type header (multipart/form-data with boundary)
    const contentType = request.headers.get("content-type");
    if (contentType) {
      headers.set("content-type", contentType);
    }

    const response = await fetch(
      `${apiUrl}/api/v1/products/bulk-upload/preview`,
      {
        method: "POST",
        headers,
        // @ts-expect-error - body can be ReadableStream in Node.js runtime
        body: request.body,
        // ponytail: duplex required for streaming request body
        // @ts-expect-error - duplex is valid but not in types
        duplex: "half",
      },
    );

    // Forward the response from FastAPI
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[Preview API Route] Error:", error);
    return NextResponse.json(
      { detail: "Failed to proxy request to backend" },
      { status: 500 },
    );
  }
}
