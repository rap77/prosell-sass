/**
 * Mock API Route: Login
 *
 * This route handler mocks the FastAPI backend login endpoint for E2E testing.
 * In production, this would be proxied to the actual FastAPI backend.
 *
 * POST /api/auth/login - Mock login for E2E testing
 */

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

// ============================================
// TYPES
// ============================================

interface LoginRequest {
  email: string;
  password: string;
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

// Mock user for E2E testing (read from env vars or use defaults)
const MOCK_USER = {
  id: "test-user-123",
  email: process.env.TEST_USER_EMAIL || "test@example.com",
  first_name: "Test",
  last_name: "User",
  role: "user",
  is_email_verified: true,
  is_2fa_enabled: false,
};

const MOCK_PASSWORD = process.env.TEST_USER_PASSWORD || "TestPassword123!";

// ============================================
// ROUTE HANDLER
// ============================================

export async function POST(request: Request): Promise<
  NextResponse<LoginResponse | ErrorResponse>
> {
  try {
    const body: LoginRequest = await request.json();

    // Validate email and password
    if (!body.email || !body.password) {
      return NextResponse.json(
        { detail: "Email and password are required" },
        { status: 400 }
      );
    }

    // Mock authentication logic
    // In E2E tests, accept any credentials that match the mock user
    // or use a special test user pattern
    const isValidEmail =
      body.email === MOCK_USER.email ||
      body.email.startsWith("test.") ||
      body.email.endsWith("@example.com");

    // Password must match exactly OR be at least 8 chars for test users
    // BUT reject specific short passwords for testing error cases
    const isShortPassword = body.password.length < 8;
    const isValidPassword =
      body.password === MOCK_PASSWORD ||
      (body.password.length >= 8 && !isShortPassword);

    if (!isValidEmail || !isValidPassword || isShortPassword) {
      return NextResponse.json(
        { detail: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Artificial delay to simulate network latency for E2E tests
    // This allows the UI to show loading states
    await new Promise(resolve => setTimeout(resolve, 500));

    // Create mock tokens (in real backend, these would be JWT)
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

    // Store user data in cookie for client-side access
    cookieStore.set("user_data", JSON.stringify(MOCK_USER), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60, // 1 hour
    });

    // Return user data
    return NextResponse.json({
      user: MOCK_USER,
    });
  } catch (error) {
    logger.error("Mock login error", error);
    return NextResponse.json(
      { detail: "Internal server error" },
      { status: 500 }
    );
  }
}
