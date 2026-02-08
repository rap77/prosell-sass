/**
 * Cookie Utilities
 *
 * Helper functions for managing HTTP-only cookies in Next.js.
 * These cookies are used by middleware for server-side auth checks.
 *
 * @example
 * ```ts
 * import { setCookie, getCookie, deleteCookie } from '@/lib/auth/cookies';
 *
 * // Set an HTTP-only cookie
 * await setCookie('token', 'abc123', { maxAge: 60 * 60 * 24 * 7 });
 *
 * // Get cookie value
 * const token = await getCookie('token');
 *
 * // Delete cookie
 * await deleteCookie('token');
 * ```
 */

import { cookies } from "next/headers";

// ============================================
// TYPES
// ============================================

export interface CookieOptions {
  maxAge?: number; // in seconds
  expires?: Date;
  path?: string;
  domain?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "strict" | "lax" | "none";
}

// ============================================
// COOKIE FUNCTIONS
// ============================================

/**
 * Set a cookie with the given name, value, and options
 */
export async function setCookie(
  name: string,
  value: string,
  options: CookieOptions = {}
): Promise<void> {
  try {
    const cookieStore = await cookies();

    const {
      maxAge = 60 * 60 * 24 * 7, // 7 days default
      path = "/",
      httpOnly = true,
      secure = process.env.NODE_ENV === "production",
      sameSite = "lax",
      ...rest
    } = options;

    cookieStore.set(name, value, {
      maxAge,
      path,
      httpOnly,
      secure,
      sameSite,
      ...rest,
    });
  } catch (error) {
    // Silently fail if not in a request context (e.g., tests)
    // This is expected in client-side code or test environments
    if (error instanceof Error && process.env.NODE_ENV === 'development') {
      console.debug('Cookie set failed:', error.message);
    }
  }
}

/**
 * Get a cookie value by name
 */
export async function getCookie(name: string): Promise<string | undefined> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(name)?.value;
  } catch (error) {
    // Return undefined if not in a request context
    if (error instanceof Error && process.env.NODE_ENV === 'development') {
      console.debug('Cookie get failed:', error.message);
    }
    return undefined;
  }
}

/**
 * Delete a cookie by name
 */
export async function deleteCookie(name: string): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(name);
  } catch (error) {
    // Silently fail if not in a request context
    if (error instanceof Error && process.env.NODE_ENV === 'development') {
      console.debug('Cookie delete failed:', error.message);
    }
  }
}

/**
 * Check if a cookie exists
 */
export async function hasCookie(name: string): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(name) !== undefined;
  } catch (error) {
    // Return false if not in a request context
    if (error instanceof Error && process.env.NODE_ENV === 'development') {
      console.debug('Cookie has check failed:', error.message);
    }
    return false;
  }
}

// ============================================
// AUTH-SPECIFIC COOKIES
// ============================================

/**
 * Cookie names used in the app
 */
export const AUTH_COOKIES = {
  ACCESS_TOKEN: "access_token",
  REFRESH_TOKEN: "refresh_token",
  USER_DATA: "user_data", // JSON string with user info
} as const;

/**
 * Set auth cookies (access token, refresh token, user data)
 */
export async function setAuthCookies(params: {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    is_email_verified: boolean;
    is_2fa_enabled: boolean;
  };
}): Promise<void> {
  const { accessToken, refreshToken, user } = params;

  // Set access token cookie
  await setCookie(AUTH_COOKIES.ACCESS_TOKEN, accessToken, {
    maxAge: 60 * 15, // 15 minutes
    httpOnly: true,
  });

  // Set refresh token cookie (longer lived)
  await setCookie(AUTH_COOKIES.REFRESH_TOKEN, refreshToken, {
    maxAge: 60 * 60 * 24 * 7, // 7 days
    httpOnly: true,
  });

  // Set user data cookie (non-httpOnly for client access)
  await setCookie(AUTH_COOKIES.USER_DATA, JSON.stringify(user), {
    maxAge: 60 * 60 * 24 * 7, // 7 days
    httpOnly: false, // Client needs to read this
  });
}

/**
 * Get all auth cookies
 */
export async function getAuthCookies(): Promise<{
  accessToken?: string;
  refreshToken?: string;
  userData?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    is_email_verified: boolean;
    is_2fa_enabled: boolean;
  };
}> {
  const accessToken = await getCookie(AUTH_COOKIES.ACCESS_TOKEN);
  const refreshToken = await getCookie(AUTH_COOKIES.REFRESH_TOKEN);
  const userDataStr = await getCookie(AUTH_COOKIES.USER_DATA);

  let userData;
  try {
    userData = userDataStr ? JSON.parse(userDataStr) : undefined;
  } catch {
    userData = undefined;
  }

  return { accessToken, refreshToken, userData };
}

/**
 * Delete all auth cookies
 */
export async function deleteAuthCookies(): Promise<void> {
  await deleteCookie(AUTH_COOKIES.ACCESS_TOKEN);
  await deleteCookie(AUTH_COOKIES.REFRESH_TOKEN);
  await deleteCookie(AUTH_COOKIES.USER_DATA);
}
