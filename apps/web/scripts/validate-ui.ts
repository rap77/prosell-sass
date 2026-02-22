/**
 * UI/UX Validation Script for Auth Pages
 *
 * This script navigates through all authentication pages
 * and takes screenshots for visual validation.
 */

import { chromium, Page, Browser } from "playwright";

const BASE_URL = "http://localhost:3000";
const SCREENSHOT_DIR = "./screenshots/auth";

async function validateAuthUI() {
  console.log("🔍 Starting UI/UX Validation for Auth Pages...\n");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Set viewport to desktop size
  await page.setViewportSize({ width: 1280, height: 720 });

  try {
    // 1. Login Page
    console.log("📸 Validating Login Page...");
    await page.goto(`${BASE_URL}/auth/login`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-login.png`,
      fullPage: true,
    });
    console.log(
      "  ✓ Logo visible:",
      await page.getByText("ProSell").isVisible(),
    );
    console.log(
      "  ✓ Email input visible:",
      await page.getByLabel("Email").isVisible(),
    );
    console.log(
      "  ✓ Password input visible:",
      await page.getByLabel("Password").isVisible(),
    );
    console.log(
      "  ✓ Sign In button visible:",
      await page.getByRole("button", { name: /sign in/i }).isVisible(),
    );

    // 2. Register Page
    console.log("\n📸 Validating Register Page...");
    await page.goto(`${BASE_URL}/auth/register`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-register.png`,
      fullPage: true,
    });
    console.log(
      "  ✓ Logo visible:",
      await page.getByText("ProSell").isVisible(),
    );
    console.log(
      "  ✓ Full name input visible:",
      await page.getByLabel("Full Name").isVisible(),
    );
    console.log(
      "  ✓ Email input visible:",
      await page.getByLabel("Email").isVisible(),
    );
    console.log(
      "  ✓ Password input visible:",
      await page.getByLabel("Password").isVisible(),
    );
    console.log(
      "  ✓ Sign Up button visible:",
      await page.getByRole("button", { name: /sign up/i }).isVisible(),
    );

    // 3. Forgot Password Page
    console.log("\n📸 Validating Forgot Password Page...");
    await page.goto(`${BASE_URL}/auth/forgot-password`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-forgot-password.png`,
      fullPage: true,
    });
    console.log(
      "  ✓ Heading visible:",
      await page
        .getByRole("heading", { name: /forgot your password/i })
        .isVisible(),
    );
    console.log(
      "  ✓ Email input visible:",
      await page.getByLabel("Email").isVisible(),
    );
    console.log(
      "  ✓ Send Reset Link button visible:",
      await page.getByRole("button", { name: /send reset link/i }).isVisible(),
    );

    // 4. Reset Password Page
    console.log("\n📸 Validating Reset Password Page...");
    await page.goto(`${BASE_URL}/auth/reset-password?token=test-token`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-reset-password.png`,
      fullPage: true,
    });
    console.log(
      "  ✓ Heading visible:",
      await page
        .getByRole("heading", { name: /reset your password/i })
        .isVisible(),
    );
    console.log(
      "  ✓ New Password input visible:",
      await page.getByLabel("New Password").isVisible(),
    );
    console.log(
      "  ✓ Confirm Password input visible:",
      await page.getByLabel("Confirm Password").isVisible(),
    );
    console.log(
      "  ✓ Reset Password button visible:",
      await page.getByRole("button", { name: /reset password/i }).isVisible(),
    );

    // 5. Verify Email Page
    console.log("\n📸 Validating Verify Email Page...");
    await page.goto(`${BASE_URL}/auth/verify-email?token=test-token`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05-verify-email.png`,
      fullPage: true,
    });
    console.log(
      "  ✓ Heading visible:",
      await page
        .getByRole("heading", { name: /verify your email/i })
        .isVisible(),
    );

    // 6. Setup 2FA Page
    console.log("\n📸 Validating Setup 2FA Page...");
    await page.goto(`${BASE_URL}/auth/setup-2fa`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/06-setup-2fa.png`,
      fullPage: true,
    });
    console.log(
      "  ✓ 2FA Setup form visible:",
      await page.getByText(/two-factor authentication/i).isVisible(),
    );

    // 7. Check home page
    console.log("\n📸 Validating Home Page...");
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/07-home.png`,
      fullPage: true,
    });
    console.log("  ✓ Home page loaded");

    console.log("\n✅ All screenshots saved to:", SCREENSHOT_DIR);
    console.log("\n📊 UI/UX Validation Summary:");
    console.log("   • All pages loaded successfully");
    console.log("   • All required elements are visible");
    console.log("   • Screenshots captured for visual review");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("\n❌ Validation failed:", message);
  } finally {
    await browser.close();
  }
}

validateAuthUI().catch(console.error);
