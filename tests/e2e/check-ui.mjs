import { chromium } from "playwright";

async function checkUI() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  try {
    console.log("🔍 Checking UI rendering...\n");

    // 1. Login
    console.log("1. Login Page...");
    await page.goto("http://localhost:3000/auth/login");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "screenshots/ui-check/01-login.png", fullPage: true });
    console.log("   ✅ Screenshot saved");

    // Check if CSS is loaded
    const bgColor = await page.evaluate(() => {
      const body = document.body;
      return window.getComputedStyle(body).backgroundColor;
    });
    console.log("   Background color:", bgColor);

    // 2. Register
    console.log("2. Register Page...");
    await page.goto("http://localhost:3000/auth/register");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "screenshots/ui-check/02-register.png", fullPage: true });
    console.log("   ✅ Screenshot saved");

    // 3. Forgot Password
    console.log("3. Forgot Password Page...");
    await page.goto("http://localhost:3000/auth/forgot-password");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "screenshots/ui-check/03-forgot-password.png", fullPage: true });
    console.log("   ✅ Screenshot saved");

    // 4. Reset Password
    console.log("4. Reset Password Page...");
    await page.goto("http://localhost:3000/auth/reset-password?token=test");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "screenshots/ui-check/04-reset-password.png", fullPage: true });
    console.log("   ✅ Screenshot saved");

    // 5. Verify Email
    console.log("5. Verify Email Page...");
    await page.goto("http://localhost:3000/auth/verify-email?token=test");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "screenshots/ui-check/05-verify-email.png", fullPage: true });
    console.log("   ✅ Screenshot saved");

    // Check for common UI issues
    console.log("\n🔎 Checking for UI issues...");

    // Check if Tailwind CSS is loaded
    const tailwindLoaded = await page.evaluate(() => {
      const testDiv = document.createElement("div");
      testDiv.className = "bg-red-500 text-white p-4";
      document.body.appendChild(testDiv);
      const styles = window.getComputedStyle(testDiv);
      const hasBgColor = styles.backgroundColor !== "rgba(0, 0, 0, 0)";
      document.body.removeChild(testDiv);
      return hasBgColor;
    });
    console.log("   Tailwind CSS loaded:", tailwindLoaded ? "✅" : "❌");

    // Check if forms are visible
    const formsCount = await page.locator("form").count();
    console.log("   Forms found:", formsCount);

    const inputsCount = await page.locator("input").count();
    console.log("   Inputs found:", inputsCount);

    const buttonsCount = await page.locator("button").count();
    console.log("   Buttons found:", buttonsCount);

    console.log("\n✅ Screenshots saved to: tests/e2e/screenshots/ui-check/");
    console.log("👀 Please review the screenshots to validate UI/UX");

  } finally {
    await browser.close();
  }
}

checkUI().catch(console.error);
