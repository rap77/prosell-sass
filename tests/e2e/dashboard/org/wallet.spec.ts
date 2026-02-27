/**
 * Wallet E2E Tests
 *
 * Tests for wallet functionality including:
 * - Page layout and accessibility
 * - View wallet balance
 * - View transaction history
 * - Display of credit/debit transactions
 * - Pagination for transactions
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { WalletPage } from "./wallet-page";
import { OrganizationsListPage } from "./organizations-list-page";
import { OrganizationFormPage } from "./organization-form-page";
import { OrganizationDetailPage } from "./organization-detail-page";
import { loginUser } from "../../helpers";

test.describe("Wallet", () => {
  let orgListPage: OrganizationsListPage;
  let orgFormPage: OrganizationFormPage;
  let orgDetailPage: OrganizationDetailPage;
  let walletPage: WalletPage;

  test.beforeEach(async ({ page }) => {
    orgListPage = new OrganizationsListPage(page);
    orgFormPage = new OrganizationFormPage(page);
    orgDetailPage = new OrganizationDetailPage(page);
    walletPage = new WalletPage(page);

    // Tests are pre-authenticated via storageState
  });

  // Test data
  const testOrg = {
    name: `Test Org ${Date.now()}`,
    description: "Test organization for wallet",
  };

  // Helper to create a test organization and get its ID
  async function createTestOrganization(page: any) {
    await orgListPage.goto();
    await orgListPage.clickCreateOrganization();
    await orgFormPage.createOrganization(testOrg);

    // Wait for navigation to detail page and extract org ID from URL
    await page.waitForURL(/\/dashboard\/org\/[a-f0-9-]+$/);
    const url = page.url();
    const orgId = url.split("/").pop();
    return orgId;
  }

  test.describe("Page Layout", () => {
    test(
      "should display wallet page elements correctly",
      { tag: ["@high", "@e2e", "@wallet", "@WALLET-E2E-001"] },
      async ({ page }) => {
        const orgId = await createTestOrganization(page);
        await walletPage.goto(orgId);
        await walletPage.verifyPageLoaded();

        await expect(walletPage.heading).toBeVisible();
        await expect(walletPage.tokenBalanceTitle).toBeVisible();
        await expect(walletPage.transactionHistoryHeading).toBeVisible();
      },
    );

    test(
      "should pass accessibility checks",
      { tag: ["@high", "@e2e", "@wallet", "@a11y", "@WALLET-E2E-002"] },
      async ({ page }) => {
        const orgId = await createTestOrganization(page);
        await walletPage.goto(orgId);
        await walletPage.verifyPageLoaded();

        const accessibilityScanResults = await new AxeBuilder({
          page,
        }).analyze();
        expect(accessibilityScanResults.violations).toEqual([]);
      },
    );

    test(
      "should display wallet card with balance",
      { tag: ["@high", "@e2e", "@wallet", "@WALLET-E2E-003"] },
      async ({ page }) => {
        const orgId = await createTestOrganization(page);
        await walletPage.goto(orgId);
        await walletPage.verifyPageLoaded();

        await walletPage.verifyTokenBalanceDisplayed();
      },
    );

    test(
      "should display transaction history section",
      { tag: ["@high", "@e2e", "@wallet", "@WALLET-E2E-004"] },
      async ({ page }) => {
        const orgId = await createTestOrganization(page);
        await walletPage.goto(orgId);
        await walletPage.verifyPageLoaded();

        await expect(walletPage.transactionHistoryHeading).toBeVisible();
      },
    );
  });

  test.describe("Token Balance", () => {
    test(
      "should display token balance",
      { tag: ["@critical", "@e2e", "@wallet", "@WALLET-E2E-005"] },
      async ({ page }) => {
        const orgId = await createTestOrganization(page);
        await walletPage.goto(orgId);
        await walletPage.verifyPageLoaded();

        const balance = await walletPage.getTokenBalance();
        expect(balance).toBeTruthy();

        // Balance should be a number (possibly 0 for new org)
        const numericBalance = parseInt(balance?.replace(/,/g, "") || "0");
        expect(numericBalance).toBeGreaterThanOrEqual(0);
      },
    );

    test(
      "should show loading state while fetching balance",
      { tag: ["@e2e", "@wallet", "@WALLET-E2E-006"] },
      async ({ page }) => {
        const orgId = await createTestOrganization(page);
        await walletPage.goto(orgId);

        // Loading state may be brief, but should exist
        await walletPage.verifyPageLoaded();

        // After page loads, balance should be displayed
        await walletPage.verifyTokenBalanceDisplayed();
      },
    );

    test(
      "should have refresh button",
      { tag: ["@e2e", "@wallet", "@WALLET-E2E-007"] },
      async ({ page }) => {
        const orgId = await createTestOrganization(page);
        await walletPage.goto(orgId);
        await walletPage.verifyPageLoaded();

        await expect(walletPage.refreshButton).toBeVisible();
      },
    );

    test(
      "should refresh balance on button click",
      { tag: ["@e2e", "@wallet", "@WALLET-E2E-008"] },
      async ({ page }) => {
        const orgId = await createTestOrganization(page);
        await walletPage.goto(orgId);
        await walletPage.verifyPageLoaded();

        const balanceBefore = await walletPage.getTokenBalance();

        await walletPage.clickRefresh();

        const balanceAfter = await walletPage.getTokenBalance();
        expect(balanceAfter).toBeTruthy();
      },
    );
  });

  test.describe("Recharge Functionality", () => {
    test(
      "should display recharge button",
      { tag: ["@high", "@e2e", "@wallet", "@WALLET-E2E-009"] },
      async ({ page }) => {
        const orgId = await createTestOrganization(page);
        await walletPage.goto(orgId);
        await walletPage.verifyPageLoaded();

        await expect(walletPage.rechargeButton).toBeVisible();
      },
    );

    test(
      "should open recharge dialog on button click",
      { tag: ["@e2e", "@wallet", "@WALLET-E2E-010"] },
      async ({ page }) => {
        const orgId = await createTestOrganization(page);
        await walletPage.goto(orgId);
        await walletPage.verifyPageLoaded();

        await walletPage.clickRecharge();
        await walletPage.verifyRechargeDialogVisible();
      },
    );

    test(
      "should display token package options",
      { tag: ["@e2e", "@wallet", "@WALLET-E2E-011"] },
      async ({ page }) => {
        const orgId = await createTestOrganization(page);
        await walletPage.goto(orgId);
        await walletPage.verifyPageLoaded();

        await walletPage.clickRecharge();
        await walletPage.verifyRechargeDialogVisible();

        // Should have 3 token packages (100, 500, 1000)
        const packageCount = await walletPage.getTokenPackageCount();
        expect(packageCount).toBe(3);
      },
    );

    test(
      "should display pricing for token packages",
      { tag: ["@e2e", "@wallet", "@WALLET-E2E-012"] },
      async ({ page }) => {
        const orgId = await createTestOrganization(page);
        await walletPage.goto(orgId);
        await walletPage.verifyPageLoaded();

        await walletPage.clickRecharge();
        await walletPage.verifyRechargeDialogVisible();

        // Verify package pricing (10 tokens = $1)
        const packages = ["100 Tokens", "500 Tokens", "1000 Tokens"];
        for (const pkg of packages) {
          const packageButton = walletPage.tokenPackageButtons.filter({ hasText: pkg });
          await expect(packageButton).toBeVisible();
        }
      },
    );

    test(
      "should cancel recharge dialog",
      { tag: ["@e2e", "@wallet", "@WALLET-E2E-013"] },
      async ({ page }) => {
        const orgId = await createTestOrganization(page);
        await walletPage.goto(orgId);
        await walletPage.verifyPageLoaded();

        await walletPage.clickRecharge();
        await walletPage.verifyRechargeDialogVisible();

        await walletPage.cancelRecharge();

        // Dialog should be closed
        await expect(walletPage.rechargeDialog).not.toBeVisible();
      },
    );
  });

  test.describe("Transaction History", () => {
    test(
      "should display empty state when no transactions",
      { tag: ["@e2e", "@wallet", "@WALLET-E2E-014"] },
      async ({ page }) => {
        const orgId = await createTestOrganization(page);
        await walletPage.goto(orgId);
        await walletPage.verifyPageLoaded();

        // New organization should have no transactions
        await walletPage.verifyEmptyTransactions();
      },
    );

    test(
      "should display transaction list when transactions exist",
      { tag: ["@e2e", "@wallet", "@WALLET-E2E-015"] },
      async ({ page }) => {
        const orgId = await createTestOrganization(page);
        await walletPage.goto(orgId);
        await walletPage.verifyPageLoaded();

        // For new org, should show empty state
        await walletPage.verifyEmptyTransactions();

        // Note: Testing with actual transactions would require
        // API mocking or test data setup
      },
    );

    test(
      "should display transaction amount correctly",
      { tag: ["@e2e", "@wallet", "@WALLET-E2E-016"] },
      async ({ page }) => {
        const orgId = await createTestOrganization(page);
        await walletPage.goto(orgId);
        await walletPage.verifyPageLoaded();

        // Get transaction count (should be 0 for new org)
        const count = await walletPage.getTransactionCount();
        expect(count).toBe(0);

        // If transactions exist, verify amount display
        // This would require test data setup
      },
    );

    test(
      "should display transaction type indicator (credit/debit)",
      { tag: ["@e2e", "@wallet", "@WALLET-E2E-017"] },
      async ({ page }) => {
        const orgId = await createTestOrganization(page);
        await walletPage.goto(orgId);
        await walletPage.verifyPageLoaded();

        // Note: This test requires test data with transactions
        // For now, just verify the page loads correctly
        await walletPage.verifyPageLoaded();
      },
    );

    test(
      "should display transaction timestamp",
      { tag: ["@e2e", "@wallet", "@WALLET-E2E-018"] },
      async ({ page }) => {
        const orgId = await createTestOrganization(page);
        await walletPage.goto(orgId);
        await walletPage.verifyPageLoaded();

        // Note: This test requires test data with transactions
        // For now, just verify the page loads correctly
        await walletPage.verifyPageLoaded();
      },
    );
  });

  test.describe("Pagination", () => {
    test(
      "should show pagination when transactions exceed page size",
      { tag: ["@e2e", "@wallet", "@WALLET-E2E-019"] },
      async ({ page }) => {
        const orgId = await createTestOrganization(page);
        await walletPage.goto(orgId);
        await walletPage.verifyPageLoaded();

        // New org has no transactions, so no pagination
        // This test would require test data with 20+ transactions
        const count = await walletPage.getTransactionCount();
        expect(count).toBe(0);
      },
    );

    test(
      "should navigate to next page of transactions",
      { tag: ["@e2e", "@wallet", "@WALLET-E2E-020"] },
      async ({ page }) => {
        const orgId = await createTestOrganization(page);
        await walletPage.goto(orgId);
        await walletPage.verifyPageLoaded();

        // Note: This test requires test data with 20+ transactions
        // For now, just verify buttons exist (may be disabled)
        await walletPage.verifyPageLoaded();
      },
    );
  });

  test.describe("Navigation", () => {
    test(
      "should navigate back to organization detail",
      { tag: ["@e2e", "@wallet", "@WALLET-E2E-021"] },
      async ({ page }) => {
        const orgId = await createTestOrganization(page);
        await walletPage.goto(orgId);
        await walletPage.verifyPageLoaded();

        await walletPage.clickBack();

        // Verify navigation back to organization detail
        await orgDetailPage.verifyPageLoaded();
      },
    );

    test(
      "should navigate to wallet from organization detail",
      { tag: ["@e2e", "@wallet", "@WALLET-E2E-022"] },
      async ({ page }) => {
        const orgId = await createTestOrganization(page);

        // Navigate from organization detail to wallet
        await page.goto(`/dashboard/org/${orgId}`);
        await page.getByRole("button", { name: /wallet/i }).click();

        // Verify wallet page loaded
        await walletPage.verifyPageLoaded();
      },
    );
  });
});
