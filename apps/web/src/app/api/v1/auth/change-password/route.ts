import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.API_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  return proxyRequest(request, "/api/v1/auth/change-password");
}

async function proxyRequest(request: NextRequest, path: string) {
  try {
    const url = new URL(`${BACKEND_URL}${path}`);
    const cookieHeader = request.headers.get("cookie");

    const headers: Record<string, string> = {
      "Content-Type": request.headers.get("Content-Type") || "application/json",
    };

    if (cookieHeader) {
      headers.Cookie = cookieHeader;
    }

    const body = await request.text();
    const response = await fetch(url.toString(), {
      method: request.method,
      headers,
      body: body || undefined,
    });

    const nextResponse = NextResponse.json(await response.json(), {
      status: response.status,
      statusText: response.statusText,
    });

    response.headers.getSetCookie().forEach((cookie) => {
      nextResponse.headers.append("Set-Cookie", cookie);
    });

    return nextResponse;
  } catch {
    return NextResponse.json(
      { detail: "Proxy error: Failed to reach backend" },
      { status: 502 },
    );
  }
}
