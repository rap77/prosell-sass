/**
 * Mock API Route: Login
 *
 * Simplified version for E2E testing
 */

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const MOCK_USER = {
  id: "test-user-123",
  email: process.env.TEST_USER_EMAIL || "test@example.com",
  first_name: "Test",
  last_name: "User",
  role: "user",
  is_email_verified: true,
  is_2fa_enabled: false,
};

// GET for testing
export async function GET() {
  return NextResponse.json({ message: "Login endpoint is ready" });
}

export async function POST(request: Request) {
  try {
    console.log("[LOGIN POST] Starting...");

    console.log("[LOGIN POST] Reading body...");
    const body = await request.json();
    console.log("[LOGIN POST] Body:", body);

    const { email, password } = body;

    // Simple validation - just check if they exist and are strings
    if (!email || !password) {
      console.log("[LOGIN POST] Missing credentials");
      return NextResponse.json(
        { detail: "Email and password required" },
        { status: 400 },
      );
    }

    console.log("[LOGIN POST] Credentials received");

    // Create mock tokens
    const mockAccessToken = `mock_access_token_${Date.now()}`;
    const mockRefreshToken = `mock_refresh_token_${Date.now()}`;

    console.log("[LOGIN POST] Getting cookie store...");
    const cookieStore = await cookies();

    // In development/test, make cookies accessible to Playwright for E2E testing
    // httpOnly is only effective in production
    const isDev = process.env.NODE_ENV !== "production";

    console.log("[LOGIN POST] Setting cookies...");
    cookieStore.set("access_token", mockAccessToken, {
      httpOnly: !isDev, // Not httpOnly in dev so Playwright can access them
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
    });

    cookieStore.set("refresh_token", mockRefreshToken, {
      httpOnly: !isDev,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    const userData = JSON.stringify(MOCK_USER);
    cookieStore.set("user_data", userData, {
      httpOnly: !isDev,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
    });

    console.log("[LOGIN POST] Cookies set, returning response");

    // Return user data
    return NextResponse.json({ user: MOCK_USER });
  } catch (error) {
    console.error("[LOGIN POST] ERROR:", error);
    return NextResponse.json(
      { detail: "Internal server error" },
      { status: 500 },
    );
  }
}
