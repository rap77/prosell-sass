import { test } from "@playwright/test";

/**
 * Debug script to capture the loader state.
 * Run with: pnpm exec playwright test debug-loader.spec.ts --headed
 */
test("capture loader screenshots", async ({ page }) => {
  // Slow down to capture transitions
  await page.setViewportSize({ width: 1280, height: 720 });

  // Go to staging
  await page.goto("http://localhost:3000/auth/login");
  await page.screenshot({ path: "debug-01-login-page.png" });

  // Fill login form
  await page.fill('input[type="email"]', "prosellweb@gmail.com");
  await page.fill('input[type="password"]', "password");

  // Click login and capture rapidly
  await page.click('button[type="submit"]');

  // Capture every 100ms for 2 seconds
  for (let i = 0; i < 20; i++) {
    await page.screenshot({
      path: `debug-02-transition-${i.toString().padStart(2, "0")}.png`,
    });
    await page.waitForTimeout(100);
  }

  // Final state
  await page.screenshot({ path: "debug-03-final.png" });
});
