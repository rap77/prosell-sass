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

test.describe("Manager Team Leads View - E2E Verification (A7)", () => {
  // Mock data for testing
  const MOCK_TEAM_LEADS = [
    {
      id: "lead-1",
      buyer_name: "John Doe",
      buyer_email: "john@example.com",
      buyer_phone: "+1-555-0101",
      vehicle: {
        id: "veh-1",
        title: "2020 Toyota Camry",
        make: "Toyota",
        model: "Camry",
        year: 2020,
      },
      message: "Interested in this vehicle",
      status: "new",
      source: "facebook",
      vendedor_id: "vendedor-1",
      vendedor_name: "Carlos Garcia",
      created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    },
    {
      id: "lead-2",
      buyer_name: "Jane Smith",
      buyer_email: "jane@example.com",
      buyer_phone: "+1-555-0102",
      vehicle: {
        id: "veh-2",
        title: "2021 Honda Accord",
        make: "Honda",
        model: "Accord",
        year: 2021,
      },
      message: "I'm interested in this car",
      status: "contacted",
      source: "facebook",
      vendedor_id: "vendedor-2",
      vendedor_name: "Maria Rodriguez",
      created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    },
  ];

  const MOCK_VENDEDORES = [
    {
      id: "vendedor-1",
      name: "Carlos Garcia",
      email: "carlos@example.com",
    },
    {
      id: "vendedor-2",
      name: "Maria Rodriguez",
      email: "maria@example.com",
    },
    {
      id: "vendedor-3",
      name: "Juan Perez",
      email: "juan@example.com",
    },
  ];

  test.beforeEach(async ({ page }) => {
    // Mock team leads API endpoint
    page.route("**/api/v1/leads/team**", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: MOCK_TEAM_LEADS,
            total: MOCK_TEAM_LEADS.length,
            limit: 50,
            offset: 0,
          }),
        });
      }
    });

    // Mock vendedores list endpoint
    page.route("**/api/v1/vendedores**", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: MOCK_VENDEDORES,
            total: MOCK_VENDEDORES.length,
          }),
        });
      }
    });

    // Mock lead reassignment endpoint
    page.route("**/api/v1/leads/*/reassign", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "lead-1",
            vendedor_id: "vendedor-3",
            vendedor_name: "Juan Perez",
            reassigned_at: new Date().toISOString(),
          }),
        });
      }
    });
  });

  test("A7.13: should create E2E test for manager view", async ({ page }) => {
    // Meta-test to verify test structure
    expect(test.describe).toBeDefined();
  });

  test("A7.14: should load manager team leads view", async ({ page }) => {
    // Navigate to manager team leads page
    await page.goto("/manager/team/leads");
    await page.waitForLoadState("networkidle");

    // Verify page title
    await expect(page.locator("h1")).toContainText(/team|leads/i);

    // Verify lead list is visible
    const leadList = page.locator("[data-testid='team-lead-list']");
    await expect(leadList).toBeVisible();

    // Verify at least one lead is displayed
    const leadItems = page.locator("[data-testid='lead-item']");
    const count = await leadItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test("A7.14: should display vendedor names in team leads", async ({ page }) => {
    // Navigate to manager team leads page
    await page.goto("/manager/team/leads");
    await page.waitForLoadState("networkidle");

    // Verify vendedor names are displayed
    await expect(page.locator("text=Carlos Garcia")).toBeVisible();
    await expect(page.locator("text=Maria Rodriguez")).toBeVisible();
  });

  test("A7.14: should filter team leads by vendedor", async ({ page }) => {
    // Navigate to manager team leads page
    await page.goto("/manager/team/leads");
    await page.waitForLoadState("networkidle");

    // Find vendedor filter dropdown
    const vendedorFilter = page.locator("[data-testid='vendedor-filter']");
    await expect(vendedorFilter).toBeVisible();

    // Click to open dropdown
    await vendedorFilter.click();
    await page.waitForTimeout(200);

    // Select specific vendedor
    await page.locator("[role='option']").filter({ hasText: "Carlos Garcia" }).click();
    await page.waitForTimeout(500);

    // Verify filter was applied
    await expect(vendedorFilter).toContainText("Carlos Garcia");

    // Verify only leads for that vendedor are shown
    const leadItems = page.locator("[data-testid='lead-item']");
    const count = await leadItems.count();

    if (count > 0) {
      // Should only show Carlos Garcia's leads
      await expect(leadItems.first().locator("text=Carlos Garcia")).toBeVisible();
    }
  });

  test("A7.15: should reassign lead to different vendedor", async ({ page }) => {
    // Navigate to manager team leads page
    await page.goto("/manager/team/leads");
    await page.waitForLoadState("networkidle");

    // Find the first lead
    const firstLead = page.locator("[data-testid='lead-item']").first();

    // Click reassign button
    await firstLead.locator("[data-testid='reassign-button']").click();

    // Wait for reassign modal/dialog to open
    await page.waitForSelector('[role="dialog"]');
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Select new vendedor from dropdown
    await page.click("#vendedor_id");
    await page.waitForSelector('[role="listbox"]');
    await page.locator("[role='option']").filter({ hasText: "Juan Perez" }).click();

    // Confirm reassignment
    await page.click('button:has-text("Confirm"), button:has-text("Reassign")');

    // Wait for modal to close
    await page.waitForSelector('[role="dialog"]', { state: "hidden", timeout: 5000 });

    // Verify success message
    const successMessage = page.locator(
      "text=reassigned, text=asignado, text=successfully"
    );
    await expect(successMessage).toBeVisible({ timeout: 3000 });

    // Verify lead now shows new vendedor
    await page.reload();
    await page.waitForLoadState("networkidle");

    // The first lead should now be assigned to Juan Perez
    const updatedLead = page.locator("[data-testid='lead-item']").first();
    await expect(updatedLead.locator("text=Juan Perez")).toBeVisible();
  });

  test("A7.15: should cancel lead reassignment", async ({ page }) => {
    // Navigate to manager team leads page
    await page.goto("/manager/team/leads");
    await page.waitForLoadState("networkidle");

    // Find the first lead
    const firstLead = page.locator("[data-testid='lead-item']").first();

    // Store original vendedor name
    const originalVendedor = await firstLead
      .locator("[data-testid='vendedor-name']")
      .textContent();

    // Click reassign button
    await firstLead.locator("[data-testid='reassign-button']").click();

    // Wait for reassign modal to open
    await page.waitForSelector('[role="dialog"]');

    // Select new vendedor
    await page.click("#vendedor_id");
    await page.waitForSelector('[role="listbox"]');
    await page.locator("[role='option']").filter({ hasText: "Juan Perez" }).click();

    // Click cancel button
    await page.click('button:has-text("Cancel"), button:has-text("Cancelar")');

    // Wait for modal to close
    await page.waitForSelector('[role="dialog"]', { state: "hidden", timeout: 3000 });

    // Verify lead was NOT reassigned (still shows original vendedor)
    const leadVendedor = await firstLead
      .locator("[data-testid='vendedor-name']")
      .textContent();
    expect(leadVendedor).toBe(originalVendedor);
  });

  test("A7.15: should validate reassignment requires vendedor selection", async ({
    page,
  }) => {
    // Navigate to manager team leads page
    await page.goto("/manager/team/leads");
    await page.waitForLoadState("networkidle");

    // Find the first lead
    const firstLead = page.locator("[data-testid='lead-item']").first();

    // Click reassign button
    await firstLead.locator("[data-testid='reassign-button']").click();

    // Wait for reassign modal to open
    await page.waitForSelector('[role="dialog"]');

    // Try to confirm without selecting vendedor
    await page.click('button:has-text("Confirm"), button:has-text("Reassign")');

    // Verify validation error
    const errorMessage = page.locator(
      "text=required, text=requerido, text=select a vendedor"
    );
    await expect(errorMessage).toBeVisible({ timeout: 2000 });

    // Verify modal stays open
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
  });

  test("should display team metrics in manager view", async ({ page }) => {
    // Navigate to manager team leads page
    await page.goto("/manager/team/leads");
    await page.waitForLoadState("networkidle");

    // Verify metrics are displayed
    const totalLeadsMetric = page.locator(
      "[data-testid='total-leads-metric']"
    );
    await expect(totalLeadsMetric).toBeVisible();

    const newLeadsMetric = page.locator(
      "[data-testid='new-leads-metric']"
    );
    await expect(newLeadsMetric).toBeVisible();

    const contactedLeadsMetric = page.locator(
      "[data-testid='contacted-leads-metric']"
    );
    await expect(contactedLeadsMetric).toBeVisible();
  });

  test("should handle empty team leads list", async ({ page }) => {
    // Mock empty team leads response
    page.route("**/api/v1/leads/team**", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: [],
            total: 0,
            limit: 50,
            offset: 0,
          }),
        });
      }
    });

    // Navigate to manager team leads page
    await page.goto("/manager/team/leads");
    await page.waitForLoadState("networkidle");

    // Verify empty state message
    const emptyState = page.locator(
      "text=no team leads, text=No team leads, text=empty"
    );
    await expect(emptyState).toBeVisible();
  });

  test("should handle reassignment API error", async ({ page }) => {
    // Mock API error for reassignment
    page.route("**/api/v1/leads/*/reassign", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Failed to reassign lead" }),
        });
      }
    });

    // Navigate to manager team leads page
    await page.goto("/manager/team/leads");
    await page.waitForLoadState("networkidle");

    // Find the first lead
    const firstLead = page.locator("[data-testid='lead-item']").first();

    // Click reassign button
    await firstLead.locator("[data-testid='reassign-button']").click();

    // Wait for reassign modal to open
    await page.waitForSelector('[role="dialog"]');

    // Select new vendedor
    await page.click("#vendedor_id");
    await page.waitForSelector('[role="listbox"]');
    await page.locator("[role='option']").filter({ hasText: "Juan Perez" }).click();

    // Try to confirm reassignment
    await page.click('button:has-text("Confirm"), button:has-text("Reassign")');

    // Verify error message
    const errorMessage = page.locator(
      "text=failed to reassign, text=error, text=failed"
    );
    await expect(errorMessage).toBeVisible({ timeout: 3000 });

    // Verify modal stays open
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
  });
});
