/**
 * Mock API Route: Register
 *
 * This route handler mocks the FastAPI backend register endpoint for E2E testing.
 * In production, this would be proxied to the actual FastAPI backend.
 *
 * POST /api/auth/register - Mock registration for E2E testing
 */

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

// ============================================
// TYPES
// ============================================

interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

interface LoginResponse {
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    is_email_verified: boolean;
    is_2fa_enabled: boolean;
  };
}

interface ErrorResponse {
  detail: string;
}

// ============================================
// ROUTE HANDLER
// ============================================

export async function POST(request: Request): Promise<
  NextResponse<LoginResponse | ErrorResponse>
> {
  try {
    const body: RegisterRequest = await request.json();

    // Validate required fields
    if (!body.email || !body.password || !body.first_name || !body.last_name) {
      return NextResponse.json(
        { detail: "All fields are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { detail: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate password length
    if (body.password.length < 8) {
      return NextResponse.json(
        { detail: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Create mock user
    const mockUser = {
      id: `user-${Date.now()}`,
      email: body.email,
      first_name: body.first_name.trim(),
      last_name: body.last_name.trim(),
      role: "user",
      is_email_verified: false, // New users need email verification
      is_2fa_enabled: false,
    };

    // Create mock tokens
    const mockAccessToken = `mock_access_token_${Date.now()}`;
    const mockRefreshToken = `mock_refresh_token_${Date.now()}`;

    // Set httpOnly cookies
    const cookieStore = await cookies();

    cookieStore.set("access_token", mockAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60, // 1 hour
    });

    cookieStore.set("refresh_token", mockRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    // Store user data in cookie
    cookieStore.set("user_data", JSON.stringify(mockUser), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60, // 1 hour
    });

    // Return user data
    return NextResponse.json({
      user: mockUser,
    });
  } catch (error) {
    logger.error("Mock register error", error);
    return NextResponse.json(
      { detail: "Internal server error" },
      { status: 500 }
    );
  }
}
