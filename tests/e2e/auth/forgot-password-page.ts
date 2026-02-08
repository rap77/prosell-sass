/**
 * ForgotPasswordPage - Page Object Model
 *
 * Encapsulates forgot password page interactions and selectors.
 */

import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "../base-page";

export class ForgotPasswordPage extends BasePage {
  readonly emailInput: Locator;
  readonly submitButton: Locator;
  readonly signInLink: Locator;
  readonly heading: Locator;

  constructor(page: Page) {
    super(page);

    // Form inputs
    this.emailInput = page.getByLabel("Email");

    // Buttons
    this.submitButton = page.getByRole("button", { name: /send reset link/i });

    // Links
    this.signInLink = page.getByRole("link", { name: /sign in/i });

    // Heading
    this.heading = page.getByRole("heading", { name: /forgot your password/i });
  }

  /**
   * Navigate to forgot password page
   */
  async goto(): Promise<void> {
    await super.goto("/auth/forgot-password");
  }

  /**
   * Fill email field
   */
  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  /**
   * Click submit button
   */
  async clickSubmit(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Submit forgot password form
   */
  async submitForgotPassword(email: string): Promise<void> {
    await this.fillEmail(email);
    await this.clickSubmit();
  }

  /**
   * Verify forgot password page is loaded
   */
  async verifyPageLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }

  /**
   * Verify success message is displayed
   */
  async verifySuccessMessage(): Promise<void> {
    const successMessage = this.page.getByText(/check your email/i);
    await expect(successMessage).toBeVisible();
  }

  /**
   * Click sign in link
   */
  async clickSignIn(): Promise<void> {
    await this.signInLink.click();
  }
}
