/**
 * Generate valid API auth storage state for E2E tests
 *
 * This script logs in via the API and saves valid auth cookies
 */

import { chromium } from "playwright";
import fs from "fs";
import path from "path";

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("Logging in via API...");
  const response = await page.request.post(
    "http://localhost:8000/api/v1/auth/login",
    {
      data: {
        email: "admin@prosell.saas",
        password: "Admin123!",
      },
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  console.log("Response status:", response.status());

  if (!response.ok()) {
    const errorText = await response.text();
    console.error("Login failed:", errorText);
    await browser.close();
    process.exit(1);
  }

  const data = await response.json();
  console.log("Login successful!");
  console.log("Access token:", data.access_token?.substring(0, 20) + "...");

  // Set cookies from the login response
  const expiresInSeconds = data.expires_in || 3600;
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;

  await context.addCookies([
    {
      name: "access_token",
      value: data.access_token,
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
      expires: expiresAt,
    },
    {
      name: "refresh_token",
      value: data.refresh_token,
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
      expires: expiresAt * 2,
    },
  ]);

  // Save storage state
  const storageState = await context.storageState();
  const storagePath = path.join(__dirname, ".auth", "storage-state.json");

  fs.mkdirSync(path.dirname(storagePath), { recursive: true });
  fs.writeFileSync(storagePath, JSON.stringify(storageState, null, 2));

  console.log("Storage state saved to:", storagePath);
  console.log("Cookies saved:", storageState.cookies.length);

  await browser.close();
  console.log("✅ Auth state generated successfully!");
})();
