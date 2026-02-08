/**
 * BasePage - Parent class for ALL Page Objects
 *
 * Provides common methods and utilities shared across all pages.
 * Every Page Object should extend this class.
 */

import { Page, expect } from "@playwright/test";

export class BasePage {
  constructor(protected page: Page) {}

  /**
   * Navigate to a path and wait for network idle
   */
  async goto(path: string): Promise<void> {
    await this.page.goto(path);
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Get current page URL
   */
  getCurrentUrl(): string {
    return this.page.url();
  }

  /**
   * Wait for notification/status message to appear
   */
  async waitForNotification(): Promise<void> {
    await this.page.waitForSelector('[role="status"]', { timeout: 5000 });
  }

  /**
   * Verify notification contains expected message
   */
  async verifyNotificationMessage(message: string): Promise<void> {
    const notification = this.page.locator('[role="status"]');
    await expect(notification).toContainText(message);
  }

  /**
   * Verify current URL matches expected path
   */
  async verifyUrl(path: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`${path}$`));
  }

  /**
   * Wait for loading state to complete
   */
  async waitForLoading(): Promise<void> {
    await this.page.waitForLoadState("networkidle");
  }
}
