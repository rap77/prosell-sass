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

    // Form inputs - Use specific IDs
    this.newPasswordInput = page.locator("#password-password");
    this.confirmPasswordInput = page.locator("#password-confirmPassword");

    // Buttons - Case-sensitive match
    this.submitButton = page.getByRole("button", { name: "Reset Password" });

    // Links - "Back to Login" instead of "sign in"
    this.signInLink = page.getByRole("link", { name: "Back to Login" });

    // Heading - Use .first() because of sr-only h1
    this.heading = page
      .getByRole("heading", { name: /reset your password/i })
      .first();
  }

  /**
   * Navigate to reset password page with token
   */
  async goto(token?: string): Promise<void> {
    const url = token
      ? `/auth/reset-password?token=${token}`
      : "/auth/reset-password";
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
    // Look for "Password Reset Successful" heading
    const successMessage = this.page.getByRole("heading", {
      name: "Password Reset Successful",
    });
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
