const { chromium } = require("@playwright/test");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  const pages = [
    { url: "http://localhost:3000/auth/login", name: "login" },
    { url: "http://localhost:3000/auth/register", name: "register" },
    {
      url: "http://localhost:3000/auth/forgot-password",
      name: "forgot-password",
    },
    { url: "http://localhost:3000/auth/verify-email", name: "verify-email" },
    {
      url: "http://localhost:3000/auth/reset-password",
      name: "reset-password",
    },
    { url: "http://localhost:3000/auth/setup-2fa", name: "setup-2fa" },
  ];

  for (const { url, name } of pages) {
    try {
      console.log(`📸 Capturing: ${name}...`);
      await page.goto(url, { waitUntil: "networkidle", timeout: 10000 });
      // Wait for CSS to load
      await page.waitForTimeout(2000);
      await page.screenshot({
        path: `../apps/web/screenshots/${name}.png`,
        fullPage: true,
      });
      console.log(`✅ Saved: screenshots/${name}.png`);
    } catch (error) {
      console.error(`❌ Error capturing ${name}:`, error.message);
    }
  }

  await browser.close();
  console.log("\n🎉 All screenshots complete!");
  console.log("📁 Location: apps/web/screenshots/");
})();
