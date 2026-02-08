/**
 * Login E2E Tests
 *
 * Tests for user login flow including form validation,
 * authentication, and error handling.
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { LoginPage } from "./login-page";
import { getExistingUser, generateTestUser } from "../helpers";

test.describe("Login", () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test.describe("Page Layout", () => {
    test("should display login page elements correctly",
      { tag: ["@e2e", "@login", "@LOGIN-E2E-001"] },
      async ({ page }) => {
        await expect(loginPage.heading).toBeVisible();
        await expect(loginPage.emailInput).toBeVisible();
        await expect(loginPage.passwordInput).toBeVisible();
        await expect(loginPage.submitButton).toBeVisible();
        await expect(loginPage.googleButton).toBeVisible();
        await expect(loginPage.githubButton).toBeVisible();
      }
    );

    test("should pass accessibility checks",
      { tag: ["@e2e", "@login", "@a11y", "@LOGIN-E2E-002"] },
      async ({ page }) => {
        const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
        expect(accessibilityScanResults.violations).toEqual([]);
      }
    );

    test("should have navigation links",
      { tag: ["@e2e", "@login", "@LOGIN-E2E-003"] },
      async ({ page }) => {
        await expect(loginPage.forgotPasswordLink).toBeVisible();
        await expect(loginPage.registerLink).toBeVisible();
      }
    );
  });

  test.describe("Form Validation", () => {
    test("should show validation error for empty email",
      { tag: ["@e2e", "@login", "@validation", "@LOGIN-E2E-004"] },
      async ({ page }) => {
        await loginPage.fillPassword("password123");
        await loginPage.clickSubmit();

        // Email required validation
        const emailError = page.getByText(/email is required/i);
        await expect(emailError).toBeVisible();
      }
    );

    test("should show validation error for invalid email format",
      { tag: ["@e2e", "@login", "@validation", "@LOGIN-E2E-005"] },
      async ({ page }) => {
        await loginPage.fillEmail("invalid-email");
        await loginPage.fillPassword("password123");
        await loginPage.clickSubmit();

        const emailError = page.getByText(/invalid email address/i);
        await expect(emailError).toBeVisible();
      }
    );

    test("should show validation error for short password",
      { tag: ["@e2e", "@login", "@validation", "@LOGIN-E2E-006"] },
      async ({ page }) => {
        await loginPage.fillEmail("test@example.com");
        await loginPage.fillPassword("short");
        await loginPage.clickSubmit();

        const passwordError = page.getByText(/password must be at least 8 characters/i);
        await expect(passwordError).toBeVisible();
      }
    );
  });

  test.describe("Authentication Flow", () => {
    test("should login successfully with valid credentials",
      { tag: ["@critical", "@e2e", "@login", "@LOGIN-E2E-007"] },
      async ({ page }) => {
        const user = getExistingUser();
        await loginPage.login(user);

        // Should redirect to dashboard after successful login
        await page.waitForURL(/\/dashboard/);
        await expect(page).toHaveURL(/\/dashboard/);
      }
    );

    test("should show error for invalid credentials",
      { tag: ["@e2e", "@login", "@LOGIN-E2E-008"] },
      async ({ page }) => {
        const invalidUser = generateTestUser();
        await loginPage.login(invalidUser);

        // Should show error message
        await loginPage.verifyErrorMessage(/invalid credentials/i);
      }
    );

    test("should show loading state during login",
      { tag: ["@e2e", "@login", "@LOGIN-E2E-009"] },
      async ({ page }) => {
        const user = getExistingUser();

        // Click submit and check button is disabled
        await loginPage.fillEmail(user.email);
        await loginPage.fillPassword(user.password);

        const submitButton = loginPage.submitButton;
        await submitButton.click();

        // Button should be disabled during loading
        await expect(submitButton).toBeDisabled();
      }
    );
  });

  test.describe("Navigation", () => {
    test("should navigate to forgot password page",
      { tag: ["@e2e", "@login", "@LOGIN-E2E-010"] },
      async ({ page }) => {
        await loginPage.clickForgotPassword();

        await page.waitForURL(/\/forgot-password/);
        await expect(page).toHaveURL(/\/forgot-password/);
      }
    );

    test("should navigate to register page",
      { tag: ["@e2e", "@login", "@LOGIN-E2E-011"] },
      async ({ page }) => {
        await loginPage.clickSignUp();

        await page.waitForURL(/\/auth\/register/);
        await expect(page).toHaveURL(/\/auth\/register/);
      }
    );

    test("should navigate to home page via logo",
      { tag: ["@e2e", "@login", "@LOGIN-E2E-012"] },
      async ({ page }) => {
        const logo = page.getByRole("link", { name: /prosell/i });
        await logo.click();

        await page.waitForURL(/\//);
        await expect(page).toHaveURL(/\//);
      }
    );
  });
});
