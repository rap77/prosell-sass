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

  // Form fields
  readonly categorySelect = this.page.getByRole("combobox", { name: /categoría|category/i });
  readonly yearSelect = this.page.getByLabel(/año|year/i);
  readonly makeSelect = this.page.getByLabel(/marca|make/i);
  readonly modelInput = this.page.getByLabel(/modelo|model/i);
  readonly trimInput = this.page.getByLabel(/trim|versión/i);
  readonly bodyTypeSelect = this.page.getByLabel(/tipo de carrocería|body type/i);
  readonly drivetrainSelect = this.page.getByLabel(/tracción|drivetrain/i);
  readonly transmissionSelect = this.page.getByLabel(/transmisión|transmission/i);
  readonly fuelTypeSelect = this.page.getByLabel(/combustible|fuel type/i);
  readonly engineInput = this.page.getByLabel(/motor|engine/i);
  readonly priceInput = this.page.getByLabel(/precio|price/i);
  readonly mileageInput = this.page.getByLabel(/odómetro|mileage/i);
  readonly exteriorColorSelect = this.page.getByLabel(/color exterior|exterior color/i);
  readonly interiorColorSelect = this.page.getByLabel(/color interior|interior color/i);

  // Buttons
  readonly submitButton = this.page.getByRole("button", { name: /create|save|crear/i });

  constructor(page: Page) {
    super(page);
  }

  /**
   * Select a category from dropdown
   */
  async selectCategory(categoryName: string): Promise<void> {
    await this.categorySelect.click();
    await this.page.getByRole("option", { name: categoryName }).click();
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
}
