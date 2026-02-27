/**
 * TeamDetailPage - Page Object Model
 *
 * Encapsulates team detail page interactions and selectors.
 */

import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "../../base-page";

export class TeamDetailPage extends BasePage {
  // Selectors
  readonly heading: Locator;
  readonly teamName: Locator;
  readonly backButton: Locator;
  readonly editButton: Locator;

  constructor(page: Page) {
    super(page);

    // Header
    this.heading = page.getByRole("heading", { name: /team details/i });
    this.teamName = page.getByRole("heading", { level: 2 });

    // Buttons
    this.backButton = page.getByRole("button", { name: /back/i });
    this.editButton = page.getByRole("button", { name: /edit/i });
  }

  /**
   * Navigate to team detail page
   */
  async goto(orgId: string, teamId: string): Promise<void> {
    await super.goto(`/dashboard/org/${orgId}/teams/${teamId}`);
  }

  /**
   * Verify team detail page is loaded
   */
  async verifyPageLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }

  /**
   * Get team name
   */
  async getTeamName(): Promise<string | null> {
    return await this.teamName.textContent();
  }

  /**
   * Click back button
   */
  async clickBack(): Promise<void> {
    await this.backButton.click();
  }

  /**
   * Click edit button
   */
  async clickEdit(): Promise<void> {
    await this.editButton.click();
  }
}
