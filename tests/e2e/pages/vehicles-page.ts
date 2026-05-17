/**
 * VehiclesPage - Page Object for Vehicle management
 * FIXED: Better handling of Radix UI Select Portals and Sonner toasts
 */

import { Page, expect } from "@playwright/test";
import { BasePage } from "../base-page";

export class VehiclesPage extends BasePage {
  // Locators
  readonly vinInput = this.page.getByLabel(/vin/i);
  readonly decodeVinButton = this.page.getByRole("button", { name: /decode|decodificar/i });
  readonly decodedInfoSection = this.page.getByTestId(/decoded-info|vehicle-info/i);

  // Form fields - Note: Using SelectControlled component which renders as a div with data-state
  readonly categorySelect = this.page.getByLabel("Categoría");
  readonly yearSelect = this.page.getByLabel("Año");
  readonly makeSelect = this.page.getByLabel("Marca");
  readonly modelInput = this.page.getByLabel(/modelo|model/i);
  readonly trimInput = this.page.getByLabel(/trim|versión/i);
  readonly bodyTypeSelect = this.page.getByRole("combobox", { name: /tipo de carrocería|body type/i });
  readonly drivetrainSelect = this.page.getByRole("combobox", { name: /tracción|drivetrain/i });
  readonly transmissionSelect = this.page.getByRole("combobox", { name: /transmisión|transmission/i });
  readonly fuelTypeSelect = this.page.getByRole("combobox", { name: /combustible|fuel type/i });
  readonly engineInput = this.page.getByLabel(/motor|engine/i);
  readonly priceInput = this.page.getByLabel(/precio|price/i);
  readonly mileageInput = this.page.getByLabel(/odómetro|mileage/i);
  readonly exteriorColorSelect = this.page.getByRole("combobox", { name: /color exterior|exterior color/i });
  readonly interiorColorSelect = this.page.getByRole("combobox", { name: /color interior|interior color/i });

  // Buttons - FIXED: More specific selector for submit button
  readonly submitButton = this.page.getByRole("button", { name: /(create|save|crear)\s*(vehicle)?/i });

  constructor(page: Page) {
    super(page);
  }

  /**
   * Select a category from dropdown
   * FIXED: Better handling of Radix UI Portal rendering with multiple fallback strategies
   */
  async selectCategory(categoryName: string): Promise<void> {
    console.log(`[SELECT CATEGORY] Attempting to select: ${categoryName}`);

    // Wait for select to be ready and visible
    await this.categorySelect.waitFor({ state: 'visible', timeout: 5000 });

    // Wait a bit for categories to be loaded from API
    await this.page.waitForTimeout(1000);

    // Click to open dropdown
    await this.categorySelect.click();

    // CRITICAL: Wait for Portal to render - Radix UI uses Portals which render outside main DOM
    await this.page.waitForTimeout(1000); // Increased from 800ms

    // Strategy 1: Look for Radix Select item by data attribute (most specific)
    const radixOption = this.page.locator(`[data-radix-select-item]`).filter({ hasText: categoryName }).first();

    // Strategy 2: Look for option by role attribute
    const roleOption = this.page.locator(`[role="option"]`).filter({ hasText: categoryName }).first();

    // Strategy 3: Look for any text containing the category name (most permissive)
    const textOption = this.page.getByText(categoryName, { exact: false }).first();

    // Try each strategy with proper waiting
    let clicked = false;

    // Try radix option first with explicit wait
    try {
      console.log(`[SELECT CATEGORY] Trying radix option strategy...`);
      await radixOption.waitFor({ state: 'visible', timeout: 5000 }); // Increased timeout
      await radixOption.click();
      clicked = true;
      console.log(`[SELECT CATEGORY] Successfully clicked using radix option`);
    } catch {
      console.log(`[SELECT CATEGORY] Radix option failed, trying role option...`);
      // Try role option
      try {
        await roleOption.waitFor({ state: 'visible', timeout: 5000 }); // Increased timeout
        await roleOption.click();
        clicked = true;
        console.log(`[SELECT CATEGORY] Successfully clicked using role option`);
      } catch {
        console.log(`[SELECT CATEGORY] Role option failed, trying text search...`);
        // Fallback: Use text search with even longer timeout
        await textOption.waitFor({ state: 'visible', timeout: 8000 }); // Increased timeout
        await textOption.click();
        clicked = true;
        console.log(`[SELECT CATEGORY] Successfully clicked using text search`);
      }
    }

    if (!clicked) {
      throw new Error(`Failed to select category: ${categoryName}`);
    }
  }

  /**
   * Select an option from a select dropdown by text
   * Helper for Radix UI Select components
   */
  async selectOption(selectLocator: any, optionText: string | RegExp): Promise<void> {
    await selectLocator.click();

    // Wait for Portal to render
    await this.page.waitForTimeout(500);

    const option = this.page.getByText(optionText).first();
    await option.waitFor({ state: 'visible', timeout: 5000 });
    await option.click();
  }

  /**
   * Decode a VIN
   */
  async decodeVin(vin: string): Promise<void> {
    await this.vinInput.fill(vin);
    await this.decodeVinButton.click();
    await this.page.waitForLoadState("load");
  }

  /**
   * Verify decoded vehicle info is visible
   */
  async verifyDecodedInfoVisible(): Promise<void> {
    await expect(this.decodedInfoSection).toBeVisible();
  }

  /**
   * Get decoded vehicle data
   */
  async getDecodedData(): Promise<{ make?: string; model?: string; year?: string }> {
    const make = await this.page.getByTestId("vehicle-make").textContent().catch(() => "");
    const model = await this.page.getByTestId("vehicle-model").textContent().catch(() => "");
    const year = await this.page.getByTestId("vehicle-year").textContent().catch(() => "");

    return {
      make: make?.trim(),
      model: model?.trim(),
      year: year?.trim(),
    };
  }

  /**
   * Wait for toast message to appear and be visible
   * FIXED: Proper toast detection for Sonner with multiple fallback strategies
   */
  async waitForToast(message: string | RegExp, timeout: number = 5000): Promise<void> {
    // Sonner renders toasts in a fixed container with data-sonner-toast attribute
    // The toast might be in a Portal, so we need multiple strategies

    // Strategy 1: Look for toast container
    const toastByAttr = this.page.locator('[data-sonner-toast]').filter({ hasText: message });

    // Strategy 2: Look for text in the entire page (fallback)
    const toastByText = this.page.getByText(message);

    // Wait for either strategy to find the toast
    await Promise.race([
      toastByAttr.waitFor({ state: 'visible', timeout }).catch(() => {}),
      toastByText.waitFor({ state: 'visible', timeout }).catch(() => {})
    ]);
  }

  /**
   * Verify toast message is visible
   */
  async verifyToastVisible(message: string | RegExp): Promise<void> {
    await this.waitForToast(message);

    // Check both strategies
    const toastByAttr = this.page.locator('[data-sonner-toast]').filter({ hasText: message });
    const toastByText = this.page.getByText(message);

    const isVisible = await toastByAttr.isVisible().catch(() => false) ||
                      await toastByText.isVisible().catch(() => false);

    expect(isVisible).toBeTruthy();
  }
}
