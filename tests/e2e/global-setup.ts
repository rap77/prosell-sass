/**
 * Playwright Global Setup
 *
 * Runs once before all tests to generate authentication storage state.
 * This allows tests to skip manual login and start authenticated.
 */

import { chromium, FullConfig } from "@playwright/test";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Parse Set-Cookie header into cookie object
 */
function parseSetCookieHeader(
  setCookieValue: string,
): { name: string; value: string; [key: string]: any } | null {
  if (!setCookieValue) return null;

  const parts = setCookieValue.split(";").map((p) => p.trim());
  const [nameValue, ...attributes] = parts;

  if (!nameValue) return null;

  const [name, value] = nameValue.split("=");

  const cookie: any = {
    name,
    value: value || "",
    domain: "localhost",
    path: "/",
    sameSite: "Lax",
  };

  for (const attr of attributes) {
    const [key, val] = attr.split("=");
    const lowerKey = key.toLowerCase();

    if (lowerKey === "max-age") {
      // Playwright expects expires in seconds (unix timestamp)
      cookie.expires = Math.floor(
        (Date.now() + parseInt(val || "0", 10) * 1000) / 1000,
      );
    } else if (lowerKey === "expires") {
      // Parse RFC 1123 date format, convert to seconds for Playwright
      cookie.expires = Math.floor(new Date(val).getTime() / 1000);
    } else if (lowerKey === "domain") {
      cookie.domain = val || "localhost";
    } else if (lowerKey === "path") {
      cookie.path = val || "/";
    } else if (lowerKey === "samesite") {
      // Capitalize first letter for Playwright (Strict|Lax|None)
      const samesiteVal = (val || "lax").toLowerCase();
      cookie.sameSite =
        samesiteVal.charAt(0).toUpperCase() + samesiteVal.slice(1);
    } else if (lowerKey === "secure") {
      cookie.secure = true;
    } else if (lowerKey === "httponly") {
      cookie.httpOnly = true;
    }
  }

  return cookie;
}

async function globalSetup(config: FullConfig) {
  console.log("[GLOBAL SETUP] Starting authentication setup...");

  // Get test credentials from env or defaults
  // Note: These must match a real user in the database
  const email = process.env.TEST_USER_EMAIL || "admin@prosell.saas";
  const password = process.env.TEST_USER_PASSWORD || "Admin123!";

  // Make direct API call to get cookies
  console.log("[GLOBAL SETUP] Making direct login API call...");

  // Call backend API directly (not through Next.js proxy)
  // Backend runs on port 8000, frontend on 3000
  const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
  const response = await fetch(`${backendUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
    credentials: "include", // Important for cookies
  });

  console.log("[GLOBAL SETUP] Login API response status:", response.status);

  if (!response.ok) {
    console.log("[GLOBAL SETUP] ERROR: Login API call failed!");
    throw new Error(`Login API call failed: ${response.status}`);
  }

  // Get all Set-Cookie headers
  const setCookieHeaders = response.headers.getSetCookie();
  console.log(
    "[GLOBAL SETUP] Set-Cookie headers found:",
    setCookieHeaders.length,
  );

  const cookies: any[] = [];
  for (const header of setCookieHeaders) {
    console.log(
      "[GLOBAL SETUP] Parsing Set-Cookie:",
      header.substring(0, 60) + "...",
    );
    const cookie = parseSetCookieHeader(header);
    if (cookie) {
      cookies.push(cookie);
      console.log(
        "[GLOBAL SETUP] Parsed cookie:",
        cookie.name,
        "=",
        cookie.value.substring(0, 20) + "...",
      );
    }
  }

  if (cookies.length === 0) {
    console.log(
      "[GLOBAL SETUP] ERROR: No cookies parsed from Set-Cookie headers!",
    );
    throw new Error("No cookies parsed from login API response");
  }

  // CRITICAL: Extract tenant_id from user_data cookie
  // Categories use tenant_id (which is the organization_id), not user.id
  const userDataCookie = cookies.find((c) => c.name === "user_data");
  let authenticatedTenantId = "";
  if (userDataCookie) {
    console.log(
      "[GLOBAL SETUP] Found user_data cookie, extracting tenant_id...",
    );
    try {
      // Decode URL-encoded JSON (Python SimpleCookie adds quotes)
      let rawValue = userDataCookie.value;
      if (rawValue.startsWith('"') && rawValue.endsWith('"')) {
        rawValue = rawValue.slice(1, -1);
      }
      const decodedValue = decodeURIComponent(rawValue);
      const userData = JSON.parse(decodedValue);

      // Extract tenant_id to use for category creation (this is the organization_id)
      authenticatedTenantId = userData.tenant_id;
      console.log("[GLOBAL SETUP] Extracted tenant_id:", authenticatedTenantId);

      // Change role to dealer for E2E tests (dealer appointments page requires dealer role)
      if (userData.role) {
        userData.role = "dealer";
        console.log("[GLOBAL SETUP] Modified user role to:", userData.role);
      }

      // Re-encode and update cookie value
      const modifiedValue = JSON.stringify(userData);
      userDataCookie.value = encodeURIComponent(modifiedValue);
      console.log("[GLOBAL SETUP] user_data cookie updated successfully");
    } catch (error) {
      console.log(
        "[GLOBAL SETUP] WARNING: Failed to parse user_data cookie:",
        error,
      );
    }
  } else {
    console.log("[GLOBAL SETUP] WARNING: user_data cookie not found!");
  }

  // Save the authenticated user's tenant_id (organization_id) for tests
  if (authenticatedTenantId) {
    process.env.TEST_TENANT_ID = authenticatedTenantId;
    console.log("[GLOBAL SETUP] Set TEST_TENANT_ID to:", authenticatedTenantId);

    // Also save to a file that tests can read (env vars don't persist from globalSetup)
    const authDir = path.join(__dirname, ".auth");
    fs.mkdirSync(authDir, { recursive: true });
    const tenantIdPath = path.join(authDir, "tenant-id.txt");
    fs.writeFileSync(tenantIdPath, authenticatedTenantId);
    console.log("[GLOBAL SETUP] Saved tenant_id to:", tenantIdPath);
  }

  // Create browser context and add cookies
  const browser = await chromium.launch();
  const context = await browser.newContext();

  console.log("[GLOBAL SETUP] Adding cookies to browser context...");
  await context.addCookies(cookies);

  // Verify cookies were added
  const contextCookies = await context.cookies();
  console.log(
    "[GLOBAL SETUP] Cookies in context:",
    contextCookies.map((c) => c.name),
  );

  // Verify by navigating to a protected route
  const page = await context.newPage();
  console.log("[GLOBAL SETUP] Testing navigation to protected route...");
  const testBaseUrl = process.env.BASE_URL || "http://localhost:3000";
  await page.goto(`${testBaseUrl}/dashboard`, { waitUntil: "load" });
  console.log("[GLOBAL SETUP] Current URL after navigation:", page.url());

  // Save storage state
  const storageState = await context.storageState();
  const storagePath = path.join(__dirname, ".auth", "storage-state.json");

  // Ensure directory exists
  fs.mkdirSync(path.dirname(storagePath), { recursive: true });

  // Write storage state
  fs.writeFileSync(storagePath, JSON.stringify(storageState, null, 2));

  console.log(`[GLOBAL SETUP] Storage state saved to: ${storagePath}`);
  console.log(
    `[GLOBAL SETUP] Total cookies in storage: ${storageState.cookies.length}`,
  );
  console.log(
    `[GLOBAL SETUP] Cookie names:`,
    storageState.cookies.map((c) => c.name),
  );

  await browser.close();
  console.log("[GLOBAL SETUP] Authentication setup complete!");
}

export default globalSetup;
