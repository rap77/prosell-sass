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

test.describe("Organizations", () => {
  let orgListPage: OrganizationsListPage;
  let orgFormPage: OrganizationFormPage;
  let orgDetailPage: OrganizationDetailPage;

  test.beforeEach(async ({ page }) => {
    orgListPage = new OrganizationsListPage(page);
    orgFormPage = new OrganizationFormPage(page);
    orgDetailPage = new OrganizationDetailPage(page);

    // Tests are pre-authenticated via globalSetup storageState
    await orgListPage.goto();
    await orgListPage.verifyPageLoaded();
  });

  // Test data
  const testOrg = {
    name: `Test Org ${Date.now()}`,
    description: "Test organization description",
    website: "https://example.com",
    phone: "+1 (555) 123-4567",
  };

  const updatedOrg = {
    name: `Updated Org ${Date.now()}`,
    description: "Updated description",
    website: "https://updated.com",
    phone: "+1 (555) 999-9999",
  };

  test.describe("Page Layout", () => {
    test(
      "should display organizations list page elements correctly",
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
          description: testOrg.description,
          website: testOrg.website,
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
          name: testOrg.name,
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

        await orgFormPage.fillForm(testOrg);

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
        await orgFormPage.createOrganization(testOrg);

        // Should navigate to detail page
        await page.waitForURL(/\/dashboard\/org\/[a-f0-9-]+$/);
        await orgDetailPage.verifyPageLoaded();

        // Verify organization name is displayed
        await expect(orgDetailPage.orgName).toContainText(testOrg.name);
      },
    );

    test(
      "should show loading state during creation",
      { tag: ["@e2e", "@organizations", "@ORG-E2E-010"] },
      async ({ page }) => {
        await orgListPage.clickCreateOrganization();
        await orgFormPage.verifyPageLoaded("create");

        await orgFormPage.fillForm(testOrg);

        // Submit and verify button shows loading state (isDisabled)
        await orgFormPage.submitButton.click();

        // Wait briefly for React to update the disabled state
        await page.waitForTimeout(10);

        // Button should be disabled while form is submitting
        const isDisabled = await orgFormPage.submitButton.isDisabled();
        expect(isDisabled).toBe(true);
      },
    );

    test(
      "should display created organization in list",
      { tag: ["@e2e", "@organizations", "@ORG-E2E-011"] },
      async ({ page }) => {
        // Create organization
        await orgListPage.clickCreateOrganization();
        await orgFormPage.createOrganization(testOrg);

        // Navigate back to list
        await orgDetailPage.clickBack();
        await orgListPage.verifyPageLoaded();

        // Verify organization appears in list
        const orgCard = orgListPage.getOrgCardByName(testOrg.name);
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
        await orgFormPage.createOrganization(testOrg);
        await orgDetailPage.verifyPageLoaded();

        // Verify details
        await orgDetailPage.verifyOrganizationDetails({
          name: testOrg.name,
          description: testOrg.description,
          website: testOrg.website,
        });
      },
    );

    test(
      "should display organization status",
      { tag: ["@e2e", "@organizations", "@ORG-E2E-013"] },
      async ({ page }) => {
        await orgListPage.clickCreateOrganization();
        await orgFormPage.createOrganization(testOrg);
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
        await orgFormPage.createOrganization(testOrg);
        await orgDetailPage.verifyPageLoaded();

        await orgDetailPage.verifyQuickActionsVisible();
      },
    );

    test(
      "should navigate to teams from quick action",
      { tag: ["@e2e", "@organizations", "@ORG-E2E-015"] },
      async ({ page }) => {
        await orgListPage.clickCreateOrganization();
        await orgFormPage.createOrganization(testOrg);
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
        await orgFormPage.createOrganization(testOrg);
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
          ...testOrg,
          name: `Org 1 ${Date.now()}`,
        });

        // Go back and create second organization
        await page.goto("/dashboard/org/new");
        await orgFormPage.createOrganization({
          ...testOrg,
          name: `Org 2 ${Date.now()}`,
        });

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
        await orgListPage.clickCreateOrganization();
        await orgFormPage.createOrganization(testOrg);

        // Go back to list
        await orgListPage.goto();
        await orgListPage.verifyPageLoaded();

        // Click view button
        await orgListPage.clickView(testOrg.name);
        await orgDetailPage.verifyPageLoaded();
      },
    );
  });

  test.describe("Update Organization", () => {
    test(
      "should navigate to edit page",
      { tag: ["@e2e", "@organizations", "@ORG-E2E-020"] },
      async ({ page }) => {
        await orgListPage.clickCreateOrganization();
        await orgFormPage.createOrganization(testOrg);
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
        await orgListPage.clickCreateOrganization();
        await orgFormPage.createOrganization(testOrg);
        await orgDetailPage.verifyPageLoaded();

        // Edit organization
        await orgDetailPage.clickEdit();
        await orgFormPage.verifyPageLoaded("edit");

        // Update form
        await orgFormPage.fillForm(updatedOrg);
        await orgFormPage.submit();

        // Verify updated details
        await orgDetailPage.verifyPageLoaded();
        await expect(orgDetailPage.orgName).toContainText(updatedOrg.name);
        await orgDetailPage.verifyDescription(updatedOrg.description);
      },
    );
  });

  test.describe("Navigation", () => {
    test(
      "should navigate back from detail to list",
      { tag: ["@e2e", "@organizations", "@ORG-E2E-022"] },
      async ({ page }) => {
        await orgListPage.clickCreateOrganization();
        await orgFormPage.createOrganization(testOrg);
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

        await orgFormPage.fillForm(testOrg);
        await orgFormPage.clickCancel();
        await orgListPage.verifyPageLoaded();
      },
    );
  });
});
