/**
 * WalletPage - Page Object Model
 *
 * Encapsulates wallet page interactions and selectors.
 * Following Playwright best practices with proper locators.
 */

import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "../../base-page";

export class WalletPage extends BasePage {
  // Selectors
  readonly heading: Locator;
  readonly backButton: Locator;
  readonly tokenBalanceTitle: Locator;
  readonly tokenBalanceValue: Locator;
  readonly tokenBalanceLabel: Locator;
  readonly rechargeButton: Locator;
  readonly refreshButton: Locator;
  readonly transactionHistoryHeading: Locator;
  readonly transactionItems: Locator;
  readonly emptyTransactionsMessage: Locator;
  readonly loadingSpinner: Locator;
  readonly paginationInfo: Locator;
  readonly previousButton: Locator;
  readonly nextButton: Locator;

  // Recharge dialog
  readonly rechargeDialog: Locator;
  readonly tokenPackageButtons: Locator;
  readonly rechargeCancelButton: Locator;

  constructor(page: Page) {
    super(page);

    // Header
    this.heading = page.getByRole("heading", { name: /wallet/i });
    this.backButton = page.getByRole("button", { name: /go back/i });

    // Wallet Card
    this.tokenBalanceTitle = page.getByText(/token balance/i);
    this.tokenBalanceValue = page.locator('.text-2xl.font-bold');
    this.tokenBalanceLabel = page.locator('.text-xs.text-muted-foreground').getByText(/tokens/i);
    this.rechargeButton = page.getByRole("button", { name: /recharge/i });
    this.refreshButton = page.getByRole("button", { name: /refresh balance/i });

    // Transaction History
    this.transactionHistoryHeading = page.getByRole("heading", { name: /transaction history/i });
    this.transactionItems = page.locator(
      'div[class*="flex items-center justify-between p-4 rounded-lg border"]'
    );
    this.emptyTransactionsMessage = page.getByText(/no transactions yet/i);

    // States
    this.loadingSpinner = page.locator('.animate-spin');

    // Pagination
    this.paginationInfo = page.getByText(/showing \d+ of \d+ transactions/i);
    this.previousButton = page.getByRole("button", { name: /previous/i });
    this.nextButton = page.getByRole("button", { name: /next/i });

    // Recharge dialog
    this.rechargeDialog = page.locator('div[class*="mt-4 p-4 rounded-md bg-muted border"]');
    this.tokenPackageButtons = this.rechargeDialog.getByRole("button", { name: /tokens/i });
    this.rechargeCancelButton = this.rechargeDialog.getByRole("button", { name: /cancel/i });
  }

  /**
   * Navigate to wallet page for an organization
   */
  async goto(orgId: string): Promise<void> {
    await super.goto(`/dashboard/org/${orgId}/wallet`);
  }

  /**
   * Verify wallet page is loaded
   */
  async verifyPageLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await expect(this.tokenBalanceTitle).toBeVisible();
  }

  /**
   * Get token balance value
   */
  async getTokenBalance(): Promise<string | null> {
    return await this.tokenBalanceValue.textContent();
  }

  /**
   * Verify token balance is displayed
   */
  async verifyTokenBalanceDisplayed(): Promise<void> {
    await expect(this.tokenBalanceValue).toBeVisible();
    await expect(this.tokenBalanceLabel).toBeVisible();
  }

  /**
   * Click recharge button
   */
  async clickRecharge(): Promise<void> {
    await this.rechargeButton.click();
  }

  /**
   * Click refresh button
   */
  async clickRefresh(): Promise<void> {
    await this.refreshButton.click();
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Verify recharge dialog is visible
   */
  async verifyRechargeDialogVisible(): Promise<void> {
    await expect(this.rechargeDialog).toBeVisible();
  }

  /**
   * Get token package count
   */
  async getTokenPackageCount(): Promise<number> {
    return await this.tokenPackageButtons.count();
  }

  /**
   * Click token package by label
   */
  async clickTokenPackage(label: string): Promise<void> {
    const packageButton = this.tokenPackageButtons.filter({ hasText: label });
    await packageButton.click();
  }

  /**
   * Cancel recharge dialog
   */
  async cancelRecharge(): Promise<void> {
    await this.rechargeCancelButton.click();
  }

  /**
   * Get transaction count
   */
  async getTransactionCount(): Promise<number> {
    return await this.transactionItems.count();
  }

  /**
   * Verify empty transactions state
   */
  async verifyEmptyTransactions(): Promise<void> {
    await expect(this.emptyTransactionsMessage).toBeVisible();
  }

  /**
   * Get transaction amount by index
   */
  async getTransactionAmount(index: number): Promise<string | null> {
    const transaction = this.transactionItems.nth(index);
    const amountText = transaction.locator('.font-semibold');
    return await amountText.textContent();
  }

  /**
   * Get transaction description by index
   */
  async getTransactionDescription(index: number): Promise<string | null> {
    const transaction = this.transactionItems.nth(index);
    const description = transaction.locator('.font-medium');
    return await description.textContent();
  }

  /**
   * Verify transaction type is displayed (credit/debit)
   */
  async verifyTransactionType(index: number, type: "credit" | "debit"): Promise<void> {
    const transaction = this.transactionItems.nth(index);
    const typeIndicator = type === "credit" ? "+" : "-";
    const amountText = await transaction.getByText(new RegExp(`\\${typeIndicator}`)).textContent();
    expect(amountText).toBeTruthy();
  }

  /**
   * Click back button
   */
  async clickBack(): Promise<void> {
    await this.backButton.first().click();
  }

  /**
   * Verify loading state
   */
  async verifyLoadingState(): Promise<void> {
    await expect(this.loadingSpinner).toBeVisible();
  }

  /**
   * Click next pagination button
   */
  async clickNext(): Promise<void> {
    await this.nextButton.click();
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Click previous pagination button
   */
  async clickPrevious(): Promise<void> {
    await this.previousButton.click();
    await this.page.waitForLoadState("networkidle");
  }
}
