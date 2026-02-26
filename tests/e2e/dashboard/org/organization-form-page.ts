/**
 * OrganizationFormPage - Page Object Model
 *
 * Encapsulates organization form interactions for create/edit.
 * Following Playwright best practices with proper locators.
 */

import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "../../base-page";

export interface OrganizationFormData {
  name: string;
  description?: string;
  website?: string;
  phone?: string;
}

export type FormMode = "create" | "edit";

export class OrganizationFormPage extends BasePage {
  // Selectors
  readonly heading: Locator;
  readonly nameInput: Locator;
  readonly descriptionInput: Locator;
  readonly websiteInput: Locator;
  readonly phoneInput: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    super(page);

    // Heading
    this.heading = page.getByRole("heading", {
      name: /create organization|organization details/i,
    });

    // Form inputs - use id selectors
    this.nameInput = page.locator("#name");
    this.descriptionInput = page.locator("#description");
    this.websiteInput = page.locator("#website");
    this.phoneInput = page.locator("#phone");

    // Buttons
    this.submitButton = page.getByRole("button", {
      name: /create organization|save changes/i,
    });
    this.cancelButton = page.getByRole("button", { name: /cancel/i });
  }

  /**
   * Navigate to create organization page
   */
  async gotoCreate(): Promise<void> {
    await super.goto("/dashboard/org/new");
  }

  /**
   * Navigate to edit organization page
   */
  async gotoEdit(orgId: string): Promise<void> {
    await super.goto(`/dashboard/org/${orgId}/edit`);
  }

  /**
   * Verify form page is loaded
   */
  async verifyPageLoaded(mode: FormMode = "create"): Promise<void> {
    const expectedHeading =
      mode === "create" ? /create organization/i : /organization details/i;
    await expect(this.page.getByRole("heading", { name: expectedHeading })).toBeVisible();
  }

  /**
   * Fill organization form
   */
  async fillForm(data: OrganizationFormData): Promise<void> {
    if (data.name) {
      await this.nameInput.fill(data.name);
    }
    if (data.description !== undefined) {
      await this.descriptionInput.fill(data.description);
    }
    if (data.website !== undefined) {
      await this.websiteInput.fill(data.website);
    }
    if (data.phone !== undefined) {
      await this.phoneInput.fill(data.phone);
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
   * Fill and submit organization form
   */
  async createOrganization(data: OrganizationFormData): Promise<void> {
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
