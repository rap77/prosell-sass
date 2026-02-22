/**
 * Mock API Route: Get Current User
 *
 * This route handler mocks the FastAPI backend /me endpoint for E2E testing.
 * In production, this would be proxied to the actual FastAPI backend.
 *
 * GET /api/auth/me - Mock get current user for E2E testing
 */

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

// ============================================
// TYPES
// ============================================

interface UserResponse {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_email_verified: boolean;
  is_2fa_enabled: boolean;
}

interface ErrorResponse {
  detail: string;
}

// ============================================
// ROUTE HANDLER
// ============================================

export async function GET(): Promise<
  NextResponse<UserResponse | ErrorResponse>
> {
  try {
    const cookieStore = await cookies();

    const userDataStr = cookieStore.get("user_data")?.value;

    if (!userDataStr) {
      return NextResponse.json(
        { detail: "Not authenticated" },
        { status: 401 },
      );
    }

    let user;
    try {
      user = JSON.parse(userDataStr);
    } catch (error) {
      logger.error("Failed to parse user data", error);
      return NextResponse.json({ detail: "Invalid session" }, { status: 401 });
    }

    // Return user data
    return NextResponse.json(user);
  } catch (error) {
    logger.error("Mock get current user error", error);
    return NextResponse.json(
      { detail: "Internal server error" },
      { status: 500 },
    );
  }
}
