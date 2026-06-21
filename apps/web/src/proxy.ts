/**
 * Next.js Middleware for Route Protection
 *
 * This middleware runs on the Edge Runtime and protects routes by checking
 * for auth cookies. Unauthenticated users are redirected to login.
 *
 * Performance optimizations:
 * - React.cache for per-request deduplication
 * - Cached route matching
 * - Optimized JSON parsing with memoization
 * - Minimal data serialization
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/middleware
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ============================================
// PERFORMANCE OPTIMIZATIONS
// ============================================

// React.cache for per-request deduplication
const cache = {
  // Cache for route matching patterns
  routeMatcher: new Map<string, boolean>(),

  // Cache for JSON parsing results
  jsonParseCache: new Map<string, unknown>(),
};

/**
 * Optimized route matching with React.cache pattern
 * Avoids regex compilation on every request
 */
const matchRoute = (() => {
  const patternCache = new Map<string, RegExp>();

  return (pathname: string, route: string): boolean => {
    // Check cache first
    const cacheKey = `${pathname}-${route}`;
    const cached = cache.routeMatcher.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    // Check exact match first (faster)
    const isExactMatch = pathname === route;
    if (isExactMatch) {
      cache.routeMatcher.set(cacheKey, true);
      return true;
    }

    // Check prefix match
    const isPrefixMatch = pathname.startsWith(route + "/");
    cache.routeMatcher.set(cacheKey, isPrefixMatch);

    return isPrefixMatch;
  };
})();

/**
 * Memoized JSON parsing to avoid duplicate serialization
 * Uses a simple LRU cache to prevent repeated parsing of same data
 */
const memoizedJsonParse = (() => {
  const MAX_CACHE_SIZE = 50;

  return (jsonString: string, fallback?: unknown) => {
    // Check cache first
    if (cache.jsonParseCache.has(jsonString)) {
      return cache.jsonParseCache.get(jsonString);
    }

    // Parse and cache result
    try {
      const parsed = JSON.parse(jsonString);
      cache.jsonParseCache.set(jsonString, parsed);

      // Simple LRU eviction if cache is full
      if (cache.jsonParseCache.size > MAX_CACHE_SIZE) {
        const firstKey = cache.jsonParseCache.keys().next().value;
        if (firstKey !== undefined) {
          cache.jsonParseCache.delete(firstKey);
        }
      }

      return parsed;
    } catch {
      return fallback;
    }
  };
})();

// ============================================
// ROUTE CONFIGURATION
// ============================================

/**
 * Routes that require authentication
 * Users without auth cookies will be redirected to login
 */
const PROTECTED_ROUTES = [
  "/dashboard",
  "/profile",
  "/settings",
  "/auth/setup-2fa",
  "/catalog",
  "/publications",
  "/leads",
  "/appointments",
  "/admin",
  "/branch",
  "/manager",
];

/**
 * Routes that are public (accessible without auth)
 * Authenticated users may be redirected elsewhere
 */
const PUBLIC_ROUTES = [
  "/",
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-email",
];

/**
 * Routes that should always redirect to dashboard if authenticated
 */
const AUTH_REDIRECT_ROUTES = ["/auth/login", "/auth/register"];

// ============================================
// MIDDLEWARE
// ============================================

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Skip API routes and static files
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".") // static files with extensions
  ) {
    return NextResponse.next();
  }

  // 2. Check for auth cookies
  const accessToken = req.cookies.get("access_token")?.value;
  const userDataCookie = req.cookies.get("user_data")?.value;

  // 3. Parse user data from cookie with memoization
  //
  // The backend's user_data cookie carries `roles: string[]` (current
  // shape) — a bare `role: string` field never existed on the wire. The
  // `role` field below is kept only as a legacy fallback, mirroring the
  // same roles[0] ?? role adapter authStore.ts uses for the same cookie.
  type UserData = {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role?: string;
    roles?: string[];
    is_email_verified: boolean;
    is_2fa_enabled: boolean;
  };

  function deriveRole(data: UserData): string | null {
    if (Array.isArray(data.roles) && data.roles.length > 0) {
      return String(data.roles[0]);
    }
    return data.role ?? null;
  }

  // Runtime guard before trusting cookie-derived data — this value drives
  // the role-based route gating below. Not the real security boundary
  // (the backend re-checks every permission against the signed JWT in
  // access_token), but the cast must not be unconditional either.
  function isUserData(value: unknown): value is UserData {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  let userData: UserData | null = null;
  try {
    let raw = userDataCookie ?? "";
    // Strip outer double-quotes that Python's SimpleCookie adds when encoding cookie values.
    // The Edge Runtime URL-decodes the content but preserves the surrounding quotes.
    if (raw.startsWith('"') && raw.endsWith('"') && raw.length > 2) {
      raw = raw.slice(1, -1);
    }
    const decoded = raw ? decodeURIComponent(raw) : null;
    const parsed = decoded ? memoizedJsonParse(decoded) : null;
    userData = isUserData(parsed) ? parsed : null;
  } catch {
    userData = null;
  }

  // 4. Check if route requires authentication with optimized matching
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    matchRoute(pathname, route),
  );

  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    matchRoute(pathname, route),
  );

  // 5. Redirect unauthenticated users from protected routes
  // NOTE: Check userData (parsed) not userDataCookie (raw string) to validate JSON
  const isAuthenticated = !!accessToken && !!userData;
  if (isProtectedRoute && !isAuthenticated) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("redirect", pathname); // Save original destination
    return NextResponse.redirect(url);
  }

  // 6. Redirect authenticated users from login/register to dashboard
  if (
    isAuthenticated &&
    AUTH_REDIRECT_ROUTES.some((route) => pathname === route)
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // 7. Special case: /auth/setup-2fa requires auth AND 2FA enabled
  if (pathname === "/auth/setup-2fa") {
    if (!isAuthenticated) {
      const url = req.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
    // If user doesn't have 2FA enabled, allow access (they need to set it up)
    // If user already has 2FA enabled, redirect to dashboard
    if (userData?.is_2fa_enabled) {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // 8. Role-based route protection (Zero Trust on Edge)
  if (isAuthenticated && userData) {
    const role = deriveRole(userData);
    const isSuperAdmin = role === "super_admin";

    // Admin routes - admin/super_admin roles can access (both carry
    // DEALER_ADMIN_VIEW_ALL on the backend — see role.py ROLE_PERMISSIONS)
    if (pathname.startsWith("/admin") && role !== "admin" && !isSuperAdmin) {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    // Branch routes - only branch/super_admin role can access
    if (pathname.startsWith("/branch") && role !== "branch" && !isSuperAdmin) {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    // Manager routes - only manager/super_admin role can access
    if (
      pathname.startsWith("/manager") &&
      role !== "manager" &&
      !isSuperAdmin
    ) {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    // Seller routes - only seller role can access
    // Note: Sellers access /catalog, /leads directly (not under /seller route group)
    // Route groups are organizational, not URL-based
  }

  // 9. Proceed to the requested route
  return NextResponse.next();
}

// ============================================
// MATCHER CONFIGURATION
// ============================================

/**
 * Routes middleware should NOT run on
 *
 * - API routes
 * - _next static files
 * - Static files with extensions (.png, .jpg, etc.)
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|^.*[.].*$).*)",
  ],
};
