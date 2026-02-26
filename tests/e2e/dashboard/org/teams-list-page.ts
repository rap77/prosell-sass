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
    this.backButton = page.getByRole("button", { name: "" }).filter({ hasText: /←|back/i });

    // Buttons
    this.createTeamButton = page.getByRole("button", { name: /create team/i });

    // Team cards
    this.teamCards = page.locator(
      'div[class*="rounded-lg border"][class*="hover:border"]'
    );

    // States
    this.emptyStateMessage = page.getByText(/you don't have any teams yet/i);
    this.loadingSpinner = page.locator('.animate-spin');

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
   */
  async verifyPageLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
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
