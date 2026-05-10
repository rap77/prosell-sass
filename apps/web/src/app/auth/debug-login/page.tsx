/**
 * Minimal login page to debug the hanging issue
 */

import { cookies } from "next/headers";

export const metadata = {
  title: "Debug Login",
};

export default async function DebugLoginPage() {
  const cookieStore = await cookies();
  const cookieCount = cookieStore.getAll().length;

  return (
    <div>
      <h1>Debug Login Page</h1>
      <p>If you can see this, cookies() is not hanging.</p>
      <p>Cookies available: {cookieCount}</p>
    </div>
  );
}
