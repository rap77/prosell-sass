/**
 * OrganizationsListPage - Page Object Model
 *
 * Encapsulates organizations list page interactions and selectors.
 * Following Playwright best practices with proper locators.
 */

import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "../../base-page";

export class OrganizationsListPage extends BasePage {
  // Selectors
  readonly heading: Locator;
  readonly createOrgButton: Locator;
  readonly orgCards: Locator;
  readonly emptyStateMessage: Locator;
  readonly loadingSpinner: Locator;
  readonly paginationInfo: Locator;
  readonly previousButton: Locator;
  readonly nextButton: Locator;

  constructor(page: Page) {
    super(page);

    // Heading
    this.heading = page.getByRole("heading", { name: /organizations/i });

    // Buttons
    this.createOrgButton = page.getByRole("button", { name: /create organization/i });

    // Organization cards
    this.orgCards = page.locator(
      'div[class*="rounded-lg border"][class*="hover:border"]'
    );

    // States
    this.emptyStateMessage = page.getByText(/you don't have any organizations yet/i);
    this.loadingSpinner = page.locator('.animate-spin');

    // Pagination
    this.paginationInfo = page.getByText(/showing \d+ of \d+ organizations/i);
    this.previousButton = page.getByRole("button", { name: /previous/i });
    this.nextButton = page.getByRole("button", { name: /next/i });
  }

  /**
   * Navigate to organizations list page
   */
  async goto(): Promise<void> {
    await super.goto("/dashboard/org");
  }

  /**
   * Verify organizations list page is loaded
   */
  async verifyPageLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }

  /**
   * Click create organization button
   */
  async clickCreateOrganization(): Promise<void> {
    await this.createOrgButton.click();
  }

  /**
   * Get organization card by name
   */
  getOrgCardByName(name: string): Locator {
    return this.page.getByRole("link", { name }).first();
  }

  /**
   * Click on organization by name
   */
  async clickOrgByName(name: string): Promise<void> {
    const orgLink = this.getOrgCardByName(name);
    await orgLink.click();
  }

  /**
   * Get view button for organization
   */
  getViewButton(name: string): Locator {
    return this.page
      .locator('div[class*="rounded-lg border"]')
      .filter({ hasText: name })
      .getByRole("button", { name: /view/i });
  }

  /**
   * Click view button for organization
   */
  async clickView(name: string): Promise<void> {
    const viewButton = this.getViewButton(name);
    await viewButton.click();
  }

  /**
   * Get organization count
   */
  async getOrgCount(): Promise<number> {
    return await this.orgCards.count();
  }

  /**
   * Verify empty state is shown
   */
  async verifyEmptyState(): Promise<void> {
    await expect(this.emptyStateMessage).toBeVisible();
  }

  /**
   * Verify loading state is shown
   */
  async verifyLoadingState(): Promise<void> {
    await expect(this.loadingSpinner).toBeVisible();
  }

  /**
   * Click next pagination button
   */
  async clickNext(): Promise<void> {
    await this.nextButton.click();
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Click previous pagination button
   */
  async clickPrevious(): Promise<void> {
    await this.previousButton.click();
    await this.page.waitForLoadState("networkidle");
  }
}
