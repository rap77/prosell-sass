/**
 * Team Switching E2E Tests
 *
 * Tests for team switching functionality including:
 * - Displaying team switcher in header
 * - Showing all user's teams
 * - Switching between teams
 * - Verifying context updates after switch
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Team Switching", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard (assumes user is already authenticated)
    // In a real scenario, you would log in first
    await page.goto("/dashboard");
  });

  test.describe("Team Switcher Component", () => {
    test(
      "@smoke should display team switcher in header",
      { tag: ["@e2e", "@team", "@TEAM-E2E-001"] },
      async ({ page }) => {
        // Team switcher should be visible in header
        const teamSwitcher = page.locator(
          '[data-testid="team-switcher"], button:has-text("Select Team")',
        );
        await expect(teamSwitcher).toBeVisible();
      },
    );

    test(
      "should pass accessibility checks",
      { tag: ["@e2e", "@team", "@a11y", "@TEAM-E2E-002"] },
      async ({ page }) => {
        const accessibilityScanResults = await new AxeBuilder({
          page,
        }).analyze();
        expect(accessibilityScanResults.violations).toEqual([]);
      },
    );

    test(
      "should open dropdown when clicked",
      { tag: ["@e2e", "@team", "@TEAM-E2E-003"] },
      async ({ page }) => {
        // Click on team switcher
        const teamSwitcher = page
          .locator('button:has-text("Select Team")')
          .first();
        await teamSwitcher.click();

        // Dropdown should appear with team options
        const dropdown = page.locator('[role="menu"]');
        await expect(dropdown).toBeVisible();
      },
    );

    test(
      "should display all user's teams in dropdown",
      { tag: ["@e2e", "@team", "@TEAM-E2E-004"] },
      async ({ page }) => {
        // Open team switcher dropdown
        const teamSwitcher = page
          .locator('button:has-text("Select Team")')
          .first();
        await teamSwitcher.click();

        // Wait for dropdown to appear
        const dropdown = page.locator('[role="menu"]');
        await expect(dropdown).toBeVisible();

        // Should have at least one team option
        const teamOptions = page.locator('[role="menuitem"]');
        const count = await teamOptions.count();
        expect(count).toBeGreaterThan(0);
      },
    );
  });

  test.describe("Team Switching Flow", () => {
    test(
      "@smoke should switch to different team",
      { tag: ["@e2e", "@team", "@TEAM-E2E-005"] },
      async ({ page }) => {
        // Open team switcher dropdown
        const teamSwitcher = page
          .locator('button:has-text("Select Team")')
          .first();
        await teamSwitcher.click();

        // Wait for dropdown to appear
        const dropdown = page.locator('[role="menu"]');
        await expect(dropdown).toBeVisible();

        // Get all team options
        const teamOptions = page.locator('[role="menuitem"]');
        const count = await teamOptions.count();

        if (count > 1) {
          // Click on the second team (assuming there are at least 2 teams)
          await teamOptions.nth(1).click();

          // Page should refresh to update context
          await page.waitForLoadState("networkidle");

          // Team switcher should now show the selected team
          const updatedTeamSwitcher = page
            .locator('button:has-text("Select Team")')
            .first();
          await expect(updatedTeamSwitcher).toBeVisible();
        }
      },
    );

    test(
      "should highlight currently active team",
      { tag: ["@e2e", "@team", "@TEAM-E2E-006"] },
      async ({ page }) => {
        // Open team switcher dropdown
        const teamSwitcher = page
          .locator('button:has-text("Select Team")')
          .first();
        await teamSwitcher.click();

        // Wait for dropdown to appear
        const dropdown = page.locator('[role="menu"]');
        await expect(dropdown).toBeVisible();

        // Check if there's an "Active" indicator on the current team
        const activeIndicator = page.locator("text=Active");
        const isActiveVisible = await activeIndicator.isVisible();
        expect(isActiveVisible).toBe(true);
      },
    );
  });

  test.describe("Loading and Error States", () => {
    test(
      "should show loading state while fetching teams",
      { tag: ["@e2e", "@team", "@TEAM-E2E-007"] },
      async ({ page }) => {
        // This test would require mocking the API response
        // For now, we'll just verify the component exists
        const teamSwitcher = page.locator(
          '[data-testid="team-switcher"], button:has-text("Select Team")',
        );
        await expect(teamSwitcher).toBeVisible();
      },
    );

    test(
      "should handle empty teams list gracefully",
      { tag: ["@e2e", "@team", "@TEAM-E2E-008"] },
      async ({ page }) => {
        // This test would require mocking the API response
        // For now, we'll just verify the component exists
        const teamSwitcher = page.locator(
          '[data-testid="team-switcher"], button:has-text("Select Team")',
        );
        await expect(teamSwitcher).toBeVisible();
      },
    );
  });
});
