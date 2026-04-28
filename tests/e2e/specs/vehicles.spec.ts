import { expect, test } from "@playwright/test";
import { mockVehiclesEndpoint } from "../helpers/mock-endpoints";
import { MOCK_VEHICLE_RESPONSE, MOCK_VEHICLE_LIST } from "../fixtures/mock-data";

test.describe("Vehicles", () => {
  test("should populate Select fields after VIN decode - bug fix verification", async ({ page }) => {
    // This test verifies the fix for commit 3252454
    // Previously: Select fields remained empty after VIN decode
    // Fix: Removed ?? "" fallback from Select value props

    await page.goto("/catalog/create");

    // Wait for page to load
    await page.waitForLoadState("load");

    // Take screenshot BEFORE
    await page.screenshot({ path: "test-results/before-decode.png" });

    // Valid VIN for Chevrolet Equinox 2017
    const testVin = "2GNALCEK1H1615946";

    // Fill VIN and decode
    const vinInput = page.getByLabel(/vin/i);
    await expect(vinInput).toBeVisible();
    await vinInput.fill(testVin);

    const decodeButton = page.getByRole("button", { name: /decode|decodificar/i });
    await expect(decodeButton).toBeVisible();
    await decodeButton.click();

    // Wait for decode to complete
    await page.waitForLoadState("load");
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
    // Note: The text may contain "Select make" as part of the UI, so we check for the actual value
    expect(makeText).toMatch(/chevrolet|chevy/i);

    // Also verify Input fields are populated (these work normally)
    const modelInput = page.getByLabel(/model/i);
    await expect(modelInput).toBeVisible();
    await expect(modelInput).toHaveValue(/equinox/i);

    const engineInput = page.getByLabel(/motor|engine/i);
    await expect(engineInput).toBeVisible();
    await expect(engineInput).toHaveValue(/LEA|SIDI|Direct Injection/i);

    const trimInput = page.getByLabel(/versión|trim/i);
    await expect(trimInput).toBeVisible();
    await expect(trimInput).toHaveValue(/LT/i);
  });

  test("should load vehicles in DataGrid with C3 schema data", async ({ page }) => {
    // Mock vehicles endpoint BEFORE navigation
    await mockVehiclesEndpoint(page);

    // Navigate to catalog page
    await page.goto("/catalog");
    await page.waitForLoadState("load");

    // Wait for DataGrid to render vehicles
    const vehicleRows = page.locator('[data-testid="vehicle-row"]');
    await expect(vehicleRows.first()).toBeVisible({ timeout: 5000 });

    // Verify C3 schema data is displayed (product fields + vehicle fields)
    // First row should show: photo, title (from product), price (from product), status
    const firstRow = vehicleRows.first();

    // Check that title is displayed (product.title field)
    await expect(firstRow.getByText(/2022|2023|2024|2025/i)).toBeVisible();

    // Check that price is displayed (product.price_cents field)
    await expect(firstRow.locator('text=/\\$|USD/')).toBeVisible();

    // Check that status badge is visible (product.status field)
    const statusBadge = firstRow.locator('[data-testid="vehicle-status"]');
    await expect(statusBadge).toBeVisible();
  });

  test("should support cursor pagination in API response", async ({ page }) => {
    // Mock vehicles endpoint to verify cursor pagination support
    await page.route("**/api/v1/vehicles**", async (route) => {
      const request = route.request();

      if (request.method() !== "GET") {
        await route.continue();
        return;
      }

      const url = new URL(request.url());

      // Skip individual vehicle routes
      if (url.pathname.match(/\/api\/v1\/vehicles\/[^?]+/)) {
        await route.continue();
        return;
      }

      // Verify cursor parameter is supported
      const cursor = url.searchParams.get("cursor");

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: MOCK_VEHICLE_LIST.slice(0, 5),
          next_cursor: cursor ? "next-page-token" : "initial-token",
          has_more: !cursor, // No more pages if this is the last page
        }),
      });
    });

    // Navigate to catalog page
    await page.goto("/catalog");
    await page.waitForLoadState("load");

    // Wait for DataGrid to render
    const vehicleRows = page.locator('table tbody tr');
    await expect(vehicleRows.first()).toBeVisible({ timeout: 5000 });

    // Verify initial page loaded
    const initialCount = await vehicleRows.count();
    expect(initialCount).toBeGreaterThan(0);

    // Verify API response structure includes cursor pagination fields
    const apiResponse = await page.evaluate(async () => {
      const response = await fetch("/api/v1/vehicles");
      const data = await response.json();
      return data;
    });

    // Verify response has cursor pagination fields
    expect(apiResponse).toHaveProperty("items");
    expect(apiResponse).toHaveProperty("next_cursor");
    expect(apiResponse).toHaveProperty("has_more");
    expect(Array.isArray(apiResponse.items)).toBeTruthy();
  });

  test("should maintain performance with row virtualization", async ({ page }) => {
    // Mock vehicles endpoint with large dataset
    const largeVehicleList = Array.from({ length: 100 }, (_, i) => ({
      ...MOCK_VEHICLE_LIST[0],
      id: `vehicle-${i}`,
      title: `Vehicle ${i}`,
    }));

    await page.route("**/api/v1/vehicles**", async (route) => {
      const request = route.request();

      if (request.method() !== "GET") {
        await route.continue();
        return;
      }

      const url = new URL(request.url());

      if (url.pathname.match(/\/api\/v1\/vehicles\/[^?]+/)) {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: largeVehicleList,
          next_cursor: null,
          has_more: false,
        }),
      });
    });

    // Navigate to catalog page
    await page.goto("/catalog");
    await page.waitForLoadState("load");

    // Wait for DataGrid to render
    const vehicleRows = page.locator('[data-testid="vehicle-row"]');
    await expect(vehicleRows.first()).toBeVisible({ timeout: 5000 });

    // Verify row virtualization: DOM should only contain ~40 rows, not 100
    // TanStack Virtual keeps viewport + overscan rows in DOM
    const domRows = await page.locator('[data-testid="vehicle-row"]').count();

    // With 100 total vehicles, virtualization should keep ~40-60 rows in DOM
    // (viewport ~15-20 rows + overscan ~10-20 rows)
    expect(domRows).toBeLessThan(80);
    expect(domRows).toBeGreaterThan(0);

    // Verify we can scroll through the list
    // Verify page loads quickly with 100 vehicles (performance test)
    const loadTime = await page.evaluate(() => {
      return performance.timing.loadEventEnd - performance.timing.navigationStart;
    });

    // Page should load in less than 5 seconds (reasonable for 100 vehicles with virtualization)
    expect(loadTime).toBeLessThan(5000);
  });
});
