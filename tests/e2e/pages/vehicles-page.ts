/**
 * VehiclesPage - Page Object for Vehicle management
 */

import { Page, expect } from "@playwright/test";
import { BasePage } from "../base-page";

export class VehiclesPage extends BasePage {
  // Locators
  readonly vinInput = this.page.getByLabel(/vin/i);
  readonly decodeVinButton = this.page.getByRole("button", { name: /decode|decodificar/i });
  readonly decodedInfoSection = this.page.getByTestId(/decoded-info|vehicle-info/i);

  constructor(page: Page) {
    super(page);
  }

  /**
   * Decode a VIN
   */
  async decodeVin(vin: string): Promise<void> {
    await this.vinInput.fill(vin);
    await this.decodeVinButton.click();
    await this.page.waitForLoadState("networkidle");
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
}
