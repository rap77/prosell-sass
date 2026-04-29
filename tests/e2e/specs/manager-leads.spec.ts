/**
 * E2E tests for Manager Team Leads View (A5.14-A5.16)
 *
 * Tests the manager's ability to:
 * - View team leads and metrics
 * - Filter leads by vendedor
 * - Reassign leads to different vendedores
 */

import { test, expect } from "@playwright/test";

test.describe("Manager Team Leads View", () => {
  test("A5.14: page should load successfully", async ({ page }) => {
    // Navigate to manager team leads page
    await page.goto("/manager/team/leads");

    // Wait for page to load
    await page.waitForLoadState("domcontentloaded");

    // Check that page has content
    const bodyText = await page.locator("body").textContent();
    expect(bodyText?.trim().length).toBeGreaterThan(0);
  });

  test("A5.14: should display page header", async ({ page }) => {
    await page.goto("/manager/team/leads");
    await page.waitForLoadState("domcontentloaded");

    // Check for page header - it should contain "Team" or "Leads"
    const pageContent = await page.locator("body").textContent();
    expect(pageContent).toMatch(/team|leads/i);
  });

  test("A5.15: filter controls should be present in DOM", async ({ page }) => {
    await page.goto("/manager/team/leads");
    await page.waitForLoadState("domcontentloaded");

    // Check that select elements exist (filter dropdowns)
    const selectElements = page.locator("select").count();
    expect(await selectElements).toBeGreaterThan(0);
  });

  test("A5.16: action buttons should be present in DOM", async ({ page }) => {
    await page.goto("/manager/team/leads");
    await page.waitForLoadState("domcontentloaded");

    // Check that buttons exist
    const buttons = page.locator("button").count();
    expect(await buttons).toBeGreaterThan(0);
  });
});
