/**
 * E2E Test Helpers
 *
 * Shared utilities for test data generation, setup, and teardown.
 */

import { expect } from "@playwright/test";

/**
 * Generate a unique email address for testing
 */
export function generateUniqueEmail(): string {
  return `test.${Date.now()}@example.com`;
}

/**
 * Generate a test password that meets backend requirements
 *
 * Password must contain:
 * - At least 8 characters
 * - At least one lowercase letter
 * - At least one uppercase letter
 * - At least one number
 * - At least one special character: @$!%*?&
 */
export function generateTestPassword(): string {
  return "Test!Password123";
}

/**
 * Generate test user data
 */
export function generateTestUser() {
  return {
    email: generateUniqueEmail(),
    password: generateTestPassword(),
    fullName: "Test User",
  };
}

/**
 * Get existing test user credentials for E2E testing
 *
 * NOTE: These should ONLY work in test environment with mock API.
 * Falls back to default test credentials if env vars are not set.
 *
 * Optional env vars:
 * - TEST_USER_EMAIL (default: test@example.com)
 * - TEST_USER_PASSWORD (default: TestPassword123)
 */
export function getExistingUser() {
  const email = process.env.TEST_USER_EMAIL || "test@example.com";
  const password = process.env.TEST_USER_PASSWORD || "Test!Password123";

  return { email, password };
}

/**
 * Login a user for E2E testing
 *
 * Note: This does NOT redirect to dashboard - it just authenticates
 * and sets cookies. The test should then navigate to the desired page.
 *
 * @param page - Playwright Page object
 * @param email - User email (defaults to test user)
 * @param password - User password (defaults to test password)
 */
/**
 * Login a user for E2E testing
 *
 * Note: This authenticates and sets cookies, then returns to allow
 * the test to navigate to the desired page.
 *
 * @param page - Playwright Page object
 * @param email - User email (defaults to test user)
 * @param password - User password (defaults to test password)
 */
export async function loginUser(
  page: any,
  email?: string,
  password?: string
): Promise<void> {
  const user = getExistingUser();
  const loginEmail = email || user.email;
  const loginPassword = password || user.password;

  console.log(`[LOGIN USER] Email: ${loginEmail}, Password: ${loginPassword}`);

  // Navigate to login page
  await page.goto("/auth/login");
  await page.waitForLoadState("networkidle");

  // Fill login form
  await page.locator("#email").fill(loginEmail);
  await page.locator("input#password-password").fill(loginPassword);

  console.log("[LOGIN USER] Form filled, clicking submit...");

  // Click submit button
  await page.getByRole("button", { name: /sign in/i }).click();

  console.log("[LOGIN USER] Button clicked, waiting for network...");

  // Wait for network to settle after login
  // Cookies are set now, but we may still be on login page (no auto-redirect)
  await page.waitForLoadState("networkidle", { timeout: 10000 });

  console.log("[LOGIN USER] Login complete");
}

/**
 * Create and login a new test user
 *
 * @param page - Playwright Page object
 */
export async function createAndLoginUser(page: any): Promise<void> {
  const user = generateTestUser();

  // Navigate to register page
  await page.goto("/auth/register");

  // Fill registration form
  await page.locator("#fullName").fill(user.fullName);
  await page.locator("#email").fill(user.email);
  await page.locator("#password-password").fill(user.password);
  await page.locator("#confirmPassword").fill(user.password);

  // Accept terms
  await page.locator("#terms").click();

  // Submit form
  await page.getByRole("button", { name: /sign up/i }).click();

  // Wait for navigation
  await page.waitForLoadState("networkidle");
}
