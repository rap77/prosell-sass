/**
 * Mock API Route: Verify Email
 *
 * This route handler mocks the FastAPI backend verify-email endpoint for E2E testing.
 * In production, this would be proxied to the actual FastAPI backend.
 *
 * POST /api/auth/verify-email - Mock email verification for E2E testing
 */

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

// ============================================
// TYPES
// ============================================

interface VerifyEmailRequest {
  token: string;
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
    const body: VerifyEmailRequest = await request.json();

    // Validate token
    if (!body.token || typeof body.token !== "string") {
      return NextResponse.json(
        { detail: "Token is required" },
        { status: 400 },
      );
    }

    // Mock verification logic
    // Accept any non-empty token for E2E testing
    if (body.token.trim().length === 0) {
      return NextResponse.json({ detail: "Invalid token" }, { status: 400 });
    }

    // Specific test tokens that should fail
    if (body.token === "invalid" || body.token === "expired") {
      return NextResponse.json(
        { detail: "Invalid or expired token" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      message: "Email verified successfully",
    });
  } catch (error) {
    logger.error("Mock verify email error", error);
    return NextResponse.json(
      { detail: "Internal server error" },
      { status: 500 },
    );
  }
}
