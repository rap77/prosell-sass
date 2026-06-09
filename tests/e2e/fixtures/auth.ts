/**
 * Authenticated Request Fixture for Playwright
 *
 * Provides an authenticated API request context by injecting cookies
 * from storage-state.json into API requests.
 *
 * Usage:
 * ```ts
 * import { test as authenticatedTest } from '../fixtures/auth';
 *
 * authenticatedTest('my test', async ({ authenticatedRequest }) => {
 *   const response = await authenticatedRequest.get('/api/v1/leads');
 *   // This request will include auth cookies
 * });
 * ```
 */

import { test as base, APIRequestContext } from "@playwright/test";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Storage state file path
 */
const STORAGE_STATE_PATH = path.join(
  __dirname,
  "..",
  ".auth",
  "storage-state.json",
);

/**
 * Read storage state from file
 */
function readStorageState() {
  if (!fs.existsSync(STORAGE_STATE_PATH)) {
    throw new Error(
      `Storage state file not found: ${STORAGE_STATE_PATH}\n` +
        "Run login test first to generate auth cookies.",
    );
  }

  const storageState = JSON.parse(fs.readFileSync(STORAGE_STATE_PATH, "utf-8"));

  if (!storageState.cookies || storageState.cookies.length === 0) {
    throw new Error(
      "No cookies found in storage state file.\n" +
        "Run login test first to generate auth cookies.",
    );
  }

  return storageState;
}

/**
 * Create authenticated request fixture
 *
 * Uses playwright.request.newContext() with cookies converted to
 * Cookie header for authentication.
 *
 * NOTE: Tests against backend API directly (localhost:8000) to avoid
 * Next.js cookies() incompatibility with APIRequestContext Cookie headers.
 */
export const test = base.extend<{
  authenticatedRequest: APIRequestContext;
}>({
  authenticatedRequest: async ({ playwright }, use) => {
    // Read storage state (cookies)
    const storageState = readStorageState();

    // Convert cookies to Cookie header format
    const cookieHeader = storageState.cookies
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");

    // Create new APIRequestContext with Cookie header
    const authenticatedRequest = await playwright.request.newContext({
      // Use backend URL directly (not Next.js proxy)
      baseURL: "http://localhost:8000",
      // Add cookies as a header
      extraHTTPHeaders: {
        Cookie: cookieHeader,
      },
    });

    // Use the authenticated request
    await use(authenticatedRequest);

    // Cleanup: dispose of the request context
    await authenticatedRequest.dispose();
  },
});

// Export expect from base test
export const expect = base.expect;
