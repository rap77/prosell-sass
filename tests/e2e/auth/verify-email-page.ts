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

    // Verification is automatic — the page shows loading → success/error
    // CTA links (not buttons) vary by state
    this.continueButton = page.getByRole("link", { name: /iniciar sesión/i });
    this.resendButton = page.getByRole("link", { name: /volver al registro/i });

    // Links — success state shows "Iniciar sesión"
    this.signInLink = page.getByRole("link", { name: /iniciar sesión/i });

    // Heading is always an h1: "Verificando tu email...", "¡Email verificado!", or error variant
    this.heading = page.locator("h1").first();
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
    // Spanish success heading: "¡Email verificado!"
    const successMessage = this.page.locator("h1").filter({ hasText: /email verificado/i });
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
    await this.page.waitForLoadState("load");
  }
}
