/**
 * Minimal login page to debug the hanging issue
 */

import { cookies } from "next/headers";

export const metadata = {
  title: "Debug Login",
};

export default async function DebugLoginPage() {
  // Test if cookies() is hanging
  console.log("[DEBUG] Before cookies()");
  const cookieStore = await cookies();
  console.log("[DEBUG] After cookies()");

  // Test if checkAuthServer is hanging
  console.log("[DEBUG] Before checkAuthServer");
  // const { checkAuthServer } = await import("@/lib/auth/server-check");
  // const auth = await checkAuthServer();
  console.log("[DEBUG] After checkAuthServer");

  return (
    <div>
      <h1>Debug Login Page</h1>
      <p>If you can see this, cookies() is not hanging.</p>
      <p>Check server console for debug messages.</p>
    </div>
  );
}
