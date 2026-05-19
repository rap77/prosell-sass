/**
 * 2FA Setup Page
 *
 * Server Component that checks authentication and renders Setup2FAPageContent.
 * Users can enable or disable two-factor authentication from this page.
 */

import { checkAuthServer } from "@/lib/auth/server-check";
import { redirect } from "next/navigation";
import { Setup2FAPageContent } from "./Setup2FAPageContent";

export default async function Setup2FAPage() {
  // Server-side authentication check (cached per request with React.cache)
  const auth = await checkAuthServer();

  // User must be authenticated to access 2FA setup
  if (!auth.isAuthenticated) {
    redirect("/auth/login?redirect=/auth/setup-2fa");
  }

  const is2FAEnabled = auth.userData?.is_2fa_enabled ?? false;

  return <Setup2FAPageContent is2FAEnabled={is2FAEnabled} />;
}
