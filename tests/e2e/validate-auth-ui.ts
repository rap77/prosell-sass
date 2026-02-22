import { chromium } from "playwright";

const BASE_URL = "http://localhost:3000";
const SCREENSHOT_DIR = "./screenshots/auth";

async function validateAuthUI() {
  console.log("🔍 UI/UX Validation for Auth Pages\n");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 720 });

  try {
    // 1. Login
    console.log("📸 Login...");
    await page.goto(`${BASE_URL}/auth/login`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-login.png`,
      fullPage: true,
    });

    // 2. Register
    console.log("📸 Register...");
    await page.goto(`${BASE_URL}/auth/register`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-register.png`,
      fullPage: true,
    });

    // 3. Forgot Password
    console.log("📸 Forgot Password...");
    await page.goto(`${BASE_URL}/auth/forgot-password`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-forgot-password.png`,
      fullPage: true,
    });

    // 4. Reset Password
    console.log("📸 Reset Password...");
    await page.goto(`${BASE_URL}/auth/reset-password?token=test`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-reset-password.png`,
      fullPage: true,
    });

    // 5. Verify Email
    console.log("📸 Verify Email...");
    await page.goto(`${BASE_URL}/auth/verify-email?token=test`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05-verify-email.png`,
      fullPage: true,
    });

    // 6. Setup 2FA
    console.log("📸 Setup 2FA...");
    await page.goto(`${BASE_URL}/auth/setup-2fa`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/06-setup-2fa.png`,
      fullPage: true,
    });

    console.log("\n✅ Screenshots saved to:", SCREENSHOT_DIR);
  } finally {
    await browser.close();
  }
}

validateAuthUI();
