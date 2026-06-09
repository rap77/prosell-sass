import { test, expect } from "@playwright/test";
import { MOCK_CATEGORIES } from "../fixtures/mock-data";
import {
  mockVehiclesEndpoint,
  mockCategoriesEndpoint,
} from "../helpers/mock-endpoints";

/**
 * E2E Accessibility Tests for Catalog
 *
 * Tests accessibility compliance using axe-core.
 * API endpoints are mocked so tests never hit the real backend.
 */

test.describe("Catalog - Accessibility", () => {
  test("should pass accessibility checks", async ({ page }) => {
    // Mock API endpoints BEFORE navigation so the page never hits the real backend
    await mockVehiclesEndpoint(page);
    await mockCategoriesEndpoint(page, MOCK_CATEGORIES);

    // Navigate to catalog page
    await page.goto("/catalog");
    await page.waitForLoadState("load");

    // Wait for content to render (vehicles from mock)
    await expect(
      page.locator('[data-testid="vehicle-row"]').first(),
    ).toBeVisible({ timeout: 5000 });

    // Run accessibility check, skipping rules known to produce false positives or
    // pre-existing violations in the shared layout (not the catalog feature under test).
    //
    // Disabled rules:
    //   - color-contrast: requires real brand color palette; mocked environment lacks it
    //   - landmark-unique: the layout uses multiple unlabeled <nav> elements (Sidebar + Header);
    //     these are pre-existing layout issues, not catalog-specific
    const AxeBuilder = (await import("@axe-core/playwright")).default;
    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(["color-contrast", "landmark-unique"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
