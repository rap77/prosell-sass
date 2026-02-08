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
 * Environment variables MUST be set for tests to work.
 *
 * Required env vars:
 * - TEST_USER_EMAIL
 * - TEST_USER_PASSWORD
 */
export function getExistingUser() {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables must be set for E2E tests"
    );
  }

  return { email, password };
}
