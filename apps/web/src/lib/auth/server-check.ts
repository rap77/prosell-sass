/**
 * Server-side authentication utilities
 *
 * Helper functions for Server Components to check authentication status.
 * Uses React.cache() for per-request deduplication (Next.js 15+).
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

/**
 * Check if user is authenticated from cookies (cached per request)
 *
 * This function is cached with React.cache() to avoid multiple cookie reads
 * within the same request. Next.js 15+ recommends using cache() instead of
 * unstable_cache() for per-request deduplication.
 *
 * @returns Object with authentication status and redirect function
 *
 * @example
 * ```tsx
 * export default async function MyPage() {
 *   const auth = await checkAuthServer();
 *   if (auth.isAuthenticated) {
 *     auth.redirectTo("/dashboard");
 *   }
 *   return <Page />;
 * }
 * ```
 */
export const checkAuthServer = cache(async function checkAuthServer() {
  const cookieStore = await cookies();

  const accessToken = cookieStore.get("access_token")?.value;
  const userDataCookie = cookieStore.get("user_data")?.value;

  const isAuthenticated = Boolean(accessToken && userDataCookie);

  // Safely parse user data from cookie
  let userData = null;
  if (userDataCookie) {
    try {
      userData = JSON.parse(userDataCookie);
    } catch {
      // Invalid JSON in cookie, treat as not authenticated
      userData = null;
    }
  }

  return {
    isAuthenticated,
    accessToken: accessToken || null,
    userData,

    /**
     * Redirect to a path if authenticated (convenience method)
     * Usage: `if (auth.isAuthenticated) auth.redirectTo("/dashboard");`
     */
    redirectTo: (path: string) => {
      if (isAuthenticated) {
        redirect(path);
      }
    },
  };
});
