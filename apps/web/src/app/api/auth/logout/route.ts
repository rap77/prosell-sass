/**
 * Mock API Route: Logout
 *
 * This route handler mocks the FastAPI backend logout endpoint for E2E testing.
 * In production, this would be proxied to the actual FastAPI backend.
 *
 * POST /api/auth/logout - Mock logout for E2E testing
 */

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

// ============================================
// ROUTE HANDLER
// ============================================

export async function POST(): Promise<NextResponse<{ success: boolean }>> {
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
    logger.error("Mock logout error", error);
    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}
