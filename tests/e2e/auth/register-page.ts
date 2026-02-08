/**
 * RegisterPage - Page Object Model
 *
 * Encapsulates register page interactions and selectors.
 */

import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "../base-page";

export interface RegisterData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export class RegisterPage extends BasePage {
  readonly heading: Locator;
  readonly fullNameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly acceptTermsCheckbox: Locator;
  readonly submitButton: Locator;
  readonly googleButton: Locator;
  readonly githubButton: Locator;
  readonly loginLink: Locator;

  constructor(page: Page) {
    super(page);

    this.heading = page.getByRole("heading", { name: /create your account/i });

    // Form inputs
    this.fullNameInput = page.getByLabel("Full Name");
    this.emailInput = page.getByLabel("Email");
    this.passwordInput = page.getByLabel("Password");
    this.confirmPasswordInput = page.getByLabel("Confirm Password");
    this.acceptTermsCheckbox = page.getByLabel(/accept terms/i);

    // Buttons
    this.submitButton = page.getByRole("button", { name: /sign up/i });
    this.googleButton = page.getByRole("button", { name: /google/i });
    this.githubButton = page.getByRole("button", { name: /github/i });

    // Link to login
    this.loginLink = page.getByRole("link", { name: /sign in/i });
  }

  async goto(): Promise<void> {
    await super.goto("/auth/register");
  }

  async register(data: RegisterData): Promise<void> {
    await this.fullNameInput.fill(data.fullName);
    await this.emailInput.fill(data.email);
    await this.passwordInput.fill(data.password);
    await this.confirmPasswordInput.fill(data.confirmPassword);
    await this.acceptTermsCheckbox.check();
    await this.submitButton.click();
  }

  async verifyPageLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }

  async verifyErrorMessage(message: string): Promise<void> {
    const error = this.page.getByText(message);
    await expect(error).toBeVisible();
  }

  async clickSignIn(): Promise<void> {
    await this.loginLink.click();
  }
}
