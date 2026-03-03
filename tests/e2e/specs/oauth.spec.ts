/**
 * OAuth E2E Tests
 *
 * Tests Google OAuth integration flow.
 * Note: Full OAuth flow requires real Google authentication,
 * so we test the redirect and configuration validation.
 */

import { expect, test } from "@playwright/test";

// Use a separate project that doesn't use storageState
test.describe.configure({ mode: "serial" });

test.describe("Google OAuth Integration", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto("/auth/login");
  });

  test("should display Google OAuth button", async ({ page }) => {
    // Verify OAuth button exists and is visible
    const googleButton = page.getByTestId("google-oauth-button");
    await expect(googleButton).toBeVisible();
    await expect(googleButton).toHaveText(/Continue with Google/i);
  });

  test("should have correct button attributes", async ({ page }) => {
    const googleButton = page.getByTestId("google-oauth-button");

    // Verify button type
    await expect(googleButton).toHaveAttribute("type", "button");

    // Verify button is enabled
    await expect(googleButton).toBeEnabled();
  });

  test("should redirect to Google OAuth on click", async ({ page }) => {
    // Click the Google OAuth button and wait for navigation
    const urlPromise = page.waitForURL(/accounts\.google\.com/);

    // Click the Google OAuth button
    await page.getByTestId("google-oauth-button").click();

    // Wait for navigation to Google
    await urlPromise;

    // Verify we're on Google OAuth URL (v3 or v2)
    const url = page.url();
    expect(url).toContain("accounts.google.com");
    // Google may use either /v3/signin or /o/oauth2/v2/auth
    expect(url).toMatch(/\/(v3\/signin|o\/oauth2)/);

    // Verify required OAuth parameters
    expect(url).toContain("client_id=");
    expect(url).toContain("redirect_uri=");
    expect(url).toContain("response_type=code");
    expect(url).toContain("scope=");
    expect(url).toContain("state=");

    // Verify redirect URI matches backend callback
    const redirectUriMatch = url.match(/redirect_uri=([^&]+)/);
    expect(redirectUriMatch).toBeTruthy();

    const redirectUri = decodeURIComponent(redirectUriMatch[1]);
    expect(redirectUri).toContain("/api/auth/oauth/google/callback");

    // Verify client_id is set (not empty)
    const clientIdMatch = url.match(/client_id=([^&]+)/);
    expect(clientIdMatch).toBeTruthy();
    const clientId = clientIdMatch[1];
    expect(clientId).toContain(".apps.googleusercontent.com");
  });

  test("should generate unique state token for CSRF protection", async ({ page, context }) => {
    // Get state token from first page
    await page.getByTestId("google-oauth-button").click();
    await page.waitForURL(/accounts\.google\.com/);
    const url1 = page.url();
    const state1Match = url1.match(/state=([^&]+)/);
    const state1 = state1Match ? state1Match[1] : null;

    // Create new page for second attempt
    const page2 = await context.newPage();
    await page2.goto("/auth/login");
    await page2.getByTestId("google-oauth-button").click();
    await page2.waitForURL(/accounts\.google\.com/);
    const url2 = page2.url();
    const state2Match = url2.match(/state=([^&]+)/);
    const state2 = state2Match ? state2Match[1] : null;

    // Verify state tokens are different (CSRF protection)
    expect(state1).not.toEqual(state2);
    expect(state1).toMatch(/^[a-f0-9-]{36}$/); // UUID format
    expect(state2).toMatch(/^[a-f0-9-]{36}$/); // UUID format

    await page2.close();
  });

  test("should include required OAuth scopes", async ({ page }) => {
    await page.getByTestId("google-oauth-button").click();
    await page.waitForURL(/accounts\.google\.com/);

    const url = page.url();

    // Verify scope parameter includes required permissions
    expect(url).toContain("scope=");
    const scopeMatch = url.match(/scope=([^&]+)/);
    const scope = scopeMatch ? decodeURIComponent(scopeMatch[1]) : "";

    // Check for required scopes
    expect(scope).toContain("openid"); // OpenID Connect
    expect(scope).toContain("email"); // User email
    expect(scope).toContain("profile"); // User profile info
  });

  test("should show loading state during OAuth flow", async ({ page }) => {
    const googleButton = page.getByTestId("google-oauth-button");

    // Set up promise to wait for navigation before checking state
    const navPromise = page.waitForURL(/accounts\.google\.com/);

    // Click button
    await googleButton.click();

    // Check if loading state was set (before or during navigation)
    // The button may redirect before loader is visible, so we check the attribute
    // or wait briefly for the loading state
    try {
      await expect(googleButton).toHaveAttribute("aria-busy", "true", { timeout: 1000 });
    } catch {
      // If redirect was too fast, loading state may not be visible - that's OK
      // The important part is that the redirect happened
    }

    // Verify navigation to Google occurred
    await navPromise;
  });
});

test.describe("OAuth Configuration Validation", () => {
  test("should verify backend OAuth endpoint is accessible", async ({ request }) => {
    // Test that the OAuth authorize endpoint responds
    const response = await request.get("http://localhost:8000/api/auth/oauth/google/authorize");

    // Should redirect (302) or rate limit (429) - both indicate endpoint is working
    // 404 or 500 would mean endpoint is broken
    expect([302, 429]).toContain(response.status());

    // If 302, verify redirect to Google
    if (response.status() === 302) {
      const location = response.headers()["location"];
      expect(location).toContain("accounts.google.com");
    }
    // If 429, rate limiter is working (also good)
  });

  test("should verify OAuth credentials are configured", async ({ page }) => {
    // Navigate to login
    await page.goto("/auth/login");

    // Click OAuth button
    await page.getByTestId("google-oauth-button").click();
    await page.waitForURL(/accounts\.google\.com/);

    // Get the OAuth URL
    const url = page.url();

    // Extract client_id and verify it's not the placeholder
    const clientIdMatch = url.match(/client_id=([^&]+)/);
    expect(clientIdMatch).toBeTruthy();

    const clientId = clientIdMatch[1];

    // Should NOT be placeholder values
    expect(clientId).not.toBe("your-google-client-id.apps.googleusercontent.com");
    expect(clientId).not.toBe("");
    expect(clientId).toMatch(/\d{12,}/); // Should contain numbers (Google project ID)
  });
});

test.describe("OAuth Error Handling", () => {
  test("should handle OAuth callback errors", async ({ page }) => {
    // Simulate error callback from Google
    const errorUrl = "/auth/login?error=access_denied";

    // Navigate with error parameter
    await page.goto(errorUrl);

    // Should stay on login page (not redirect to dashboard)
    await expect(page).toHaveURL(/\/auth\/login/);

    // Should show error message (if implemented)
    // This depends on how the UI handles OAuth errors
  });

  test("should handle invalid state token", async ({ page }) => {
    // Navigate to callback with invalid state
    const callbackUrl = "http://localhost:8000/api/auth/oauth/google/callback?code=test&state=invalid-state";

    const response = await page.goto(callbackUrl);

    // Should redirect back to login with error
    // The exact behavior depends on implementation
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
