/**
 * OAuth Mock Utilities for E2E Testing
 *
 * This module provides mock OAuth functionality that simulates the OAuth flow
 * without requiring real Google/Facebook credentials. It validates:
 * - CSRF protection via state tokens
 * - OAuth scope validation
 * - Loading states
 * - Error handling
 *
 * SECURITY: These mocks ensure security tests can run without exposing real credentials.
 */

import { Page } from "@playwright/test";

/**
 * Mock OAuth configuration for testing
 */
export const MOCK_OAUTH_CONFIG = {
  google: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    mockClientId: "test-google-client-id.apps.googleusercontent.com",
    mockRedirectUri: "http://localhost:8000/api/auth/oauth/google/callback",
    requiredScopes: ["openid", "email", "profile"],
  },
  facebook: {
    authUrl: "https://www.facebook.com/v18.0/dialog/oauth",
    mockClientId: "test-facebook-app-id",
    mockRedirectUri: "http://localhost:8000/api/auth/oauth/facebook/callback",
    requiredScopes: ["email", "public_profile"],
  },
};

/**
 * Generate a mock state token (UUID format)
 */
export function generateMockStateToken(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Parse OAuth URL and extract parameters
 */
export function parseOAuthUrl(url: string): {
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
  responseType: string;
} {
  const params = new URLSearchParams(url.split("?")[1]);

  return {
    clientId: params.get("client_id") || "",
    redirectUri: params.get("redirect_uri") || "",
    scope: decodeURIComponent(params.get("scope") || ""),
    state: params.get("state") || "",
    responseType: params.get("response_type") || "",
  };
}

/**
 * Mock OAuth navigation interceptor
 *
 * Intercepts OAuth redirects and validates the OAuth URL parameters
 * without actually navigating to the OAuth provider.
 */
export async function interceptOAuthNavigation(
  page: Page,
  provider: "google" | "facebook",
): Promise<{
  url: string;
  params: ReturnType<typeof parseOAuthUrl>;
}> {
  const urlPromise = page.waitForURL(
    (url) =>
      url.href.includes("accounts.google.com") ||
      url.href.includes("facebook.com"),
  );

  // Trigger OAuth flow
  await page.getByTestId(`${provider}-oauth-button`).click();

  // Wait for URL change
  const url = await urlPromise;
  const params = parseOAuthUrl(url.href());

  return { url: url.href(), params };
}

/**
 * Validate state token format (UUID)
 */
export function isValidStateToken(state: string): boolean {
  const uuidRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
  return uuidRegex.test(state);
}

/**
 * Validate OAuth scopes
 */
export function validateRequiredScopes(
  actualScopes: string,
  requiredScopes: string[],
): boolean {
  const actualScopeList = actualScopes.split(" ").filter(Boolean);
  return requiredScopes.every((scope) => actualScopeList.includes(scope));
}

/**
 * Setup mock OAuth route handler
 *
 * This intercepts the OAuth authorize endpoint and returns a mock authorization URL
 * instead of redirecting to the real OAuth provider.
 */
export function setupMockOAuthRoute(page: Page, provider: "google" | "facebook"): void {
  const config = MOCK_OAUTH_CONFIG[provider];

  // Intercept the backend OAuth authorize endpoint
  page.route(`**/api/auth/oauth/${provider}/authorize`, async (route) => {
    const state = generateMockStateToken();
    const scopes = config.requiredScopes.join(" ");

    // Build mock OAuth URL
    const mockUrl = new URL(config.authUrl);
    mockUrl.searchParams.set("client_id", config.mockClientId);
    mockUrl.searchParams.set("redirect_uri", config.mockRedirectUri);
    mockUrl.searchParams.set("response_type", "code");
    mockUrl.searchParams.set("scope", scopes);
    mockUrl.searchParams.set("state", state);

    // Redirect to mock OAuth URL
    route.fulfill({
      status: 302,
      headers: {
        Location: mockUrl.toString(),
      },
    });
  });
}
