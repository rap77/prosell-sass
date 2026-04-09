/**
 * TeamFormPage - Page Object Model
 *
 * Encapsulates team form interactions for create/edit.
 * Following Playwright best practices with proper locators.
 */

import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "../../base-page";

export interface TeamFormData {
  name: string;
}

export type TeamFormMode = "create" | "edit";

export class TeamFormPage extends BasePage {
  // Selectors
  readonly heading: Locator;
  readonly nameInput: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    super(page);

    // Heading
    this.heading = page.getByRole("heading", {
      name: /create team/i,
    });

    // Form inputs
    this.nameInput = page.locator("#name");

    // Buttons
    this.submitButton = page.getByRole("button", {
      name: /create team|save changes/i,
    });
    this.cancelButton = page.getByRole("button", { name: /cancel/i });
  }

  /**
   * Navigate to create team page for an organization
   */
  async gotoCreate(orgId: string): Promise<void> {
    await super.goto(`/dashboard/org/${orgId}/teams/new`);
  }

  /**
   * Navigate to edit team page
   */
  async gotoEdit(orgId: string, teamId: string): Promise<void> {
    await super.goto(`/dashboard/org/${orgId}/teams/${teamId}/edit`);
  }

  /**
   * Verify form page is loaded
   */
  async verifyPageLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }

  /**
   * Fill team form
   */
  async fillForm(data: TeamFormData): Promise<void> {
    if (data.name) {
      await this.nameInput.fill(data.name);
      await this.nameInput.blur(); // Trigger validation
    }
  }

  /**
   * Submit the form
   */
  async submit(): Promise<void> {
    await this.submitButton.click();
    await this.page.waitForLoadState("load");
  }

  /**
   * Fill and submit team form
   */
  async createTeam(data: TeamFormData): Promise<void> {
    await this.fillForm(data);
    await this.submit();
  }

  /**
   * Click cancel button
   */
  async clickCancel(): Promise<void> {
    await this.cancelButton.click();
  }

  /**
   * Verify field error is shown
   */
  async verifyFieldError(fieldName: string, errorMessage: string): Promise<void> {
    const fieldError = this.page.getByText(errorMessage);
    await expect(fieldError).toBeVisible();
  }

  /**
   * Verify submit button is disabled
   */
  async verifySubmitDisabled(): Promise<void> {
    await expect(this.submitButton).toBeDisabled();
  }

  /**
   * Get submit button text
   */
  async getSubmitButtonText(): Promise<string | null> {
    return await this.submitButton.textContent();
  }
}
