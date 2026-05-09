/**
 * Authentication helper for E2E tests.
 *
 * Provides utilities to authenticate with the real API and manage cookies.
 */

import type { APIRequestContext, Page } from "@playwright/test";

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * Login as admin user and retrieve auth tokens.
 *
 * Uses the real /api/v1/auth/login endpoint.
 *
 * @param request - Playwright APIRequestContext for making HTTP requests
 * @returns Promise<AuthTokens> - Access and refresh tokens
 *
 * @example
 * ```typescript
 * const tokens = await loginAsAdmin(request);
 * console.log('Access token:', tokens.accessToken);
 * ```
 */
export async function loginAsAdmin(
  request: APIRequestContext,
): Promise<AuthTokens> {
  const baseUrl = process.env.API_BASE_URL || "http://localhost:8000";
  const loginUrl = `${baseUrl}/api/v1/auth/login`;

  // Admin credentials from environment or defaults
  const email = process.env.TEST_ADMIN_EMAIL || "admin@prosell.saas";
  const password = process.env.TEST_ADMIN_PASSWORD || "Admin123!";

  const response = await request.post(loginUrl, {
    data: {
      email,
      password,
    },
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok()) {
    const errorText = await response.text();
    throw new Error(
      `Login failed with status ${response.status()}: ${errorText}`,
    );
  }

  const data = (await response.json()) as LoginResponse;

  // Calculate expiration time
  const expiresAt = Date.now() + data.expires_in * 1000;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt,
  };
}

/**
 * Apply auth cookies to a Playwright page context.
 *
 * Sets httpOnly cookies for access_token and refresh_token.
 * Cookies are configured for localhost (adjust for production).
 *
 * @param page - Playwright Page instance
 * @param tokens - AuthTokens from loginAsAdmin()
 * @returns Promise<void>
 *
 * @example
 * ```typescript
 * const tokens = await loginAsAdmin(request);
 * await applyAuthCookies(page, tokens);
 * await page.goto('/dashboard'); // Now authenticated
 * ```
 */
export async function applyAuthCookies(
  page: Page,
  tokens: AuthTokens,
): Promise<void> {
  const baseUrl = process.env.WEB_BASE_URL || "http://localhost:3000";
  const url = new URL(baseUrl);

  // Calculate cookie expiration (in seconds)
  const expiresInSeconds = Math.floor((tokens.expiresAt - Date.now()) / 1000);

  // Set access_token cookie (httpOnly)
  await page.context().addCookies([
    {
      name: "access_token",
      value: tokens.accessToken,
      domain: url.hostname,
      path: "/",
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      sameSite: "Lax" as const,
      expires: expiresInSeconds > 0 ? expiresInSeconds : undefined,
    },
    {
      name: "refresh_token",
      value: tokens.refreshToken,
      domain: url.hostname,
      path: "/",
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      sameSite: "Lax" as const,
      expires: expiresInSeconds * 2 > 0 ? expiresInSeconds * 2 : undefined, // Refresh tokens live longer
    },
  ]);
}

/**
 * Login and apply auth cookies in one step.
 *
 * Convenience function that combines loginAsAdmin and applyAuthCookies.
 *
 * @param page - Playwright Page instance
 * @param request - Playwright APIRequestContext for making HTTP requests
 * @returns Promise<AuthTokens> - The tokens that were applied
 *
 * @example
 * ```typescript
 * await authenticateAsAdmin(page, request);
 * await page.goto('/dashboard'); // Fully authenticated session
 * ```
 */
export async function authenticateAsAdmin(
  page: Page,
  request: APIRequestContext,
): Promise<AuthTokens> {
  const tokens = await loginAsAdmin(request);
  await applyAuthCookies(page, tokens);
  return tokens;
}

/**
 * Clear auth cookies from a page context.
 *
 * Useful for testing logout or starting fresh.
 *
 * @param page - Playwright Page instance
 * @returns Promise<void>
 *
 * @example
 * ```typescript
 * await clearAuthCookies(page);
 * await page.goto('/auth/login'); // Should show login page
 * ```
 */
export async function clearAuthCookies(page: Page): Promise<void> {
  const baseUrl = process.env.WEB_BASE_URL || "http://localhost:3000";
  const url = new URL(baseUrl);

  await page.context().addCookies([
    {
      name: "access_token",
      value: "",
      domain: url.hostname,
      path: "/",
      expires: 0,
    },
    {
      name: "refresh_token",
      value: "",
      domain: url.hostname,
      path: "/",
      expires: 0,
    },
  ]);
}
