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
    this.createOrgButton = page.getByRole("button", {
      name: /create organization/i,
    });

    // Organization cards - use links that point to org detail pages
    // Matches the pattern /dashboard/org/{uuid} without sub-paths like /edit, /wallet
    this.orgCards = page.locator('a[href^="/dashboard/org/"]').filter({
      hasNot: page.locator(
        '[href$="/edit"], [href$="/wallet"], [href$="/members"], [href$="/teams"]',
      ),
    });

    // States
    this.emptyStateMessage = page.getByText(
      /you don't have any organizations yet/i,
    );
    this.loadingSpinner = page.locator(".animate-spin");

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
    // Wait for page to be ready
    await this.page.waitForLoadState("domcontentloaded");
    // Verify the heading is visible with increased timeout
    await expect(this.heading).toBeVisible({ timeout: 10000 });
    // Wait for loading spinner to disappear (indicates data fetch completed)
    await this.page
      .waitForSelector(".animate-spin", { state: "hidden", timeout: 5000 })
      .catch(() => {});
    // Brief pause to ensure re-render completes
    await this.page.waitForTimeout(100);
  }

  /**
   * Click create organization button
   */
  async clickCreateOrganization(): Promise<void> {
    await this.createOrgButton.click({ force: true });
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
    // Wait for navigation to complete (Next.js client-side routing)
    await this.page.waitForLoadState("domcontentloaded");
    await this.page.waitForTimeout(100);
  }

  /**
   * Get view button for organization
   */
  getViewButton(name: string): Locator {
    // Find the org link, navigate to parent container, then find View button
    const orgLink = this.page.getByRole("link", { name });
    const cardContainer = orgLink
      .locator("..")
      .locator("..")
      .locator("..")
      .locator("..");
    return cardContainer.getByRole("button", { name: /view/i });
  }

  /**
   * Click view button for organization
   */
  async clickView(name: string): Promise<void> {
    const viewButton = this.getViewButton(name);
    await viewButton.click({ force: true });
    // Wait for navigation to complete (Next.js client-side routing)
    await this.page.waitForLoadState("domcontentloaded");
    await this.page.waitForTimeout(100);
  }

  /**
   * Click first view button in the list
   */
  async clickFirstViewButton(): Promise<void> {
    // Get the first View button in the list
    const firstViewButton = this.page
      .getByRole("button", { name: /view/i })
      .first();
    await firstViewButton.click({ force: true });
    // Wait for navigation to complete
    await this.page.waitForLoadState("domcontentloaded");
    await this.page.waitForTimeout(100);
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
    await this.page.waitForLoadState("load");
  }

  /**
   * Click previous pagination button
   */
  async clickPrevious(): Promise<void> {
    await this.previousButton.click();
    await this.page.waitForLoadState("load");
  }
}
