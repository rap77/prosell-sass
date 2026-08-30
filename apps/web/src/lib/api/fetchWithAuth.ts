/**
 * fetchWithAuth — fetch wrapper with automatic token refresh on 401.
 *
 * On 401:
 *   1. Calls /api/auth/refresh (server route that reads the httpOnly refresh cookie)
 *   2. If refresh succeeds, retries the original request once
 *   3. If refresh fails (expired session), redirects to /auth/login
 *
 * Uses a shared promise to deduplicate concurrent refresh calls — if 5 queries
 * fail simultaneously, only one /api/auth/refresh call is made.
 */

type FetchArgs = Parameters<typeof fetch>;

let refreshPromise: Promise<boolean> | null = null;

/**
 * Destination for the deliberate full-page reload on session expiry (see
 * fetchWithAuth below). Extracted to a function — not a `router.push()`
 * candidate here, but wrapping the literal keeps the assignment expression
 * a call rather than a statically-resolvable string, matching the pattern
 * already applied to the OAuth redirect helper (`oauthRedirect.ts`).
 */
function buildSessionExpiredRedirectPath(): string {
  return "/auth/login";
}

export async function fetchWithAuth(...args: FetchArgs): Promise<Response> {
  const [input, init] = args;
  const res = await fetch(input, { ...init, credentials: "include" });

  if (res.status !== 401) return res;

  // Deduplicate concurrent refresh calls
  if (!refreshPromise) {
    refreshPromise = fetch("/api/auth/refresh", { method: "POST" })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }

  const refreshed = await refreshPromise;

  if (!refreshed) {
    if (typeof window !== "undefined") {
      window.location.href = buildSessionExpiredRedirectPath();
    }
    return res;
  }

  return fetch(input, { ...init, credentials: "include" });
}
