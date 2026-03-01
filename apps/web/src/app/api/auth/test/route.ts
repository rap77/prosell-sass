import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    console.log("[TEST] Starting test endpoint");

    const cookieStore = await cookies();
    console.log("[TEST] Got cookie store");

    cookieStore.set("test_cookie", "test_value", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60,
    });

    console.log("[TEST] Cookie set");

    return NextResponse.json({ success: true, message: "Cookie test passed" });
  } catch (error) {
    console.error("[TEST] ERROR:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}
