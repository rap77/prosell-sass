import { expect, test } from "@playwright/test";
import { VehiclesPage } from "../pages/vehicles-page";

test.describe("Vehicles", () => {
  let vehiclesPage: VehiclesPage;

  test.beforeEach(async ({ page }) => {
    vehiclesPage = new VehiclesPage(page);
  });

  test("should validate VIN format", async ({ page }) => {
    await page.goto("/vehicles/new");

    // Test VIN that's too short
    await vehiclesPage.vinInput.fill("123");
    await vehiclesPage.decodeVinButton.click();

    // Should show validation error
    await vehiclesPage.waitForNotification();
    await vehiclesPage.verifyNotificationMessage("VIN must be exactly 17 characters");
  });

  test("should validate VIN has no invalid characters", async ({ page }) => {
    await page.goto("/vehicles/new");

    // VIN with I, O, Q (invalid characters)
    await vehiclesPage.vinInput.fill("1HGCM82633A12345I");
    await vehiclesPage.decodeVinButton.click();

    // Should show validation error
    await vehiclesPage.waitForNotification();
    await vehiclesPage.verifyNotificationMessage("cannot contain I, O, or Q");
  });

  test("should validate VIN checksum", async ({ page }) => {
    await page.goto("/vehicles/new");

    // VIN with invalid checksum (random valid format but wrong check digit)
    await vehiclesPage.vinInput.fill("1HGCM826012345678");
    await vehiclesPage.decodeVinButton.click();

    // Should show checksum validation error
    await vehiclesPage.waitForNotification();
    await vehiclesPage.verifyNotificationMessage("checksum");
  });

  test("should decode valid VIN successfully", async ({ page }) => {
    await page.goto("/vehicles/new");

    // Valid VIN with correct checksum (Honda Accord)
    await vehiclesPage.decodeVin("1HGCM826712345678");

    // Should show decoded info
    await vehiclesPage.verifyDecodedInfoVisible();

    const decoded = await vehiclesPage.getDecodedData();
    expect(decoded.make).toBeTruthy();
    expect(decoded.model).toBeTruthy();
  });

  test("should cache VIN decode results", async ({ page }) => {
    await page.goto("/vehicles/new");

    const vin = "1HGCM826712345678";

    // First decode
    await vehiclesPage.decodeVin(vin);
    const firstDecode = await vehiclesPage.getDecodedData();

    // Wait a moment
    await page.waitForTimeout(1000);

    // Second decode should use cache
    await vehiclesPage.decodeVin(vin);
    const secondDecode = await vehiclesPage.getDecodedData();

    expect(firstDecode).toEqual(secondDecode);
  });

  test("should display vehicle info from decoded VIN", async ({ page }) => {
    await page.goto("/vehicles/new");

    await vehiclesPage.decodeVin("1HGCM826712345678");

    // Verify vehicle details displayed
    await expect(page.getByTestId("vehicle-make")).toBeVisible();
    await expect(page.getByTestId("vehicle-model")).toBeVisible();
    await expect(page.getByTestId("vehicle-year")).toBeVisible();
  });

  test("should handle VIN decode API errors gracefully", async ({ page }) => {
    await page.goto("/vehicles/new");

    // Mock network error
    await page.context().route("**/api/v1/vehicles/decode-vin*", route => {
      route.abort("failed");
    });

    await vehiclesPage.decodeVin("1HGCM826712345678");

    // Should show user-friendly error
    await vehiclesPage.waitForNotification();
    await vehiclesPage.verifyNotificationMessage("error");
  });

  test("should pass accessibility checks", async ({ page }) => {
    await page.goto("/vehicles");

    const AxeBuilder = (await import("@axe-core/playwright")).default;
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
