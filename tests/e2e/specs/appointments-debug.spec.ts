/**
 * Debug test to see what URLs are being called
 */
import { test, expect } from "@playwright/test";

test("debug: check network requests", async ({ page }) => {
  // Log all network requests (not just API)
  page.on("request", (request) => {
    const url = request.url();
    console.log("ALL Request:", request.method(), url);
  });

  page.on("response", async (response) => {
    const url = response.url();
    const status = response.status();
    if (status >= 400 || url.includes("/api/")) {
      console.log("Response:", status, url);
    }
  });

  // Log console messages from the page
  page.on("console", (msg) => {
    console.log("Page console:", msg.type(), msg.text());
  });

  // Navigate to lead details page
  await page.goto("/vendedor/leads/lead-test-1");

  // Wait a bit for API calls to complete
  await page.waitForTimeout(5000);

  // Take a screenshot
  await page.screenshot({ path: "debug-screenshot.png", fullPage: true });

  // Get page content
  const content = await page.content();
  console.log("Page title:", await page.title());
  console.log("Page contains 'Error':", content.includes("Error"));
});
