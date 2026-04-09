import { test, expect } from "@playwright/test";

test.describe("UI/UX Validation", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test("should capture all auth pages for visual review", async ({ page }) => {
    // Login
    await page.goto("/auth/login");
    await page.waitForLoadState("load");
    await page.screenshot({
      path: "screenshots/auth/01-login.png",
      fullPage: true,
    });

    // Register
    await page.goto("/auth/register");
    await page.waitForLoadState("load");
    await page.screenshot({
      path: "screenshots/auth/02-register.png",
      fullPage: true,
    });

    // Forgot Password
    await page.goto("/auth/forgot-password");
    await page.waitForLoadState("load");
    await page.screenshot({
      path: "screenshots/auth/03-forgot-password.png",
      fullPage: true,
    });

    // Reset Password
    await page.goto("/auth/reset-password?token=test");
    await page.waitForLoadState("load");
    await page.screenshot({
      path: "screenshots/auth/04-reset-password.png",
      fullPage: true,
    });

    // Verify Email
    await page.goto("/auth/verify-email?token=test");
    await page.waitForLoadState("load");
    await page.screenshot({
      path: "screenshots/auth/05-verify-email.png",
      fullPage: true,
    });

    // Setup 2FA
    await page.goto("/auth/setup-2fa");
    await page.waitForLoadState("load");
    await page.screenshot({
      path: "screenshots/auth/06-setup-2fa.png",
      fullPage: true,
    });
  });
});
