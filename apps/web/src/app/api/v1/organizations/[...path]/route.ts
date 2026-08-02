/** Proxy organization subpaths to the FastAPI backend. */

import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.API_URL || "http://localhost:8000";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const backendUrl = new URL(
    `${BACKEND_URL}/api/v1/organizations/${path.join("/")}`,
  );
  request.nextUrl.searchParams.forEach((value, key) => {
    backendUrl.searchParams.set(key, value);
  });

  const headers = new Headers();
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) headers.set("cookie", cookieHeader);

  const response = await fetch(backendUrl, { headers });
  return NextResponse.json(await response.json(), {
    status: response.status,
    statusText: response.statusText,
  });
}
