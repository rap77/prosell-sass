/**
 * Reset Password E2E Tests
 *
 * Tests for password reset flow with token.
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { ResetPasswordPage } from "./reset-password-page";
import { generateTestPassword } from "../helpers";

test.describe("Reset Password", () => {
  let resetPasswordPage: ResetPasswordPage;

  test.beforeEach(async ({ page }) => {
    resetPasswordPage = new ResetPasswordPage(page);
    // Use a mock token for testing
    await resetPasswordPage.goto("test-reset-token-123");
  });

  test.describe("Page Layout", () => {
    test("should display reset password page elements correctly",
      { tag: ["@e2e", "@reset-password", "@RESET-E2E-001"] },
      async ({ page }) => {
        await expect(resetPasswordPage.heading).toBeVisible();
        await expect(resetPasswordPage.newPasswordInput).toBeVisible();
        await expect(resetPasswordPage.confirmPasswordInput).toBeVisible();
        await expect(resetPasswordPage.submitButton).toBeVisible();
        await expect(resetPasswordPage.signInLink).toBeVisible();
      }
    );

    test("should pass accessibility checks",
      { tag: ["@e2e", "@reset-password", "@a11y", "@RESET-E2E-002"] },
      async ({ page }) => {
        const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
        expect(accessibilityScanResults.violations).toEqual([]);
      }
    );
  });

  test.describe("Form Validation", () => {
    test("should show validation error for short password",
      { tag: ["@e2e", "@reset-password", "@validation", "@RESET-E2E-003"] },
      async ({ page }) => {
        await resetPasswordPage.fillPasswords("short");

        const passwordError = page.getByText(/password must be at least 8 characters/i);
        await expect(passwordError).toBeVisible();
      }
    );

    test("should show validation error for mismatched passwords",
      { tag: ["@e2e", "@reset-password", "@validation", "@RESET-E2E-004"] },
      async ({ page }) => {
        await resetPasswordPage.fillNewPassword("password123");
        await resetPasswordPage.fillConfirmPassword("different123");
        await resetPasswordPage.clickSubmit();

        const mismatchError = page.getByText(/passwords do not match/i);
        await expect(mismatchError).toBeVisible();
      }
    );

    test("should show validation error for empty confirm password",
      { tag: ["@e2e", "@reset-password", "@validation", "@RESET-E2E-005"] },
      async ({ page }) => {
        await resetPasswordPage.fillNewPassword("password123");
        await resetPasswordPage.clickSubmit();

        const confirmPasswordError = page.getByText(/confirm password is required/i);
        await expect(confirmPasswordError).toBeVisible();
      }
    );
  });

  test.describe("Password Reset Flow", () => {
    test("should submit password reset with valid data",
      { tag: ["@critical", "@e2e", "@reset-password", "@RESET-E2E-006"] },
      async ({ page }) => {
        const newPassword = generateTestPassword();
        await resetPasswordPage.submitResetPassword(newPassword);

        // Should show success message
        await resetPasswordPage.verifySuccessMessage();
      }
    );

    test("should show loading state during submission",
      { tag: ["@e2e", "@reset-password", "@RESET-E2E-007"] },
      async ({ page }) => {
        const newPassword = generateTestPassword();
        await resetPasswordPage.fillPasswords(newPassword);
        await resetPasswordPage.clickSubmit();

        // Check for loading state
        await expect(resetPasswordPage.submitButton).toBeDisabled();
      }
    );

    test("should handle invalid token gracefully",
      { tag: ["@e2e", "@reset-password", "@error", "@RESET-E2E-008"] },
      async ({ page }) => {
        // Navigate with invalid token
        await resetPasswordPage.goto("invalid-token");

        const newPassword = generateTestPassword();
        await resetPasswordPage.submitResetPassword(newPassword);

        // Should show error message
        await resetPasswordPage.verifyErrorMessage(/invalid or expired token/i);
      }
    );
  });

  test.describe("Navigation", () => {
    test("should navigate to login page when clicking sign in link",
      { tag: ["@e2e", "@reset-password", "@RESET-E2E-009"] },
      async ({ page }) => {
        await resetPasswordPage.clickSignIn();

        await page.waitForURL(/\/auth\/login/);
        await expect(page).toHaveURL(/\/auth\/login/);
      }
    );

    test("should navigate to login after successful reset",
      { tag: ["@e2e", "@reset-password", "@RESET-E2E-010"] },
      async ({ page }) => {
        const newPassword = generateTestPassword();
        await resetPasswordPage.submitResetPassword(newPassword);

        // After success, should show login link
        await expect(resetPasswordPage.signInLink).toBeVisible();
      }
    );
  });

  test.describe("Edge Cases", () => {
    test("should handle page without token",
      { tag: ["@e2e", "@reset-password", "@RESET-E2E-011"] },
      async ({ page }) => {
        // Navigate without token
        await resetPasswordPage.goto();

        // Should still load the page
        await resetPasswordPage.verifyPageLoaded();
      }
    );
  });
});
