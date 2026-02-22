/**
 * Development utility to check if authentication pages are accessible
 *
 * This script verifies that the Next.js dev server is running and
 * all auth pages return successful responses.
 */

import http from "http";

interface PageCheck {
  path: string;
  success: boolean;
  status?: number;
}

const pages: string[] = [
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password?token=test",
  "/auth/verify-email?token=test",
];

const BASE_URL = "http://localhost:3000";

console.log("🔍 Checking if server is running...");

/**
 * Check if a single page is accessible
 */
function checkPage(path: string): Promise<PageCheck> {
  return new Promise((resolve) => {
    http
      .get(`${BASE_URL}${path}`, (res) => {
        resolve({
          path,
          success: res.statusCode === 200,
          status: res.statusCode,
        });
      })
      .on("error", (error) => {
        console.error(
          `Error checking ${path}:`,
          error instanceof Error ? error.message : error,
        );
        resolve({ path, success: false });
      });
  });
}

/**
 * Check all pages and report results
 */
async function checkPages(): Promise<void> {
  const results = await Promise.all(pages.map(checkPage));
  const completed = results.length;

  // Log results
  results.forEach((result) => {
    if (result.success) {
      console.log(`✅ ${result.path}: ${result.status}`);
    } else {
      console.log(`❌ ${result.path}: Error connecting`);
    }
  });

  const allSuccessful = results.every((r) => r.success);

  if (allSuccessful) {
    console.log("\n⚠️  To visually validate the UI:");
    console.log(`1. Open ${BASE_URL}/auth/login in your browser`);
    console.log("2. Navigate through the authentication pages");
    console.log("3. Verify that CSS styles are applied correctly");
    console.log("\n📋 List of pages to validate manually:");
    pages.forEach((p) => console.log(`   - ${BASE_URL}${p}`));
    process.exit(0);
  } else {
    console.log(
      `\n⚠️  Error: Server does not seem to be running on ${BASE_URL}`,
    );
    process.exit(1);
  }
}

checkPages().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
