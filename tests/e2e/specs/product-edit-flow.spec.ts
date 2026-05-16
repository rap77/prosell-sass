/**
 * E2E test for Product Edit Flow
 *
 * Test B3.4.11: E2E test for edit flow
 *
 * Acceptance Criteria:
 * - E2E test file created for product edit flow
 * - Test navigates to edit page and verifies form pre-fills
 * - Test submits an update and verifies the change
 * - Test passes (or is clearly structured to pass with a real running server)
 *
 * Uses TestDataBuilder to create real test data via the API,
 * following the same pattern as smoke-real-api.spec.ts.
 *
 * Auth is handled by storageState (playwright.config.ts) — no manual login needed.
 */

import { test, expect } from "../fixtures/test-setup";

// ============================================
// TEST SUITE
// ============================================

test.describe("Product Edit Flow - E2E", () => {
  let vehicleId: string;
  let categoryId: string;

  test.beforeEach(async ({ page, dataBuilder }) => {
    // Create test category via real API
    categoryId = await dataBuilder.createCategory("Test Edit Category");

    // Create test vehicle via real API
    vehicleId = await dataBuilder.createVehicle(categoryId, {
      vin: "1HGCM82633A004321",
      year: 2020,
      make: "Honda",
      model: "Accord",
      trim: "EX",
      mileage: 30000,
      price: 25000,
      status: "available",
    });

    // Navigate to the edit page
    await page.goto(`/catalog/${vehicleId}/edit`);
    await page.waitForLoadState("networkidle");
  });

  // ============================================
  // CORE SMOKE TEST: Complete edit flow
  // ============================================

  test("@smoke B3.4.11: Edit page loads and form pre-fills with existing data", async ({ page }) => {
    // Verify we're on the edit page
    await expect(page).toHaveURL(new RegExp(`/catalog/${vehicleId}/edit`));

    // Verify page title shows Edit Vehicle
    const pageHeading = page.locator("h1");
    await expect(pageHeading).toBeVisible({ timeout: 5000 });
    await expect(pageHeading).toContainText(/edit vehicle/i);

    // Verify VIN field is pre-filled (VIN input has id="vin")
    const vinInput = page.locator("input#vin");
    await expect(vinInput).toBeVisible({ timeout: 5000 });
    await expect(vinInput).toHaveValue("1HGCM82633A004321");

    // Verify price field is pre-filled (price input has id="price")
    // Price stored as price_cents (2500000 cents = 25000 dollars)
    const priceInput = page.locator("input#price");
    await expect(priceInput).toBeVisible({ timeout: 5000 });
    await expect(priceInput).toHaveValue("25000");

    // Verify submit button shows edit mode label
    const submitButton = page.getByRole("button", { name: /update vehicle/i });
    await expect(submitButton).toBeVisible();
  });

  test("B3.4.11: User can modify price and submit the update", async ({ page }) => {
    // Wait for form to load with existing data
    const priceInput = page.locator("input#price");
    await expect(priceInput).toBeVisible({ timeout: 5000 });
    await expect(priceInput).toHaveValue("25000");

    // Clear price and enter new value
    await priceInput.fill("");
    await priceInput.fill("30000");
    await expect(priceInput).toHaveValue("30000");

    // Click Update Vehicle button
    const submitButton = page.getByRole("button", { name: /update vehicle/i });
    await submitButton.click();

    // Wait for success toast: "Product updated successfully"
    const successToast = page.getByText(/product updated successfully/i);
    await expect(successToast).toBeVisible({ timeout: 10000 });

    // After success, we are redirected away from edit page
    await page.waitForURL(/\/catalog/, { timeout: 10000 });
    expect(page.url()).not.toContain("/edit");
  });

  test("B3.4.11: Cancel button navigates back without saving", async ({ page }) => {
    // Wait for form to load
    const vinInput = page.locator("input#vin");
    await expect(vinInput).toBeVisible({ timeout: 5000 });

    // Modify a field
    const priceInput = page.locator("input#price");
    await priceInput.fill("99999");

    // Click Cancel button
    const cancelButton = page.getByRole("button", { name: /cancel/i });
    await cancelButton.click();

    // Should navigate away from edit page (back navigation)
    await page.waitForURL(/\/catalog/, { timeout: 5000 });
    expect(page.url()).not.toContain(`/catalog/${vehicleId}/edit`);
  });

  test("B3.4.11: Edit page shows validation error for invalid VIN", async ({ page }) => {
    // Wait for form to load
    const vinInput = page.locator("input#vin");
    await expect(vinInput).toBeVisible({ timeout: 5000 });

    // Clear VIN to trigger validation error
    await vinInput.fill("");
    await vinInput.fill("INVALIDVIN"); // Only 10 chars — too short

    // Try to submit
    const submitButton = page.getByRole("button", { name: /update vehicle/i });
    await submitButton.click();

    // Verify validation error message is shown
    // VehicleForm shows "VIN must be 17 characters" for min/max constraint
    const vinError = page.getByText(/vin must be 17 characters/i);
    await expect(vinError).toBeVisible({ timeout: 5000 });

    // Form stays on edit page
    expect(page.url()).toContain(`/catalog/${vehicleId}/edit`);
  });
});
