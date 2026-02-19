/**
 * Mock API Route: Reset Password
 *
 * This route handler mocks the FastAPI backend reset-password endpoint for E2E testing.
 * In production, this would be proxied to the actual FastAPI backend.
 *
 * POST /api/auth/reset-password - Mock reset password for E2E testing
 */

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

// ============================================
// TYPES
// ============================================

interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

interface MessageResponse {
  message: string;
}

interface ErrorResponse {
  detail: string;
}

// ============================================
// ROUTE HANDLER
// ============================================

export async function POST(request: Request): Promise<
  NextResponse<MessageResponse | ErrorResponse>
> {
  try {
    const body: ResetPasswordRequest = await request.json();

    // Validate token
    if (!body.token || typeof body.token !== "string") {
      return NextResponse.json(
        { detail: "Token is required" },
        { status: 400 }
      );
    }

    // Validate password
    if (!body.new_password || typeof body.new_password !== "string") {
      return NextResponse.json(
        { detail: "New password is required" },
        { status: 400 }
      );
    }

    // Validate password length
    if (body.new_password.length < 8) {
      return NextResponse.json(
        { detail: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Mock reset logic
    // Specific test tokens that should fail
    if (body.token === "invalid" || body.token === "expired") {
      return NextResponse.json(
        { detail: "Invalid or expired token" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: "Password reset successfully",
    });
  } catch (error) {
    logger.error("Mock reset password error", error);
    return NextResponse.json(
      { detail: "Internal server error" },
      { status: 500 }
    );
  }
}
