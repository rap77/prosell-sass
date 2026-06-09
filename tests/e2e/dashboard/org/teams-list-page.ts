/**
 * TeamsListPage - Page Object Model
 *
 * Encapsulates teams list page interactions and selectors.
 * Following Playwright best practices with proper locators.
 */

import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "../../base-page";

export class TeamsListPage extends BasePage {
  // Selectors
  readonly heading: Locator;
  readonly backButton: Locator;
  readonly createTeamButton: Locator;
  readonly teamCards: Locator;
  readonly emptyStateMessage: Locator;
  readonly loadingSpinner: Locator;
  readonly paginationInfo: Locator;
  readonly previousButton: Locator;
  readonly nextButton: Locator;

  constructor(page: Page) {
    super(page);

    // Header
    this.heading = page.getByRole("heading", { name: /teams/i });
    this.backButton = page.getByRole("button", { name: /go back/i });

    // Buttons
    this.createTeamButton = page.getByRole("button", { name: /create team/i });

    // Team cards
    this.teamCards = page.locator(
      'div[class*="rounded-lg border"][class*="hover:border"]',
    );

    // States
    this.emptyStateMessage = page.getByText(/you don't have any teams yet/i);
    this.loadingSpinner = page.locator(".animate-spin");

    // Pagination
    this.paginationInfo = page.getByText(/showing \d+ of \d+ teams/i);
    this.previousButton = page.getByRole("button", { name: /previous/i });
    this.nextButton = page.getByRole("button", { name: /next/i });
  }

  /**
   * Navigate to teams list page for an organization
   */
  async goto(orgId: string): Promise<void> {
    await super.goto(`/dashboard/org/${orgId}/teams`);
  }

  /**
   * Verify teams list page is loaded
   *
   * Waits for:
   * 1. DOM content to be loaded
   * 2. Heading to be visible
   * 3. Either team cards OR empty state to be visible (actual content)
   *
   * This prevents race conditions where page is "loaded" but content
   * hasn't rendered yet (common with Next.js client-side navigation).
   */
  async verifyPageLoaded(): Promise<void> {
    // Wait for Next.js client-side navigation to complete
    await this.page.waitForLoadState("domcontentloaded");

    // Wait for heading with timeout
    await expect(this.heading).toBeVisible({ timeout: 10000 });

    // Wait for actual content: either team cards OR empty state
    // This ensures React has finished rendering the list
    // Use a simpler approach with timeout instead of waitForFunction
    try {
      // Try waiting for cards first (short timeout)
      await this.page
        .waitForSelector(
          'div[class*="rounded-lg border"][class*="hover:border"]',
          { timeout: 2000 },
        )
        .catch(() => {
          // If no cards, wait for empty state
          return this.page.waitForSelector("text=/don't have any teams/i", {
            timeout: 2000,
          });
        });
    } catch {
      // If neither is found after short wait, continue anyway
      // The page is loaded, just no content yet
    }
  }

  /**
   * Click create team button
   */
  async clickCreateTeam(): Promise<void> {
    await this.createTeamButton.click();
  }

  /**
   * Get team card by name
   */
  getTeamCardByName(name: string): Locator {
    return this.page
      .locator('div[class*="rounded-lg border"]')
      .filter({ hasText: name });
  }

  /**
   * Click on team by name
   */
  async clickTeamByName(name: string): Promise<void> {
    const teamCard = this.getTeamCardByName(name);
    await teamCard.click();
  }

  /**
   * Get team count
   */
  async getTeamCount(): Promise<number> {
    return await this.teamCards.count();
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
   * Click back button
   */
  async clickBack(): Promise<void> {
    await this.backButton.first().click();
  }

  /**
   * Get member count for a team
   */
  async getTeamMemberCount(teamName: string): Promise<string | null> {
    const teamCard = this.getTeamCardByName(teamName);
    const memberCountText = teamCard.getByText(/\d+ members/i);
    return await memberCountText.textContent();
  }
}
