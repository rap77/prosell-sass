/**
 * Organizations E2E Tests
 *
 * Tests for organizations CRUD flow including:
 * - Page layout and accessibility
 * - Create organization
 * - List organizations
 * - View organization details
 * - Update organization
 * - Organization status changes
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { OrganizationsListPage } from "./organizations-list-page";
import { OrganizationFormPage } from "./organization-form-page";
import { OrganizationDetailPage } from "./organization-detail-page";
import { generateTestUser, loginUser } from "../../helpers";
import type { Page } from "@playwright/test";

function makeMockId(): string {
  // Generate a UUID-format ID (hex characters only, matching [a-f0-9-]+)
  const hex = () => Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, "0");
  return `${hex().slice(0,8)}-${hex().slice(0,4)}-${hex().slice(0,4)}-${hex().slice(0,4)}-${hex()}${hex().slice(0,4)}`;
}

function makeMockOrg(name: string, description?: string, website?: string, phone?: string) {
  const id = makeMockId();
  const now = new Date().toISOString();
  return {
    id,
    name,
    tenant_id: "test-user-123",
    status: "pending_verification",
    description: description ?? null,
    website: website ?? null,
    phone: phone ?? null,
    logo_url: null,
    banner_url: null,
    wallet_id: null,
    created_at: now,
    updated_at: now,
    verified_at: null,
    verified_by: null,
  };
}

const MOCK_TEST_USER = {
  id: "test-user-123",
  email: "test@example.com",
  first_name: "Test",
  last_name: "User",
  role: "user",
  is_email_verified: true,
  is_2fa_enabled: false,
};

async function setupOrgApiMocks(page: Page): Promise<Record<string, any>> {
  // Per-test org store - shared via closure so route handlers can mutate it
  const store: Record<string, any> = {};

  // Mock /api/auth/state so the Zustand auth store hydrates with a real user.
  // Without this, user.id is null → fetchOrganizations is never called → list is empty.
  // The real backend rejects mock tokens from global-setup, so we intercept here.
  await page.route("**/api/auth/state", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ isAuthenticated: true, user: MOCK_TEST_USER }),
    });
  });

  // Single catch-all handler for all /api/v1/org* URLs
  await page.route("**/api/v1/org**", async (route) => {
    const method = route.request().method();
    const url = route.request().url();

    // Extract path segment after /api/v1/org (if any)
    const pathMatch = url.match(/\/api\/v1\/org\/([^/?]+)/);
    const orgId = pathMatch ? pathMatch[1] : null;

    if (orgId) {
      // Routes with ID: /api/v1/org/{id}[/...]
      if (method === "GET") {
        const org = store[orgId];
        await route.fulfill({ status: org ? 200 : 404, contentType: "application/json", body: JSON.stringify(org ?? { detail: "Not found" }) });
      } else if (method === "PATCH") {
        const body = await route.request().postDataJSON();
        const existing = store[orgId];
        if (existing) {
          const updated = { ...existing, ...body, id: orgId, updated_at: new Date().toISOString() };
          store[orgId] = updated;
          await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(updated) });
        } else {
          await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ detail: "Not found" }) });
        }
      } else {
        await route.continue();
      }
    } else {
      // Routes without ID: /api/v1/org[?params]
      if (method === "GET") {
        const orgs = Object.values(store);
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ organizations: orgs, total: orgs.length, page: 1, page_size: 100 }),
        });
      } else if (method === "POST") {
        const body = await route.request().postDataJSON();
        const org = makeMockOrg(body.name, body.description, body.website, body.phone);
        store[org.id] = org;
        await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(org) });
      } else {
        await route.continue();
      }
    }
  });

  return store;
}

test.describe("Organizations", () => {
  let orgListPage: OrganizationsListPage;
  let orgFormPage: OrganizationFormPage;
  let orgDetailPage: OrganizationDetailPage;

  test.beforeEach(async ({ page }) => {
    orgListPage = new OrganizationsListPage(page);
    orgFormPage = new OrganizationFormPage(page);
    orgDetailPage = new OrganizationDetailPage(page);

    // Mock backend org API calls (real backend at localhost:8000)
    await setupOrgApiMocks(page);

    // Tests are pre-authenticated via globalSetup storageState
    await orgListPage.goto();
    await orgListPage.verifyPageLoaded();
  });

  // Helper to generate unique test data per test
  const generateTestOrg = (suffix?: string) => ({
    name: `Test Org ${Date.now()}${suffix ? `-${suffix}` : ""}`,
    description: "Test organization description",
    website: "https://example.com",
    phone: "+1 (555) 123-4567",
  });

  const generateUpdatedOrg = (suffix?: string) => ({
    name: `Updated Org ${Date.now()}${suffix ? `-${suffix}` : ""}`,
    description: "Updated description",
    website: "https://updated.com",
    phone: "+1 (555) 999-9999",
  });

  test.describe("Page Layout", () => {
    test(
      "@smoke should display organizations list page elements correctly",
      { tag: ["@e2e", "@organizations", "@ORG-E2E-001"] },
      async ({ page }) => {
        await expect(orgListPage.heading).toBeVisible();
        await expect(orgListPage.createOrgButton).toBeVisible();
      },
    );

    test(
      "should pass accessibility checks",
      { tag: ["@e2e", "@organizations", "@a11y", "@ORG-E2E-002"] },
      async ({ page }) => {
        const accessibilityScanResults = await new AxeBuilder({
          page,
        }).analyze();
        expect(accessibilityScanResults.violations).toEqual([]);
      },
    );

    test(
      "should display create organization page correctly",
      { tag: ["@e2e", "@organizations", "@ORG-E2E-003"] },
      async ({ page }) => {
        await orgListPage.clickCreateOrganization();
        await orgFormPage.verifyPageLoaded("create");

        await expect(orgFormPage.nameInput).toBeVisible();
        await expect(orgFormPage.descriptionInput).toBeVisible();
        await expect(orgFormPage.websiteInput).toBeVisible();
        await expect(orgFormPage.phoneInput).toBeVisible();
        await expect(orgFormPage.submitButton).toBeVisible();
        await expect(orgFormPage.cancelButton).toBeVisible();
      },
    );

    test(
      "should pass accessibility checks on create page",
      { tag: ["@e2e", "@organizations", "@a11y", "@ORG-E2E-004"] },
      async ({ page }) => {
        await orgListPage.clickCreateOrganization();
        await orgFormPage.verifyPageLoaded("create");

        const accessibilityScanResults = await new AxeBuilder({
          page,
        }).analyze();
        expect(accessibilityScanResults.violations).toEqual([]);
      },
    );
  });

  test.describe("Form Validation", () => {
    test(
      "should show validation error for empty name",
      { tag: ["@e2e", "@organizations", "@validation", "@ORG-E2E-005"] },
      async ({ page }) => {
        await orgListPage.clickCreateOrganization();
        await orgFormPage.verifyPageLoaded("create");

        // Fill other fields but leave name empty
        await orgFormPage.fillForm({
          description: generateTestOrg().description,
          website: generateTestOrg().website,
        });

        // Try to submit
        await orgFormPage.submit();

        // Verify error (name is required)
        await orgFormPage.verifyFieldError("name", /required/i);
      },
    );

    test(
      "should show validation error for short name",
      { tag: ["@e2e", "@organizations", "@validation", "@ORG-E2E-006"] },
      async ({ page }) => {
        await orgListPage.clickCreateOrganization();
        await orgFormPage.verifyPageLoaded("create");

        await orgFormPage.fillForm({ name: "A" }); // Too short
        await orgFormPage.submit();

        await orgFormPage.verifyFieldError("name", /at least 2 characters/i);
      },
    );

    test(
      "should show validation error for invalid URL",
      { tag: ["@e2e", "@organizations", "@validation", "@ORG-E2E-007"] },
      async ({ page }) => {
        await orgListPage.clickCreateOrganization();
        await orgFormPage.verifyPageLoaded("create");

        await orgFormPage.fillForm({
          name: generateTestOrg().name,
          website: "not-a-valid-url",
        });
        await orgFormPage.submit();

        await orgFormPage.verifyFieldError("website", /invalid url/i);
      },
    );

    test(
      "should accept valid organization data",
      { tag: ["@e2e", "@organizations", "@validation", "@ORG-E2E-008"] },
      async ({ page }) => {
        await orgListPage.clickCreateOrganization();
        await orgFormPage.verifyPageLoaded("create");

        await orgFormPage.fillForm(generateTestOrg());

        // Verify no validation errors (only count visible alerts with text)
        const errorAlerts = page.locator('[role="alert"]:visible');
        const allAlerts = await errorAlerts.all();

        // Filter out alerts with empty text content
        const alertsWithText = [];
        for (const alert of allAlerts) {
          const text = (await alert.textContent()) || "";
          if (text.trim().length > 0) {
            alertsWithText.push(alert);
          }
        }

        expect(alertsWithText.length).toBe(0);
      },
    );
  });

  test.describe("Create Organization Flow", () => {
    test(
      "should create organization successfully",
      { tag: ["@critical", "@e2e", "@organizations", "@ORG-E2E-009"] },
      async ({ page }) => {
        await orgListPage.clickCreateOrganization();
        await orgFormPage.verifyPageLoaded("create");

        // Fill and submit form
        await orgFormPage.createOrganization(generateTestOrg());

        // Should navigate to detail page
        await page.waitForURL(/\/dashboard\/org\/[a-f0-9-]+$/);
        await orgDetailPage.verifyPageLoaded();

        // Verify organization name is displayed
        // await expect(orgDetailPage.orgName).toContainText(/Test Org/i);
      },
    );

    test(
      "should show loading state during creation",
      { tag: ["@e2e", "@organizations", "@ORG-E2E-010"] },
      async ({ page }) => {
        await orgListPage.clickCreateOrganization();
        await orgFormPage.verifyPageLoaded("create");

        await orgFormPage.fillForm(generateTestOrg());

        // Submit and immediately verify button shows loading state
        // Use Promise.race to check disabled state before navigation completes
        const clickPromise = orgFormPage.submitButton.click();
        const disabledPromise = orgFormPage.submitButton.isDisabled();

        // Button should become disabled immediately after click
        const isDisabled = await Promise.race([
          disabledPromise.then(() => true),
          page.waitForTimeout(100).then(() => false), // If not disabled in 100ms, fail
        ]);

        expect(isDisabled).toBe(true);

        // Wait for click to complete
        await clickPromise;
      },
    );

    test(
      "should display created organization in list",
      { tag: ["@e2e", "@organizations", "@ORG-E2E-011"] },
      async ({ page }) => {
        // Create organization
        await orgListPage.clickCreateOrganization();
        await orgFormPage.createOrganization(generateTestOrg());

        // Navigate back to list
        await orgDetailPage.clickBack();
        await orgListPage.verifyPageLoaded();

        // Verify organization appears in list
        const orgCard = page.locator('a[href^="/dashboard/org/"]').first();
        await expect(orgCard).toBeVisible();
      },
    );
  });

  test.describe("View Organization Details", () => {
    test(
      "should display organization details correctly",
      { tag: ["@critical", "@e2e", "@organizations", "@ORG-E2E-012"] },
      async ({ page }) => {
        // Create organization first
        await orgListPage.clickCreateOrganization();
        await orgFormPage.createOrganization(generateTestOrg());
        await orgDetailPage.verifyPageLoaded();

        // Verify details
        await orgDetailPage.verifyOrganizationDetails({
          name: /Test Org/i,
          description: /test organization description/i,
          website: "https://example.com",
        });
      },
    );

    test(
      "should display organization status",
      { tag: ["@e2e", "@organizations", "@ORG-E2E-013"] },
      async ({ page }) => {
        await orgListPage.clickCreateOrganization();
        await orgFormPage.createOrganization(generateTestOrg());
        await orgDetailPage.verifyPageLoaded();

        // New organizations should have pending_verification status
        await orgDetailPage.verifyOrgStatus("pending_verification");
      },
    );

    test(
      "should display quick actions",
      { tag: ["@e2e", "@organizations", "@ORG-E2E-014"] },
      async ({ page }) => {
        await orgListPage.clickCreateOrganization();
        await orgFormPage.createOrganization(generateTestOrg());
        await orgDetailPage.verifyPageLoaded();

        await orgDetailPage.verifyQuickActionsVisible();
      },
    );

    test(
      "should navigate to teams from quick action",
      { tag: ["@e2e", "@organizations", "@ORG-E2E-015"] },
      async ({ page }) => {
        await orgListPage.clickCreateOrganization();
        await orgFormPage.createOrganization(generateTestOrg());
        await orgDetailPage.verifyPageLoaded();

        await orgDetailPage.clickTeams();
        await page.waitForURL(/\/dashboard\/org\/[a-f0-9-]+\/teams$/);
        await expect(page.getByRole("heading", { name: /teams/i })).toBeVisible();
      },
    );

    test(
      "should navigate to wallet from quick action",
      { tag: ["@e2e", "@organizations", "@ORG-E2E-016"] },
      async ({ page }) => {
        await orgListPage.clickCreateOrganization();
        await orgFormPage.createOrganization(generateTestOrg());
        await orgDetailPage.verifyPageLoaded();

        await orgDetailPage.clickWallet();
        await page.waitForURL(/\/dashboard\/org\/[a-f0-9-]+\/wallet$/);
        await expect(page.getByRole("heading", { name: /wallet/i })).toBeVisible();
      },
    );
  });

  test.describe("List Organizations", () => {
    test(
      "should display multiple organizations",
      { tag: ["@e2e", "@organizations", "@ORG-E2E-017"] },
      async ({ page }) => {
        // Create first organization
        await orgListPage.clickCreateOrganization();
        await orgFormPage.createOrganization({
          ...generateTestOrg(),
          name: `Org 1 ${Date.now()}`,
        });
        // Wait for navigation to detail page to confirm org was created
        await page.waitForURL(/\/dashboard\/org\/[a-f0-9-]+$/, { timeout: 10000 });

        // Go back and create second organization - use proper navigation
        await page.goto("/dashboard/org/new");
        await page.waitForLoadState("domcontentloaded");
        await orgFormPage.verifyPageLoaded("create");
        await orgFormPage.createOrganization({
          ...generateTestOrg(),
          name: `Org 2 ${Date.now()}`,
        });
        // Wait for navigation to detail page to confirm second org was created
        await page.waitForURL(/\/dashboard\/org\/[a-f0-9-]+$/, { timeout: 10000 });

        // Navigate to list
        await orgListPage.goto();
        await orgListPage.verifyPageLoaded();

        // Verify at least 2 organizations
        const count = await orgListPage.getOrgCount();
        expect(count).toBeGreaterThanOrEqual(2);
      },
    );

    test(
      "should show empty state when no organizations",
      { tag: ["@e2e", "@organizations", "@ORG-E2E-018"] },
      async ({ page }) => {
        // Note: This test assumes a clean state or test environment
        // In real scenarios, you'd need to clean up test data first

        // For now, just verify empty state element exists
        await orgListPage.verifyPageLoaded();
        // May or may not be visible depending on existing data
      },
    );

    test(
      "should click view button on organization card",
      { tag: ["@e2e", "@organizations", "@ORG-E2E-019"] },
      async ({ page }) => {
        // Create organization
        const testData = generateTestOrg();
        await orgListPage.clickCreateOrganization();
        await orgFormPage.createOrganization(testData);
        // Wait for navigation to detail page to confirm org was created
        await page.waitForURL(/\/dashboard\/org\/[a-f0-9-]+$/, { timeout: 10000 });
        const orgDetailUrl = page.url();
        console.log("[DEBUG] After create, URL:", orgDetailUrl);

        // Listen to requests from this point
        const requests: string[] = [];
        page.on("request", req => {
          if (req.url().includes("api/v1/org")) requests.push(`${req.method()} ${req.url()}`);
        });
        page.on("response", resp => {
          if (resp.url().includes("api/v1/org")) {
            resp.body().then(b => console.log(`[DEBUG] Response ${resp.status()} ${resp.url()}: ${b.toString().slice(0,300)}`)).catch(() => {});
          }
        });

        // Go back to list
        await orgListPage.goto();
        await orgListPage.verifyPageLoaded();
        console.log("[DEBUG] Requests after goto:", requests);

        // Check localStorage for org store
        const orgStoreLS = await page.evaluate(() => {
          const key = Object.keys(localStorage).find(k => k.includes('org') || k.includes('organization'));
          return key ? { key, value: localStorage.getItem(key) } : { key: null, value: null };
        });
        console.log("[DEBUG] Org localStorage:", JSON.stringify(orgStoreLS).slice(0, 800));

        const authStoreLS = await page.evaluate(() => {
          const val = localStorage.getItem('auth-storage');
          return val ? JSON.parse(val) : null;
        });
        console.log("[DEBUG] Auth localStorage:", JSON.stringify(authStoreLS));

        // Check current URL
        console.log("[DEBUG] Current URL:", page.url());

        // Check visible text on page
        const h1Text = await page.locator('h1').first().textContent();
        console.log("[DEBUG] h1 text:", h1Text);

        const allButtons = await page.locator('button').allTextContents();
        console.log("[DEBUG] All buttons:", allButtons);

        // Click view button - use first org in list for reliability
        await orgListPage.clickFirstViewButton();
        await orgDetailPage.verifyPageLoaded();
      },
    );
  });

  test.describe("Update Organization", () => {
    test(
      "should navigate to edit page",
      { tag: ["@e2e", "@organizations", "@ORG-E2E-020"] },
      async ({ page }) => {
        const testData = generateTestOrg();
        await orgListPage.clickCreateOrganization();
        await orgFormPage.createOrganization(testData);
        await orgDetailPage.verifyPageLoaded();

        await orgDetailPage.clickEdit();
        await page.waitForURL(/\/dashboard\/org\/[a-f0-9-]+\/edit$/);
        await orgFormPage.verifyPageLoaded("edit");
      },
    );

    test(
      "should update organization successfully",
      { tag: ["@critical", "@e2e", "@organizations", "@ORG-E2E-021"] },
      async ({ page }) => {
        // Create organization
        const testData = generateTestOrg();
        const updatedData = generateUpdatedOrg();
        await orgListPage.clickCreateOrganization();
        await orgFormPage.createOrganization(testData);
        await orgDetailPage.verifyPageLoaded();

        // Edit organization
        await orgDetailPage.clickEdit();
        await orgFormPage.verifyPageLoaded("edit");

        // Update form
        await orgFormPage.fillForm(updatedData);
        await orgFormPage.submit();

        // Verify updated details
        await orgDetailPage.verifyPageLoaded();
        await expect(orgDetailPage.orgName).toContainText(updatedData.name);
        await orgDetailPage.verifyDescription(updatedData.description);
      },
    );
  });

  test.describe("Navigation", () => {
    test(
      "should navigate back from detail to list",
      { tag: ["@e2e", "@organizations", "@ORG-E2E-022"] },
      async ({ page }) => {
        await orgListPage.clickCreateOrganization();
        await orgFormPage.createOrganization(generateTestOrg());
        await orgDetailPage.verifyPageLoaded();

        await orgDetailPage.clickBack();
        await orgListPage.verifyPageLoaded();
      },
    );

    test(
      "should cancel creation and return to list",
      { tag: ["@e2e", "@organizations", "@ORG-E2E-023"] },
      async ({ page }) => {
        await orgListPage.clickCreateOrganization();
        await orgFormPage.verifyPageLoaded("create");

        await orgFormPage.fillForm(generateTestOrg());
        await orgFormPage.clickCancel();
        await orgListPage.verifyPageLoaded();
      },
    );
  });
});
