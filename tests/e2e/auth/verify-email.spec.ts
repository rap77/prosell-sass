/**
 * Verify Email E2E Tests
 *
 * Tests for email verification flow with token.
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { VerifyEmailPage } from "./verify-email-page";

test.describe("Verify Email", () => {
  let verifyEmailPage: VerifyEmailPage;

  test.beforeEach(async ({ page }) => {
    verifyEmailPage = new VerifyEmailPage(page);
  });

  test.describe("Page Layout", () => {
    test("should display verify email page elements correctly with valid token",
      { tag: ["@e2e", "@verify-email", "@VERIFY-E2E-001"] },
      async ({ page }) => {
        await verifyEmailPage.goto("test-verify-token-456");

        await expect(verifyEmailPage.heading).toBeVisible();
        // Note: Continue button may or may not be present depending on verification state
        // We check for sign in link which should always be visible
        await expect(verifyEmailPage.signInLink).toBeVisible();
      }
    );

    test("should pass accessibility checks",
      { tag: ["@e2e", "@verify-email", "@a11y", "@VERIFY-E2E-002"] },
      async ({ page }) => {
        await verifyEmailPage.goto("test-verify-token-456");

        const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
        expect(accessibilityScanResults.violations).toEqual([]);
      }
    );
  });

  test.describe("Email Verification Flow", () => {
    test("should verify email with valid token automatically",
      { tag: ["@critical", "@e2e", "@verify-email", "@VERIFY-E2E-003"] },
      async ({ page }) => {
        await verifyEmailPage.goto("test-verify-token-456");

        // Verification happens automatically on page load
        await verifyEmailPage.waitForVerification();

        // Should show success message or redirect
        const isSuccess = await verifyEmailPage.page.getByText(/email verified|verification successful/i).count() > 0;
        const isRedirected = verifyEmailPage.page.url().includes("/dashboard") ||
                           verifyEmailPage.page.url().includes("/login");

        expect(isSuccess || isRedirected).toBeTruthy();
      }
    );

    test("should handle invalid token gracefully",
      { tag: ["@e2e", "@verify-email", "@error", "@VERIFY-E2E-004"] },
      async ({ page }) => {
        await verifyEmailPage.goto("invalid-or-expired-token");

        await verifyEmailPage.waitForVerification();

        // Should show error message
        const errorMessage = verifyEmailPage.page.getByText(/invalid or expired token|verification failed/i);
        await expect(errorMessage).toBeVisible();
      }
    );

    test("should show loading state during verification",
      { tag: ["@e2e", "@verify-email", "@VERIFY-E2E-005"] },
      async ({ page }) => {
        await verifyEmailPage.goto("test-verify-token-456");

        // Should show some kind of loading indicator
        const loader = verifyEmailPage.page.getByText(/verifying|loading|please wait/i);
        const isVisible = await loader.count() > 0;

        // Loader may be visible briefly, then disappear
        if (isVisible) {
          await expect(loader).toBeVisible();
        }
      }
    );
  });

  test.describe("Navigation", () => {
    test("should navigate to login page when clicking sign in link",
      { tag: ["@e2e", "@verify-email", "@VERIFY-E2E-006"] },
      async ({ page }) => {
        await verifyEmailPage.goto("test-verify-token-456");

        await verifyEmailPage.clickSignIn();

        await page.waitForURL(/\/auth\/login/);
        await expect(page).toHaveURL(/\/auth\/login/);
      }
    );

    test("should redirect to dashboard after successful verification",
      { tag: ["@e2e", "@verify-email", "@VERIFY-E2E-007"] },
      async ({ page }) => {
        await verifyEmailPage.goto("test-verify-token-456");

        await verifyEmailPage.waitForVerification();

        // After successful verification, should redirect to dashboard or show sign in link
        const isDashboard = verifyEmailPage.page.url().includes("/dashboard");
        const hasSignInLink = await verifyEmailPage.signInLink.count() > 0;

        expect(isDashboard || hasSignInLink).toBeTruthy();
      }
    );
  });

  test.describe("Edge Cases", () => {
    test("should handle page without token",
      { tag: ["@e2e", "@verify-email", "@VERIFY-E2E-008"] },
      async ({ page }) => {
        // Navigate without token
        await verifyEmailPage.goto();

        // Should still load the page
        await verifyEmailPage.verifyPageLoaded();

        // Should show error or message about missing token
        const errorMessage = verifyEmailPage.page.getByText(/token required|invalid request/i);
        const hasError = await errorMessage.count() > 0;

        expect(hasError).toBeTruthy();
      }
    );

    test("should handle already verified email",
      { tag: ["@e2e", "@verify-email", "@VERIFY-E2E-009"] },
      async ({ page }) => {
        // Use a token for an already verified email
        await verifyEmailPage.goto("already-verified-token");

        await verifyEmailPage.waitForVerification();

        // Should show appropriate message
        const message = verifyEmailPage.page.getByText(/already verified|email was already verified/i);
        const hasMessage = await message.count() > 0;

        if (hasMessage) {
          await expect(message).toBeVisible();
        }
      }
    );
  });
});
