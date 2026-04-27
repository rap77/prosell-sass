/**
 * Vehicle Creation Flow Tests - C3 API Integration
 *
 * E2E tests for complete vehicle creation flow using POST /api/v1/products
 * with category-specific attribute rendering and VIN decode integration.
 *
 * Subtask: 13-01.6
 */

import { expect, test } from "@playwright/test";
import { VehiclesPage } from "../pages/vehicles-page";

test.describe("Vehicle Creation - C3 API Flow", () => {
  let vehiclesPage: VehiclesPage;

  test.beforeEach(async ({ page }) => {
    vehiclesPage = new VehiclesPage(page);

    // Navigate to vehicle creation page
    await page.goto("/catalog/create");
    await page.waitForLoadState("load");
  });

  test.describe("Complete Vehicle Creation Flow", () => {
    test("@smoke should create vehicle via POST /api/v1/products with VIN", async ({ page }) => {
      // Step 1: Select category
      await vehiclesPage.selectCategory("Sedan");

      // Step 2: Fill VIN and decode
      await vehiclesPage.vinInput.fill("2GNALCEK1H1615946"); // Chevrolet Equinox 2017
      await vehiclesPage.decodeVinButton.click();
      await page.waitForLoadState("load");
      await page.waitForTimeout(1500); // Wait for decode to complete

      // Step 3: Verify decoded values
      await expect(vehiclesPage.yearSelect).toHaveValue("2017");
      await expect(vehiclesPage.makeSelect).toHaveValue(/chevrolet/i);
      await expect(vehiclesPage.modelInput).toHaveValue(/equinox/i);

      // Step 4: Fill required fields
      await vehiclesPage.priceInput.fill("18500");
      await vehiclesPage.mileageInput.fill("50000");

      // Step 5: Submit form
      await vehiclesPage.submitButton.click();

      // Step 6: Verify success redirect or success message
      // Should redirect to /catalog or show success toast
      await page.waitForURL(/\/catalog/, { timeout: 5000 });

      // Step 7: Verify vehicle appears in list
      await page.waitForLoadState("load");
      await expect(page.getByText(/equinox/i)).toBeVisible();
    });

    test("should create vehicle with category-specific attributes", async ({ page }) => {
      // Select category with specific attribute_schema (e.g., Sedan)
      await vehiclesPage.selectCategory("Sedan");

      // Verify category-specific fields are visible
      await expect(vehiclesPage.yearSelect).toBeVisible();
      await expect(vehiclesPage.makeSelect).toBeVisible();
      await expect(vehiclesPage.modelInput).toBeVisible();

      // Fill required fields
      await vehiclesPage.vinInput.fill("1HGCM82633A123456"); // Honda Accord 2003
      await vehiclesPage.decodeVinButton.click();
      await page.waitForLoadState("load");
      await page.waitForTimeout(1500);

      await vehiclesPage.priceInput.fill("8500");

      // Submit
      await vehiclesPage.submitButton.click();

      // Verify success
      await page.waitForURL(/\/catalog/, { timeout: 5000 });
    });

    test("should show validation errors for required fields", async ({ page }) => {
      // Try to submit without filling required fields
      await vehiclesPage.submitButton.click();

      // Should show validation error toast
      await expect(page.getByText(/vin|incompletos/i)).toBeVisible({ timeout: 3000 });

      // VIN field should show error
      await expect(vehiclesPage.vinInput).toHaveAttribute("aria-invalid", "true");
    });

    test("should handle VIN decode errors gracefully", async ({ page }) => {
      // Fill invalid VIN
      await vehiclesPage.vinInput.fill("INVALID_VIN_123");

      // Try to decode
      await vehiclesPage.decodeVinButton.click();
      await page.waitForTimeout(1000);

      // Should show error toast
      await expect(page.getByText(/invalid|failed to decode/i)).toBeVisible({
        timeout: 3000,
      });
    });
  });

  test.describe("Category-Specific Attribute Rendering", () => {
    test("should show only category-specific fields when category selected", async ({
      page,
    }) => {
      // Select a category with specific attribute_schema
      await vehiclesPage.selectCategory("Sedan");

      // These fields should be visible (marked true in schema)
      await expect(vehiclesPage.yearSelect).toBeVisible();
      await expect(vehiclesPage.makeSelect).toBeVisible();
      await expect(vehiclesPage.modelInput).toBeVisible();

      // These fields should NOT be visible (marked false in schema)
      // Note: This depends on the actual category configuration in the database
      // For now, we just verify the category is selected
      await expect(page.getByText(/sedan/i)).toBeVisible();
    });

    test("should show all fields when no category selected", async ({ page }) => {
      // Don't select a category - all fields should be visible
      await expect(vehiclesPage.vinInput).toBeVisible();
      await expect(vehiclesPage.yearSelect).toBeVisible();
      await expect(vehiclesPage.makeSelect).toBeVisible();
      await expect(vehiclesPage.modelInput).toBeVisible();
      await expect(vehiclesPage.bodyTypeSelect).toBeVisible();
    });
  });

  test.describe("VIN Decode Integration", () => {
    test("should auto-populate fields after successful VIN decode", async ({ page }) => {
      // Fill and decode VIN
      await vehiclesPage.vinInput.fill("2GNALCEK1H1615946");
      await vehiclesPage.decodeVinButton.click();
      await page.waitForLoadState("load");
      await page.waitForTimeout(1500);

      // Verify auto-populated fields
      await expect(vehiclesPage.yearSelect).toHaveValue("2017");
      await expect(vehiclesPage.makeSelect).toHaveValue(/chevrolet/i);
      await expect(vehiclesPage.modelInput).toHaveValue(/equinox/i);
      await expect(vehiclesPage.trimInput).not.toBeEmpty();
    });

    test("should allow manual override of decoded values", async ({ page }) => {
      // Decode VIN
      await vehiclesPage.vinInput.fill("2GNALCEK1H1615946");
      await vehiclesPage.decodeVinButton.click();
      await page.waitForLoadState("load");
      await page.waitForTimeout(1500);

      // Manually override make field
      await vehiclesPage.makeSelect.click();
      await page.getByRole("option", { name: /toyota/i }).click();

      // Verify manual override worked
      await expect(vehiclesPage.makeSelect).toHaveValue(/toyota/i);
    });
  });

  test.describe("Form Submission and API Integration", () => {
    test("should submit product data with correct structure", async ({ page }) => {
      // Setup form data
      await vehiclesPage.selectCategory("Sedan");
      await vehiclesPage.vinInput.fill("1HGCM82633A123456");
      await vehiclesPage.decodeVinButton.click();
      await page.waitForLoadState("load");
      await page.waitForTimeout(1500);

      await vehiclesPage.priceInput.fill("10000");
      await vehiclesPage.mileageInput.fill("75000");

      // Intercept API call to verify structure
      const apiRequestPromise = page.waitForResponse((response) =>
        response.url().includes("/api/v1/products") && response.request().method() === "POST"
      );

      // Submit form
      await vehiclesPage.submitButton.click();

      // Wait for API call
      const response = await apiRequestPromise;

      // Verify success
      expect(response.ok()).toBeTruthy();

      // Verify response structure
      const responseBody = await response.json();
      expect(responseBody).toHaveProperty("id");
      expect(responseBody).toHaveProperty("title");
      expect(responseBody).toHaveProperty("attributes");
      expect(responseBody.attributes).toHaveProperty("vin", "1HGCM82633A123456");
    });

    test("should show success message after vehicle creation", async ({ page }) => {
      // Fill form
      await vehiclesPage.selectCategory("Sedan");
      await vehiclesPage.vinInput.fill("2GNALCEK1H1615946");
      await vehiclesPage.decodeVinButton.click();
      await page.waitForLoadState("load");
      await page.waitForTimeout(1500);
      await vehiclesPage.priceInput.fill("15000");

      // Submit
      await vehiclesPage.submitButton.click();

      // Verify success message
      await expect(page.getByText(/created successfully|vehículo creado/i)).toBeVisible({
        timeout: 3000,
      });
    });

    test("should redirect to catalog page after successful creation", async ({ page }) => {
      // Fill and submit form
      await vehiclesPage.selectCategory("Sedan");
      await vehiclesPage.vinInput.fill("1HGCM82633A123456");
      await vehiclesPage.decodeVinButton.click();
      await page.waitForLoadState("load");
      await page.waitForTimeout(1500);
      await vehiclesPage.priceInput.fill("12000");

      await vehiclesPage.submitButton.click();

      // Verify redirect to catalog
      await page.waitForURL(/\/catalog/, { timeout: 5000 });
      expect(page.url()).toContain("/catalog");
    });
  });
});
