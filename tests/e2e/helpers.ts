/**
 * E2E Test Helpers
 *
 * Shared utilities for test data generation, setup, and teardown.
 */

/**
 * Generate a unique email address for testing
 */
export function generateUniqueEmail(): string {
  return `test.${Date.now()}@example.com`;
}

/**
 * Generate a test password that meets requirements
 */
export function generateTestPassword(): string {
  return "TestPassword123!";
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
 * - TEST_USER_PASSWORD (default: TestPassword123!)
 */
export function getExistingUser() {
  const email = process.env.TEST_USER_EMAIL || "test@example.com";
  const password = process.env.TEST_USER_PASSWORD || "TestPassword123!";

  return { email, password };
}
