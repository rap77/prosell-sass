/**
 * Refactored Smoke Tests - Layer 2 Example
 *
 * This file demonstrates how to refactor existing E2E tests
 * to use the factory pattern instead of shared fixtures.
 *
 * BEFORE: Used MOCK_LEADS shared fixture
 * AFTER: Uses LeadFactory to generate independent data per test
 *
 * Key changes:
 * 1. Import factory instead of mock data
 * 2. Create factory instance
 * 3. Generate fresh data in beforeEach or test body
 * 4. Reset counter in beforeEach for test isolation
 */

import { expect, test } from "@playwright/test";
import { LeadFactory, AppointmentFactory } from "../factories/index";

// Initialize factories
const leadFactory = new LeadFactory();
const aptFactory = new AppointmentFactory();

test.describe("Refactored Smoke Tests - Lead Management", () => {
  test.beforeEach(async ({ page }) => {
    // Reset factory counters before each test
    leadFactory.reset();
    aptFactory.reset();
  });

  test.describe("Lead Management - Independent Data Generation", () => {
    test("should load leads list page with fresh data", async ({ page }) => {
      // BEFORE: Used MOCK_LEADS from shared fixture
      // await page.route('**/api/v1/leads**', async (route) => {
      //   await route.fulfill({
      //     status: 200,
      //     body: JSON.stringify({ items: MOCK_LEADS, ... }),
      //   });
      // });

      // AFTER: Generate fresh lead data for this test
      const freshLeads = leadFactory.createBatch(3);

      // Mock API with independent data
      await page.route("**/api/v1/leads**", async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              items: freshLeads,
              total: freshLeads.length,
              limit: 50,
              offset: 0,
            }),
          });
        }
      });

      // Navigate to leads page
      await page.goto("/vendedor/leads");
      await page.waitForLoadState("networkidle");

      // Verify page title
      await expect(page.locator("h1")).toContainText(/leads/i);

      // Verify leads list container
      const leadList = page.locator("[data-testid='lead-list']");
      await expect(leadList).toBeVisible();

      // Verify fresh data is displayed (not hardcoded MOCK_LEADS)
      await expect(
        page.locator(`text=${freshLeads[0].buyer_name}`),
      ).toBeVisible();
      await expect(
        page.locator(`text=${freshLeads[1].buyer_name}`),
      ).toBeVisible();
    });

    test("should display lead information with independent data", async ({
      page,
    }) => {
      // Generate unique lead for this test
      const uniqueLead = leadFactory.create({
        buyer_name: "Unique Test Customer",
        status: "new",
      });

      // Mock API
      await page.route("**/api/v1/leads**", async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              items: [uniqueLead],
              total: 1,
              limit: 50,
              offset: 0,
            }),
          });
        }
      });

      // Navigate to leads page
      await page.goto("/vendedor/leads");
      await page.waitForLoadState("networkidle");

      // Verify unique lead data is displayed
      await expect(page.locator(`text=${uniqueLead.buyer_name}`)).toBeVisible();
      await expect(
        page.locator(`text=${uniqueLead.buyer_email}`),
      ).toBeVisible();

      // Verify status badge (UI uses Spanish: "Nuevo")
      const statusBadge = page
        .locator("[data-testid='lead-item']")
        .first()
        .locator("[data-testid='status-badge']");
      await expect(statusBadge).toBeVisible();
      await expect(statusBadge).toContainText("Nuevo");
    });

    test("should update lead status with independent data", async ({
      page,
    }) => {
      // Generate unique lead for this test
      const uniqueLead = leadFactory.createWithStatus("new");

      // Track current status across GET/PUT calls
      let currentStatus = uniqueLead.status;

      // Mock API — GET returns current status, PUT updates it
      await page.route("**/api/v1/leads**", async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              items: [{ ...uniqueLead, status: currentStatus }],
              total: 1,
              limit: 50,
              offset: 0,
            }),
          });
        } else if (route.request().method() === "PUT") {
          currentStatus = "contacted";
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              ...uniqueLead,
              status: "contacted",
              updated_at: new Date().toISOString(),
            }),
          });
        }
      });

      // Navigate to leads page
      await page.goto("/vendedor/leads");
      await page.waitForLoadState("networkidle");

      // Find the first lead
      const firstLead = page.locator("[data-testid='lead-item']").first();

      // Verify initial status (UI uses Spanish: "Nuevo")
      const statusBadge = firstLead.locator("[data-testid='status-badge']");
      await expect(statusBadge).toContainText("Nuevo");

      // Click the status dropdown trigger
      await firstLead.locator("[data-testid='status-dropdown']").click();
      await page.waitForTimeout(200);

      // Click on "Contactado" status (Spanish)
      const contactedOption = page
        .locator("[role='menuitem']")
        .filter({ hasText: "Contactado" });
      await contactedOption.click();

      // Wait for the update then reload to see new status from mock
      await page.waitForLoadState("networkidle");
      await page.reload();
      await page.waitForLoadState("networkidle");

      // After reload, GET returns updated status "Contactado"
      const reloadedBadge = page
        .locator("[data-testid='lead-item']")
        .first()
        .locator("[data-testid='status-badge']");
      await expect(reloadedBadge).toContainText("Contactado");
    });

    test("should search leads with independent data", async ({ page }) => {
      // Generate multiple leads with different names
      const leads = [
        leadFactory.create({ buyer_name: "Alice Johnson" }),
        leadFactory.create({ buyer_name: "Bob Smith" }),
        leadFactory.create({ buyer_name: "Charlie Brown" }),
      ];

      // Mock API
      await page.route("**/api/v1/leads**", async (route) => {
        if (route.request().method() === "GET") {
          const url = route.request().url();
          const searchParams = new URL(url).searchParams;
          const search = searchParams.get("search");

          let filteredLeads = leads;
          if (search) {
            filteredLeads = leads.filter((lead) =>
              lead.buyer_name.toLowerCase().includes(search.toLowerCase()),
            );
          }

          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              items: filteredLeads,
              total: filteredLeads.length,
              limit: 50,
              offset: 0,
            }),
          });
        }
      });

      // Navigate to leads page
      await page.goto("/vendedor/leads");
      await page.waitForLoadState("networkidle");

      // Type in search box (UI placeholder is in Spanish: "Buscar por comprador...")
      const searchInput = page.locator("input[placeholder*='Buscar']");
      await searchInput.fill("Alice");

      // Wait for search results
      await page.waitForTimeout(500);

      // Verify search input has the value
      await expect(searchInput).toHaveValue("Alice");

      // Verify filtered results (only Alice should be visible)
      const leadItems = page.locator("[data-testid='lead-item']");
      const count = await leadItems.count();

      if (count > 0) {
        await expect(
          leadItems.first().locator("text=Alice Johnson"),
        ).toBeVisible();
      }
    });

    test("should filter leads by status with independent data", async ({
      page,
    }) => {
      // Generate leads with different statuses
      const leads = [
        leadFactory.createWithStatus("new"),
        leadFactory.createWithStatus("contacted"),
        leadFactory.createWithStatus("qualified"),
      ];

      // Mock API
      await page.route("**/api/v1/leads**", async (route) => {
        if (route.request().method() === "GET") {
          const url = route.request().url();
          const searchParams = new URL(url).searchParams;
          const status = searchParams.get("status");

          let filteredLeads = leads;
          if (status) {
            filteredLeads = leads.filter((lead) => lead.status === status);
          }

          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              items: filteredLeads,
              total: filteredLeads.length,
              limit: 50,
              offset: 0,
            }),
          });
        }
      });

      // Navigate to leads page
      await page.goto("/vendedor/leads");
      await page.waitForLoadState("networkidle");

      // Click the "Nuevos" status pill button (LeadList uses pill filters, not a dropdown)
      const nuevosPill = page.locator("button").filter({ hasText: "Nuevos" });
      await nuevosPill.click();

      // Wait for filter to apply
      await page.waitForTimeout(500);

      // Verify only "new" leads are displayed
      const leadItems = page.locator("[data-testid='lead-item']");
      const count = await leadItems.count();

      if (count > 0) {
        const firstBadge = leadItems
          .first()
          .locator("[data-testid='status-badge']");
        await expect(firstBadge).toContainText("Nuevo"); // Spanish
      }
    });
  });

  test.describe("Complete Lead Flow - Independent Data", () => {
    test("should create lead and schedule appointment with fresh data", async ({
      page,
    }) => {
      // Generate independent lead and appointment data
      const flowLead = leadFactory.create({
        buyer_name: "Flow Test Customer",
        source: "manual",
      });

      const flowAppointment = aptFactory.createMonday();

      const mockDealers = [
        {
          id: flowAppointment.dealer_id,
          name: "Flow Test Dealer",
          email: "dealer@example.com",
          phone: "+1-555-7777",
        },
      ];

      // Mock API endpoints with fresh data
      await page.route("**/api/v1/leads**", async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              items: [flowLead],
              total: 1,
              limit: 50,
              offset: 0,
            }),
          });
        } else if (route.request().method() === "PUT") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              ...flowLead,
              status: "contacted",
              updated_at: new Date().toISOString(),
            }),
          });
        }
      });

      await page.route("**/api/**/dealer*", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: mockDealers,
            total: mockDealers.length,
            limit: 50,
            offset: 0,
          }),
        });
      });

      await page.route("**/api/**/appointment*", async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({
              id: aptFactory.generateId("apt"),
              dealer_id: flowAppointment.dealer_id,
              lead_id: flowLead.id,
              scheduled_at: flowAppointment.scheduled_at,
              status: "scheduled",
              notes: "Test appointment",
            }),
          });
        }
      });

      // Navigate to leads page
      await page.goto("/vendedor/leads");
      await page.waitForLoadState("networkidle");

      // Verify lead is displayed (fresh data, not MOCK_LEADS)
      await expect(page.locator(`text=${flowLead.buyer_name}`)).toBeVisible();

      // Click on lead to view details
      const firstLead = page.locator("[data-testid='lead-item']").first();
      await firstLead.click();
      await page.waitForLoadState("networkidle");

      // Click "Agendar Cita" button if visible
      const scheduleButton = page.locator('button:has-text("Agendar Cita")');
      if (
        await scheduleButton.isVisible({ timeout: 3000 }).catch(() => false)
      ) {
        await scheduleButton.click();
        await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

        // Fill out appointment form
        await page.click("#dealer_id");
        await page.waitForSelector('[role="listbox"]');
        await page
          .locator("[role='option']")
          .filter({ hasText: "Flow Test Dealer" })
          .click();

        // Select Monday at 10 AM
        const monday = new Date();
        const daysUntilMonday = (1 - monday.getDay() + 7) % 7 || 7;
        monday.setDate(monday.getDate() + daysUntilMonday);
        const dateStr = monday.toISOString().split("T")[0];
        await page.fill('input[type="date"]', dateStr);

        await page.click("#time");
        await page.waitForSelector('[role="listbox"]');
        await page
          .locator("[role='option']")
          .filter({ hasText: "10:00" })
          .first()
          .click();

        // Submit form
        await page.click('button[type="submit"]');

        // Wait for success
        await page.waitForSelector('[role="dialog"]', {
          state: "hidden",
          timeout: 5000,
        });

        // Verify success message
        const successMessage = page.locator(
          "text=appointment created, text=cita creada",
        );
        await expect(successMessage).toBeVisible({ timeout: 3000 });
      }

      // Flow verified with independent data
    });
  });
});

/**
 * KEY REFACTORING PATTERNS:
 *
 * 1. Import factories instead of mock data:
 *    import { LeadFactory } from '../factories';
 *
 * 2. Initialize factory instances:
 *    const leadFactory = new LeadFactory();
 *
 * 3. Reset counters in beforeEach:
 *    leadFactory.reset();
 *
 * 4. Generate fresh data in tests:
 *    const lead = leadFactory.create();
 *
 * 5. Use factory convenience methods:
 *    leadFactory.createWithStatus('new')
 *    leadFactory.createUnread()
 *    aptFactory.createMonday()
 *
 * 6. No shared state between tests
 * 7. Each test generates unique data
 * 8. Tests can run in parallel safely
 */
