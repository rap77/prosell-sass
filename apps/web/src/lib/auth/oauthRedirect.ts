/**
 * Builds the backend OAuth "authorize" URL for a given provider.
 *
 * Pure function — it only constructs and returns the URL, it never performs
 * the navigation side-effect. The call site stays responsible for
 * `window.location.href = buildOAuthAuthorizeUrl(provider)` (a genuine
 * cross-origin, full-page redirect to the backend OAuth flow — not an
 * internal Next.js route, so `router.push()` does not apply here).
 *
 * Consolidates what used to be duplicated inline in LoginPageContent.tsx and
 * RegisterPageContent.tsx.
 */
export function buildOAuthAuthorizeUrl(
  provider: "google" | "microsoft",
): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  return `${base}/api/auth/oauth/${provider}/authorize`;
}
