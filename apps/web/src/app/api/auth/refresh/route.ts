/**
 * API Route: Token Refresh
 *
 * Reads the refresh_token httpOnly cookie server-side, calls the backend
 * refresh endpoint, and sets new access_token + refresh_token cookies.
 *
 * Called by fetchWithAuth when any API request returns 401.
 */

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { BackendRefreshResponseSchema } from "@/lib/api/schemas/authRoutes";

export async function POST(): Promise<NextResponse> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refresh_token")?.value;

  if (!refreshToken) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const apiUrl = process.env.API_URL ?? "http://localhost:8000";

  try {
    const res = await fetch(`${apiUrl}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) {
      cookieStore.delete("access_token");
      cookieStore.delete("refresh_token");
      cookieStore.delete("user_data");
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const data = BackendRefreshResponseSchema.parse(await res.json());

    const isDev = process.env.NODE_ENV !== "production";
    const response = NextResponse.json({ ok: true });

    const accessExpiry = new Date(Date.now() + 15 * 60 * 1000);
    const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    response.cookies.set("access_token", data.access_token, {
      httpOnly: !isDev,
      secure: !isDev,
      sameSite: "lax",
      path: "/",
      expires: accessExpiry,
    });

    response.cookies.set("refresh_token", data.refresh_token, {
      httpOnly: !isDev,
      secure: !isDev,
      sameSite: "lax",
      path: "/",
      expires: refreshExpiry,
    });

    return response;
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
