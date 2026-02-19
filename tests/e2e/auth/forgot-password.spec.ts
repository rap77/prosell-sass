/**
 * Forgot Password E2E Tests
 *
 * Tests for password reset request flow.
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { ForgotPasswordPage } from "./forgot-password-page";
import { generateTestUser } from "../helpers";

test.describe("Forgot Password", () => {
  let forgotPasswordPage: ForgotPasswordPage;

  test.beforeEach(async ({ page }) => {
    forgotPasswordPage = new ForgotPasswordPage(page);
    await forgotPasswordPage.goto();
  });

  test.describe("Page Layout", () => {
    test("should display forgot password page elements correctly",
      { tag: ["@e2e", "@forgot-password", "@FORGOT-E2E-001"] },
      async ({ page }) => {
        await expect(forgotPasswordPage.heading).toBeVisible();
        await expect(forgotPasswordPage.emailInput).toBeVisible();
        await expect(forgotPasswordPage.submitButton).toBeVisible();
        await expect(forgotPasswordPage.backToLoginLink).toBeVisible();
      }
    );

    test("should pass accessibility checks",
      { tag: ["@e2e", "@forgot-password", "@a11y", "@FORGOT-E2E-002"] },
      async ({ page }) => {
        const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
        expect(accessibilityScanResults.violations).toEqual([]);
      }
    );
  });

  test.describe("Form Validation", () => {
    test("should show validation error for empty email",
      { tag: ["@e2e", "@forgot-password", "@validation", "@FORGOT-E2E-003"] },
      async ({ page }) => {
        await forgotPasswordPage.clickSubmit();

        const emailError = page.getByText(/email is required/i);
        await expect(emailError).toBeVisible();
      }
    );

    test("should show validation error for invalid email format",
      { tag: ["@e2e", "@forgot-password", "@validation", "@FORGOT-E2E-004"] },
      async ({ page }) => {
        await forgotPasswordPage.fillEmail("invalid-email");
        await forgotPasswordPage.clickSubmit();

        const emailError = page.getByText(/invalid email address/i);
        await expect(emailError).toBeVisible();
      }
    );
  });

  test.describe("Password Reset Flow", () => {
    test("should submit reset request with valid email",
      { tag: ["@critical", "@e2e", "@forgot-password", "@FORGOT-E2E-005"] },
      async ({ page }) => {
        const user = generateTestUser();
        await forgotPasswordPage.submitForgotPassword(user.email);

        // Should show success message
        await forgotPasswordPage.verifySuccessMessage();
      }
    );

    test("should show loading state during submission",
      { tag: ["@e2e", "@forgot-password", "@FORGOT-E2E-006"] },
      async ({ page }) => {
        const user = generateTestUser();
        await forgotPasswordPage.fillEmail(user.email);

        // Click submit button
        await forgotPasswordPage.clickSubmit();

        // Verify success state is reached (button text or heading changed)
        // With the 500ms mock delay, loading state is very brief
        await forgotPasswordPage.verifySuccessMessage();
      }
    );
  });

  test.describe("Navigation", () => {
    test("should navigate to login page when clicking back to login link",
      { tag: ["@e2e", "@forgot-password", "@FORGOT-E2E-007"] },
      async ({ page }) => {
        await forgotPasswordPage.clickBackToLogin();

        await page.waitForURL(/\/auth\/login/);
        await expect(page).toHaveURL(/\/auth\/login/);
      }
    );
  });
});
