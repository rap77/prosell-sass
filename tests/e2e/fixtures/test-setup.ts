/**
 * Extended fixtures for E2E tests with TestDataBuilder.
 *
 * Provides auto-cleanup fixture for test data management.
 * Import this test object instead of the default from @playwright/test.
 */

import { test as base } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { TestDataBuilder } from "../helpers/data-builder";

/**
 * Test fixtures interface.
 *
 * Extends Playwright's default fixtures with:
 * - dataBuilder: Auto-cleanup test data builder
 * - tenantId: Default tenant ID for tests
 */
export interface TestFixtures {
  dataBuilder: TestDataBuilder;
  tenantId: string;
}

/**
 * Extended test object with auto-cleanup fixtures.
 *
 * Use this instead of the default test from @playwright/test.
 *
 * @example
 * ```typescript
 * import { test } from '../fixtures/test-setup';
 *
 * test('creates a vehicle', async ({ dataBuilder }) => {
 *   const categoryId = await dataBuilder.createCategory('Test SUVs');
 *   const vehicleId = await dataBuilder.createVehicle(categoryId);
 *   // Test goes here...
 *   // cleanup() is called automatically after test
 * });
 * ```
 */
export const test = base.extend<TestFixtures>({
  // Default tenant ID for tests (can be overridden in test)
  tenantId: async ({}, use) => {
    // Use a consistent UUID for all tests in a suite
    const defaultTenantId = process.env.TEST_TENANT_ID || randomUUID();
    await use(defaultTenantId);
  },

  // TestDataBuilder with auto-cleanup
  dataBuilder: async ({ page, tenantId }, use) => {
    // Create builder before test (page.request includes auth cookies)
    const builder = new TestDataBuilder(page, tenantId);

    // Use builder in test
    await use(builder);

    // Cleanup after test (even if test fails)
    try {
      await builder.cleanup();
    } catch (error) {
      console.error("Error during auto-cleanup:", error);
      // Don't throw - we don't want cleanup failures to fail tests
    }
  },
});

/**
 * Re-export expect from Playwright for convenience.
 */
export { expect } from "@playwright/test";
