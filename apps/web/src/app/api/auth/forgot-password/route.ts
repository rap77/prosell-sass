/**
 * Mock API Route: Forgot Password
 *
 * This route handler mocks the FastAPI backend forgot-password endpoint for E2E testing.
 * In production, this would be proxied to the actual FastAPI backend.
 *
 * POST /api/auth/forgot-password - Mock forgot password for E2E testing
 */

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

// ============================================
// TYPES
// ============================================

interface ForgotPasswordRequest {
  email: string;
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

export async function POST(
  request: Request,
): Promise<NextResponse<MessageResponse | ErrorResponse>> {
  try {
    const body: ForgotPasswordRequest = await request.json();

    // Validate email
    if (!body.email || typeof body.email !== "string") {
      return NextResponse.json(
        { detail: "Email is required" },
        { status: 400 },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { detail: "Invalid email format" },
        { status: 400 },
      );
    }

    // Mock forgot password - always return success for E2E testing
    // In production, this would send an email with a reset token
    return NextResponse.json({
      message:
        "If an account exists with this email, a password reset link has been sent",
    });
  } catch (error) {
    logger.error("Mock forgot password error", error);
    return NextResponse.json(
      { detail: "Internal server error" },
      { status: 500 },
    );
  }
}
