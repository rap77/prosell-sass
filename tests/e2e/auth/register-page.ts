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

    // Spanish heading: "Creá tu cuenta"
    this.heading = page
      .locator("h1")
      .first();

    // Form inputs — match actual IDs in RegisterPageContent.tsx
    this.fullNameInput = page.locator("#fullName");
    this.emailInput = page.locator("#reg-email");
    this.passwordInput = page.locator("#reg-password");
    this.confirmPasswordInput = page.locator("#reg-confirm-password");
    // Checkbox has no ID — select by type inside the terms section
    this.acceptTermsCheckbox = page.locator('input[type="checkbox"]').first();

    // Spanish button: "Crear cuenta"
    this.submitButton = page.getByRole("button", { name: /crear cuenta/i });
    this.googleButton = page.getByRole("button", { name: /google/i });
    this.githubButton = page.getByRole("button", { name: /github/i });

    // Spanish link: "Iniciar sesión →"
    this.loginLink = page.getByRole("link", { name: /iniciar sesión/i }).first();
  }

  async goto(): Promise<void> {
    await super.goto("/auth/register");
  }

  async register(data: RegisterData): Promise<void> {
    await this.fullNameInput.fill(data.fullName);
    await this.emailInput.fill(data.email);
    await this.passwordInput.fill(data.password);
    await this.confirmPasswordInput.fill(data.confirmPassword);
    await this.acceptTermsCheckbox.click();
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
