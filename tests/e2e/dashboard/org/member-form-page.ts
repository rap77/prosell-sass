/**
 * MemberFormPage - Page Object Model
 *
 * Encapsulates member form interactions for adding team members.
 * Following Playwright best practices with proper locators.
 */

import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "../../base-page";

export type MemberRole = "manager" | "vendor";

export interface MemberFormData {
  userId: string;
  role: MemberRole;
  commissionRate?: number;
}

export class MemberFormPage extends BasePage {
  // Selectors
  readonly heading: Locator;
  readonly userIdInput: Locator;
  readonly roleSelect: Locator;
  readonly commissionRateInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);

    // Heading (if present on page)
    this.heading = page.getByRole("heading").first();

    // Form inputs
    this.userIdInput = page.locator("#user_id");
    this.roleSelect = page.locator("#role");
    this.commissionRateInput = page.locator("#commission_rate");

    // Button
    this.submitButton = page.getByRole("button", {
      name: /add member/i,
    });
  }

  /**
   * Verify member form is visible on page
   */
  async verifyFormVisible(): Promise<void> {
    await expect(this.userIdInput).toBeVisible();
    await expect(this.roleSelect).toBeVisible();
    await expect(this.commissionRateInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  /**
   * Fill member form
   */
  async fillForm(data: MemberFormData): Promise<void> {
    await this.userIdInput.fill(data.userId);

    // Select role
    await this.roleSelect.selectOption(data.role);

    // Commission rate is optional
    if (data.commissionRate !== undefined) {
      await this.commissionRateInput.fill(String(data.commissionRate));
    }
  }

  /**
   * Submit the form
   */
  async submit(): Promise<void> {
    await this.submitButton.click();
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Fill and submit member form
   */
  async addMember(data: MemberFormData): Promise<void> {
    await this.fillForm(data);
    await this.submit();
  }

  /**
   * Select role
   */
  async selectRole(role: MemberRole): Promise<void> {
    await this.roleSelect.selectOption(role);
  }

  /**
   * Verify field error is shown
   */
  async verifyFieldError(errorMessage: string): Promise<void> {
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
