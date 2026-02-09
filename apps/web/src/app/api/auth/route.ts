/**
 * API Route: Authentication State
 *
 * This route handler provides the current authentication state
 * from server-side cookies, solving the hydration mismatch issue.
 *
 * GET /api/auth/state - Returns current auth state
 * DELETE /api/auth/state - Clears auth state (logout)
 */

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// ============================================
// TYPES
// ============================================

interface AuthStateResponse {
  isAuthenticated: boolean;
  user?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    is_email_verified: boolean;
    is_2fa_enabled: boolean;
  };
  accessToken?: string;
}

// ============================================
// ROUTE HANDLER
// ============================================

export async function GET(): Promise<NextResponse<AuthStateResponse>> {
  try {
    const cookieStore = await cookies();

    const accessToken = cookieStore.get("access_token")?.value;
    const refreshToken = cookieStore.get("refresh_token")?.value;
    const userDataStr = cookieStore.get("user_data")?.value;

    if (!accessToken || !refreshToken || !userDataStr) {
      return NextResponse.json({
        isAuthenticated: false,
      });
    }

    let user;
    try {
      user = JSON.parse(userDataStr);
    } catch (error) {
      console.error("Failed to parse user data:", error);
      return NextResponse.json({
        isAuthenticated: false,
      });
    }

    return NextResponse.json({
      isAuthenticated: true,
      user,
      accessToken,
    });
  } catch (error) {
    console.error("Error getting auth state:", error);
    return NextResponse.json({
      isAuthenticated: false,
    });
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
    console.error("Error clearing auth state:", error);
    return NextResponse.json({
      success: false,
    });
  }
}
