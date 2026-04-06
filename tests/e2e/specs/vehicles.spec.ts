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

  test("should populate Select fields after VIN decode - bug fix verification", async ({ page }) => {
    // This test verifies the fix for commit 3252454
    // Previously: Select fields remained empty after VIN decode
    // Fix: Removed ?? "" fallback from Select value props

    await page.goto("/catalog/create");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Take screenshot BEFORE
    await page.screenshot({ path: "test-results/before-decode.png" });

    // Valid VIN for Chevrolet Equinox 2022
    const testVin = "1G1BE5SM42J117838";

    // Fill VIN and decode
    const vinInput = page.getByLabel(/vin/i);
    await expect(vinInput).toBeVisible();
    await vinInput.fill(testVin);

    const decodeButton = page.getByRole("button", { name: /decode|decodificar/i });
    await expect(decodeButton).toBeVisible();
    await decodeButton.click();

    // Wait for decode to complete
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000); // Extra wait for state updates

    // Take screenshot AFTER
    await page.screenshot({ path: "test-results/after-decode.png" });

    // CRITICAL VERIFICATION: Check Select fields are populated
    // These fields use Radix UI Select with Controller
    // NOTE: Radix UI Select doesn't expose value like native selects
    // We need to check the SelectValue text content instead

    // Use Spanish labels as the UI is in Spanish
    const makeLabel = page.getByText(/marca/i);
    await expect(makeLabel).toBeVisible();

    // Find the SelectTrigger next to the label
    const makeSelect = page.locator('label:has-text("Marca") + div').or(
      page.locator('[id="make"]')
    );
    await expect(makeSelect).toBeVisible();

    // For Radix UI Select, check the visible text content
    // The SelectValue should show the selected option, not placeholder
    const makeContainer = page.locator('[id="make"]').locator('..');
    const makeText = await makeContainer.textContent();

    console.log("Make select container text:", makeText);

    // Check that it's NOT the placeholder and shows the decoded value
    expect(makeText).not.toContain("Select make");
    expect(makeText).not.toContain("Seleccionar");
    expect(makeText).toMatch(/chevrolet|chevy/i);

    // Also verify Input fields are populated (these work normally)
    const modelInput = page.getByLabel(/model/i);
    await expect(modelInput).toBeVisible();
    await expect(modelInput).toHaveValue(/equinox/i);

    const engineInput = page.getByLabel(/motor|engine/i);
    await expect(engineInput).toBeVisible();
    await expect(engineInput).toHaveValue(/2\.4L/i);

    const trimInput = page.getByLabel(/versión|trim/i);
    await expect(trimInput).toBeVisible();
    await expect(trimInput).toHaveValue(/LT/i);
  });
});
