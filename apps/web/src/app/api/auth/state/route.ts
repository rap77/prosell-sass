/**
 * API Route: Authentication State
 *
 * This route handler provides the current authentication state
 * by forwarding cookies to the backend for JWT verification.
 *
 * Server-Side Performance: Uses after() for non-blocking error logging
 *
 * GET /api/auth/state - Returns current auth state (verifies JWT via backend)
 * DELETE /api/auth/state - Clears auth state (logout)
 */

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { after } from "next/server";
import { logger } from "@/lib/logger";
import {
  AuthStateResponseSchema,
  type AuthStateResponse,
} from "@/lib/api/schemas/authRoutes";

// ============================================
// ROUTE HANDLER
// ============================================

export async function GET(): Promise<NextResponse<AuthStateResponse>> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("access_token")?.value;

    // Fast path: no access_token cookie → not authenticated
    if (!accessToken) {
      return NextResponse.json({ isAuthenticated: false });
    }

    // Forward all cookies to backend for JWT verification
    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");

    const apiUrl = process.env.API_URL ?? "http://localhost:8000";
    const response = await fetch(`${apiUrl}/api/v1/auth/state`, {
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ isAuthenticated: false });
    }

    const authState = AuthStateResponseSchema.parse(await response.json());
    return NextResponse.json(authState);
  } catch (error) {
    // Non-blocking error logging with after() - doesn't delay response
    after(() => {
      logger.error("Error getting auth state", error);
    });
    return NextResponse.json({ isAuthenticated: false });
  }
}

export async function DELETE(): Promise<NextResponse<{ success: boolean }>> {
  try {
    const cookieStore = await cookies();

    // Delete all auth cookies
    cookieStore.delete("access_token");
    cookieStore.delete("refresh_token");
    cookieStore.delete("user_data");

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    // Non-blocking error logging with after() - doesn't delay response
    after(() => {
      logger.error("Error clearing auth state", error);
    });
    return NextResponse.json({
      success: false,
    });
  }
}
