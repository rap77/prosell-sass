/**
 * VerifyEmailPage - Page Object Model
 *
 * Encapsulates email verification page interactions and selectors.
 */

import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "../base-page";

export class VerifyEmailPage extends BasePage {
  readonly continueButton: Locator;
  readonly resendButton: Locator;
  readonly signInLink: Locator;
  readonly heading: Locator;

  constructor(page: Page) {
    super(page);

    // Buttons - verification is automatic, page has continue and/or resend buttons
    this.continueButton = page.getByRole("button", {
      name: /continue|sign in/i,
    });
    this.resendButton = page.getByRole("button", {
      name: /resend|send again/i,
    });

    // Links
    this.signInLink = page.getByRole("link", { name: /sign in/i });

    // Heading
    this.heading = page.getByRole("heading", { name: /verify your email/i });
  }

  /**
   * Navigate to verify email page with token
   */
  async goto(token?: string): Promise<void> {
    const url = token
      ? `/auth/verify-email?token=${token}`
      : "/auth/verify-email";
    await super.goto(url);
  }

  /**
   * Click submit/continue button
   */
  async clickContinue(): Promise<void> {
    await this.continueButton.click();
  }

  /**
   * Verify email page is loaded
   */
  async verifyPageLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }

  /**
   * Verify success message is displayed
   */
  async verifySuccessMessage(): Promise<void> {
    const successMessage = this.page.getByText(
      /email verified|verification successful/i,
    );
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

  /**
   * Wait for verification to complete
   */
  async waitForVerification(): Promise<void> {
    // Wait for loading state to finish
    await this.page.waitForLoadState("networkidle");
  }
}
