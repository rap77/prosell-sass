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
  readonly backToLoginLink: Locator;
  readonly heading: Locator;

  constructor(page: Page) {
    super(page);

    // Form inputs - Use ID for more reliable selection
    this.emailInput = page.locator("#email");

    // Buttons - Case-sensitive match
    this.submitButton = page.getByRole("button", { name: "Send Reset Link" });

    // Links - "Back to Login" instead of "sign in"
    this.backToLoginLink = page.getByRole("link", { name: "Back to Login" });

    // Heading - Case-sensitive match for CardTitle
    this.heading = page.getByRole("heading", { name: "Forgot Your Password?" });
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
    // Wait for success state - look for "Back to Login" button which only appears on success
    // This is more reliable than the heading which may not render immediately
    const backButton = this.page.getByRole("link", { name: "Back to Login" });
    await expect(backButton).toBeVisible();
  }

  /**
   * Click back to login link
   */
  async clickBackToLogin(): Promise<void> {
    await this.backToLoginLink.click();
  }
}
