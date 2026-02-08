/**
 * LoginPage - Page Object Model
 *
 * Encapsulates login page interactions and selectors.
 * Following Playwright best practices with proper locators.
 */

import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "../base-page";

export interface LoginData {
  email: string;
  password: string;
}

export class LoginPage extends BasePage {
  // Selectors using Playwright's best practices
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly googleButton: Locator;
  readonly githubButton: Locator;
  readonly forgotPasswordLink: Locator;
  readonly registerLink: Locator;
  readonly heading: Locator;

  constructor(page: Page) {
    super(page);

    // Form inputs - getByLabel for form controls
    this.emailInput = page.getByLabel("Email");
    this.passwordInput = page.getByLabel("Password");

    // Buttons - getByRole for interactive elements
    this.submitButton = page.getByRole("button", { name: /sign in/i });
    this.googleButton = page.getByRole("button", { name: /google/i });
    this.githubButton = page.getByRole("button", { name: /github/i });

    // Links
    this.forgotPasswordLink = page.getByRole("link", { name: /forgot password/i });
    this.registerLink = page.getByRole("link", { name: /sign up/i });

    // Heading
    this.heading = page.getByRole("heading", { name: /sign in to your account/i });
  }

  /**
   * Navigate to login page
   */
  async goto(): Promise<void> {
    await super.goto("/auth/login");
  }

  /**
   * Fill login form and submit
   */
  async login(data: LoginData): Promise<void> {
    await this.emailInput.fill(data.email);
    await this.passwordInput.fill(data.password);
    await this.submitButton.click();
  }

  /**
   * Fill email field
   */
  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  /**
   * Fill password field
   */
  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  /**
   * Click submit button
   */
  async clickSubmit(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Verify login page is loaded
   */
  async verifyPageLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }

  /**
   * Verify error message is displayed
   */
  async verifyErrorMessage(message: string): Promise<void> {
    const error = this.page.getByText(message);
    await expect(error).toBeVisible();
  }

  /**
   * Click forgot password link
   */
  async clickForgotPassword(): Promise<void> {
    await this.forgotPasswordLink.click();
  }

  /**
   * Click sign up link
   */
  async clickSignUp(): Promise<void> {
    await this.registerLink.click();
  }
}
