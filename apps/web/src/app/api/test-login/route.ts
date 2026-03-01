import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const MOCK_USER = {
  id: "test-user-123",
  email: "test@example.com",
  firstName: "Test",
  lastName: "User",
  role: "user",
  isEmailVerified: true,
  is2faEnabled: false,
};

export async function POST(request: Request) {
  try {
    console.log("[TEST-LOGIN] Starting");

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ detail: "Missing credentials" }, { status: 400 });
    }

    const mockAccessToken = `mock_access_token_${Date.now()}`;
    const cookieStore = await cookies();

    cookieStore.set("access_token", mockAccessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
    });

    cookieStore.set("user_data", "test_user", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
    });

    return NextResponse.json({ user: MOCK_USER });
  } catch (error: any) {
    console.error("[TEST-LOGIN] ERROR:", error);
    return NextResponse.json({ detail: error?.message || "Error" }, { status: 500 });
  }
}
