/**
 * ResetPasswordPage - Page Object Model
 *
 * Encapsulates reset password page interactions and selectors.
 */

import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "../base-page";

export class ResetPasswordPage extends BasePage {
  readonly newPasswordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;
  readonly signInLink: Locator;
  readonly heading: Locator;

  constructor(page: Page) {
    super(page);

    // Form inputs
    this.newPasswordInput = page.getByLabel("New Password");
    this.confirmPasswordInput = page.getByLabel("Confirm Password");

    // Buttons
    this.submitButton = page.getByRole("button", { name: /reset password/i });

    // Links
    this.signInLink = page.getByRole("link", { name: /sign in/i });

    // Heading
    this.heading = page.getByRole("heading", { name: /reset your password/i });
  }

  /**
   * Navigate to reset password page with token
   */
  async goto(token?: string): Promise<void> {
    const url = token ? `/auth/reset-password?token=${token}` : "/auth/reset-password";
    await super.goto(url);
  }

  /**
   * Fill new password field
   */
  async fillNewPassword(password: string): Promise<void> {
    await this.newPasswordInput.fill(password);
  }

  /**
   * Fill confirm password field
   */
  async fillConfirmPassword(password: string): Promise<void> {
    await this.confirmPasswordInput.fill(password);
  }

  /**
   * Fill both password fields
   */
  async fillPasswords(password: string): Promise<void> {
    await this.fillNewPassword(password);
    await this.fillConfirmPassword(password);
  }

  /**
   * Click submit button
   */
  async clickSubmit(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Submit reset password form
   */
  async submitResetPassword(password: string): Promise<void> {
    await this.fillPasswords(password);
    await this.clickSubmit();
  }

  /**
   * Verify reset password page is loaded
   */
  async verifyPageLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }

  /**
   * Verify success message is displayed
   */
  async verifySuccessMessage(): Promise<void> {
    const successMessage = this.page.getByText(/password has been reset/i);
    await expect(successMessage).toBeVisible();
  }

  /**
   * Verify error message is displayed
   */
  async verifyErrorMessage(message: string): Promise<void> {
    const error = this.page.getByText(message);
    await expect(error).toBeVisible();
  }

  /**
   * Click sign in link
   */
  async clickSignIn(): Promise<void> {
    await this.signInLink.click();
  }
}
