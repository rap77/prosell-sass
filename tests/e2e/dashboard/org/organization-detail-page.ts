/**
 * OrganizationDetailPage - Page Object Model
 *
 * Encapsulates organization detail page interactions and selectors.
 * Following Playwright best practices with proper locators.
 */

import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "../../base-page";

export class OrganizationDetailPage extends BasePage {
  // Selectors
  readonly heading: Locator;
  readonly backButton: Locator;
  readonly editButton: Locator;
  readonly orgName: Locator;
  readonly orgStatus: Locator;
  readonly orgId: Locator;
  readonly teamsQuickAction: Locator;
  readonly walletQuickAction: Locator;
  readonly description: Locator;
  readonly website: Locator;
  readonly phone: Locator;
  readonly createdAt: Locator;
  readonly verifiedAt: Locator;

  constructor(page: Page) {
    super(page);

    // Header
    this.heading = page.getByRole("heading", { name: /organization details/i });
    this.backButton = page.getByRole("button", { name: /← back/i });
    this.editButton = page.getByRole("button", { name: /edit/i });

    // Organization info
    this.orgName = page.getByRole("heading", { level: 2 });
    this.orgStatus = page.locator('span[class*="rounded-full text-xs"]');
    this.orgId = page.getByText(/id: /i);

    // Quick actions
    this.teamsQuickAction = page.getByRole("button", { name: /teams/i });
    this.walletQuickAction = page.getByRole("button", { name: /wallet/i });

    // Details
    this.description = page.getByText(/description/i);
    this.website = page.getByRole("link", { name: /^https?:\/\//i });
    this.phone = page.getByText(/phone/i);
    this.createdAt = page.getByText(/created/i);
    this.verifiedAt = page.getByText(/verified/i);
  }

  /**
   * Navigate to organization detail page
   */
  async goto(orgId: string): Promise<void> {
    await super.goto(`/dashboard/org/${orgId}`);
  }

  /**
   * Verify organization detail page is loaded
   */
  async verifyPageLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }

  /**
   * Get organization name
   */
  async getOrgName(): Promise<string | null> {
    return await this.orgName.textContent();
  }

  /**
   * Get organization status
   */
  async getOrgStatus(): Promise<string | null> {
    return await this.orgStatus.textContent();
  }

  /**
   * Verify organization status
   */
  async verifyOrgStatus(expectedStatus: string): Promise<void> {
    const statusText = expectedStatus.replace(/_/g, " ").toLowerCase();
    await expect(this.orgStatus).toContainText(statusText, {
      ignoreCase: true,
    });
  }

  /**
   * Click edit button
   */
  async clickEdit(): Promise<void> {
    await this.editButton.click({ force: true });
    // Wait for navigation to complete (Next.js client-side routing)
    await this.page.waitForLoadState("domcontentloaded");
    await this.page.waitForTimeout(100);
  }

  /**
   * Click back button
   */
  async clickBack(): Promise<void> {
    await this.backButton.click({ force: true });
    // Wait for navigation to complete (Next.js client-side routing)
    await this.page.waitForLoadState("domcontentloaded");
    await this.page.waitForTimeout(100);
  }

  /**
   * Click teams quick action
   */
  async clickTeams(): Promise<void> {
    await this.teamsQuickAction.click();
    // Wait for navigation to complete (Next.js client-side routing)
    await this.page.waitForLoadState("domcontentloaded");
    await this.page.waitForTimeout(100);
  }

  /**
   * Click wallet quick action
   */
  async clickWallet(): Promise<void> {
    await this.walletQuickAction.click();
    // Wait for navigation to complete (Next.js client-side routing)
    await this.page.waitForLoadState("domcontentloaded");
    await this.page.waitForTimeout(100);
  }

  /**
   * Verify organization details are displayed
   */
  async verifyOrganizationDetails(data: {
    name: string;
    description?: string;
    website?: string;
    phone?: string;
  }): Promise<void> {
    await expect(this.orgName).toContainText(data.name);

    if (data.description) {
      await expect(this.page.getByText(data.description)).toBeVisible();
    }

    if (data.website) {
      await expect(this.website).toHaveAttribute("href", data.website);
    }

    if (data.phone) {
      await expect(this.page.getByText(data.phone)).toBeVisible();
    }
  }

  /**
   * Verify quick actions are visible
   */
  async verifyQuickActionsVisible(): Promise<void> {
    await expect(this.teamsQuickAction).toBeVisible();
    await expect(this.walletQuickAction).toBeVisible();
  }

  /**
   * Verify description section
   */
  async verifyDescription(description: string): Promise<void> {
    await expect(this.page.getByText(description)).toBeVisible();
  }
}
