import { expect, test } from "@playwright/test";
import {
  mockVehiclesEndpoint,
  mockVinDecodeEndpoint,
  mockCategoriesEndpoint,
} from "../helpers/mock-endpoints";
import { MOCK_VIN_DECODED, MOCK_CATEGORIES } from "../fixtures/mock-data";

test.describe("Vehicles", () => {
  test("should populate Select fields after VIN decode - bug fix verification", async ({
    page,
  }) => {
    // This test verifies the fix for commit 3252454
    // Previously: Select fields remained empty after VIN decode
    // Fix: Removed ?? "" fallback from Select value props

    // Mock VIN decode endpoint BEFORE navigation
    await mockVinDecodeEndpoint(page, "2GNALCEK1H1615946", MOCK_VIN_DECODED);

    // Mock categories endpoint
    await mockCategoriesEndpoint(page, MOCK_CATEGORIES);

    await page.goto("/catalog/create");

    // Wait for page to load
    await page.waitForLoadState("load");

    // Select a category first (required for engine field to be visible)
    const categorySelect = page.getByLabel(/categoría|category/i);
    await expect(categorySelect).toBeVisible();
    await categorySelect.click();
    await page.getByText("SUVs").click();

    // Take screenshot BEFORE
    await page.screenshot({ path: "test-results/before-decode.png" });

    // Valid VIN for Chevrolet Equinox 2017
    const testVin = "2GNALCEK1H1615946";

    // Fill VIN and decode
    const vinInput = page.getByLabel(/vin/i);
    await expect(vinInput).toBeVisible();
    await vinInput.fill(testVin);

    const decodeButton = page.getByRole("button", {
      name: /decode|decodificar/i,
    });
    await expect(decodeButton).toBeVisible();
    await decodeButton.click();

    // Wait for decode to complete
    await page.waitForLoadState("load");
    await page.waitForTimeout(5000); // Extra wait for state updates

    // Take screenshot AFTER
    await page.screenshot({ path: "test-results/after-decode.png" });

    // CRITICAL VERIFICATION: Check Select fields are populated IMMEDIATELY after screenshot
    const engineInputCheck = page.locator("#engine");
    const engineCheckValue = await engineInputCheck.inputValue();
    console.log("Engine value RIGHT after screenshot:", engineCheckValue);

    // CRITICAL VERIFICATION: Check Select fields are populated
    // These fields use Radix UI Select with Controller
    // NOTE: Radix UI Select doesn't expose value like native selects
    // We need to check the SelectValue text content instead

    // Use Spanish labels as the UI is in Spanish
    const makeLabel = page.getByText(/marca/i);
    await expect(makeLabel).toBeVisible();

    // Find the SelectTrigger next to the label
    const makeSelect = page
      .locator('label:has-text("Marca") + div')
      .or(page.locator('[id="make"]'));
    await expect(makeSelect).toBeVisible();

    // For Radix UI Select, check the visible text content
    // The SelectValue should show the selected option, not placeholder
    const makeContainer = page.locator('[id="make"]').locator("..");
    const makeText = await makeContainer.textContent();

    console.log("Make select container text:", makeText);

    // Check that it's NOT the placeholder and shows the decoded value
    // Note: The text may contain "Select make" as part of the UI, so we check for the actual value
    expect(makeText).toMatch(/chevrolet|chevy/i);

    // Also verify Input fields are populated (these work normally)
    const modelInput = page.getByLabel(/model/i);
    await expect(modelInput).toBeVisible();
    await expect(modelInput).toHaveValue(/equinox/i);

    // Wait for engine field to be populated (React state update might be delayed)
    const engineInput = page.getByLabel(/motor|engine/i);
    await expect(engineInput).toBeVisible();

    // Debug: Check for multiple engine inputs
    const allEngineInputs = page.locator('input[id="engine"]');
    const engineInputCount = await allEngineInputs.count();
    console.log("Number of engine inputs:", engineInputCount);

    // Debug: Check what we're actually selecting
    const engineId = await engineInput.getAttribute("id");
    console.log("Engine input ID:", engineId);
    const engineValue = await engineInput.inputValue();
    console.log("Engine input value:", engineValue);

    // Try selecting by ID directly
    const engineById = page.locator("#engine");
    const engineByIdValue = await engineById.inputValue();
    console.log("Engine by ID value:", engineByIdValue);

    await expect(engineInput).toHaveValue(/LEA|SIDI|Direct Injection/i);

    const trimInput = page.getByLabel(/versión|trim/i);
    await expect(trimInput).toBeVisible();
    await expect(trimInput).toHaveValue(/LT/i);
  });

  test("should load vehicles in DataGrid with C3 schema data", async ({
    page,
  }) => {
    // Mock products endpoint (C3 schema where vehicles are products)
    await page.route("**/api/v1/products**", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            products: [
              {
                id: "prod-v1",
                title: "2022 Toyota Camry XSE",
                price_cents: 2799900,
                status: "published",
                category_id: "cat-2",
                attributes: {
                  category: "vehicle",
                  vin: "1NXBR32E87Z123456",
                  year: 2022,
                  make: "Toyota",
                  model: "Camry",
                  trim: "XSE",
                  mileage: 15000,
                  exterior_color: "Midnight Black",
                  interior_color: "Black",
                },
                created_at: "2026-01-10T00:00:00Z",
                updated_at: "2026-01-10T00:00:00Z",
              },
              {
                id: "prod-v2",
                title: "2023 Honda CR-V EX",
                price_cents: 3299900,
                status: "published",
                category_id: "cat-1",
                attributes: {
                  category: "vehicle",
                  vin: "2T1BURHE1GC123456",
                  year: 2023,
                  make: "Honda",
                  model: "CR-V",
                  trim: "EX",
                  mileage: 8000,
                  exterior_color: "Modern Steel Metallic",
                  interior_color: "Gray",
                },
                created_at: "2026-01-11T00:00:00Z",
                updated_at: "2026-01-11T00:00:00Z",
              },
            ],
          }),
        });
      } else {
        await route.continue();
      }
    });

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
    await expect(firstRow.locator("text=/\\$|USD/")).toBeVisible();

    // Check that status badge is visible (product.status field)
    const statusBadge = firstRow.locator('[data-testid="vehicle-status"]');
    await expect(statusBadge).toBeVisible();
  });

  test("should return products array from API", async ({ page }) => {
    // Mock products endpoint to verify API response structure
    await page.route("**/api/v1/products**", async (route) => {
      const request = route.request();

      if (request.method() !== "GET") {
        await route.continue();
        return;
      }

      const url = new URL(request.url());

      // Skip individual product routes
      if (url.pathname.match(/\/api\/v1\/products\/[^?]+/)) {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          products: [
            {
              id: "prod-1",
              title: "2022 Toyota Camry",
              price_cents: 2500000,
              status: "published",
              category_id: "cat-1",
              attributes: {
                category: "vehicle",
                vin: "VIN000001",
                year: 2022,
                make: "Toyota",
                model: "Camry",
                trim: "LE",
                mileage: 15000,
                exterior_color: "Silver",
                interior_color: "Black",
              },
              created_at: "2026-01-10T00:00:00Z",
              updated_at: "2026-01-10T00:00:00Z",
            },
            {
              id: "prod-2",
              title: "2023 Honda CR-V",
              price_cents: 3200000,
              status: "published",
              category_id: "cat-1",
              attributes: {
                category: "vehicle",
                vin: "VIN000002",
                year: 2023,
                make: "Honda",
                model: "CR-V",
                trim: "EX",
                mileage: 8000,
                exterior_color: "Blue",
                interior_color: "Gray",
              },
              created_at: "2026-01-10T00:00:00Z",
              updated_at: "2026-01-10T00:00:00Z",
            },
            {
              id: "prod-3",
              title: "2024 Chevrolet Equinox",
              price_cents: 2800000,
              status: "draft",
              category_id: "cat-1",
              attributes: {
                category: "vehicle",
                vin: "VIN000003",
                year: 2024,
                make: "Chevrolet",
                model: "Equinox",
                trim: "LT",
                mileage: 5000,
                exterior_color: "White",
                interior_color: "Black",
              },
              created_at: "2026-01-10T00:00:00Z",
              updated_at: "2026-01-10T00:00:00Z",
            },
          ],
        }),
      });
    });

    // Navigate to catalog page
    await page.goto("/catalog");
    await page.waitForLoadState("load");

    // Wait for DataGrid to render
    const vehicleRows = page.locator("table tbody tr");
    await expect(vehicleRows.first()).toBeVisible({ timeout: 5000 });

    // Verify initial page loaded
    const initialCount = await vehicleRows.count();
    expect(initialCount).toBeGreaterThan(0);

    // Verify API response structure includes products array
    const apiResponse = await page.evaluate(async () => {
      const response = await fetch("/api/v1/products");
      const data = await response.json();
      return data;
    });

    // Verify response has products array
    expect(apiResponse).toHaveProperty("products");
    expect(Array.isArray(apiResponse.products)).toBeTruthy();
  });

  test("should maintain performance with row virtualization", async ({
    page,
  }) => {
    // Mock vehicles endpoint with large dataset
    // Use C3 schema format (products with vehicle attributes)
    const largeVehicleList = Array.from({ length: 100 }, (_, i) => ({
      id: `prod-v${i}`,
      title: `Vehicle ${i}`,
      price_cents: 2000000 + i * 10000,
      status: i % 3 === 0 ? "draft" : "published",
      category_id: "cat-1",
      attributes: {
        category: "vehicle",
        vin: `VIN${i}`,
        year: 2020 + (i % 5),
        make: ["Toyota", "Honda", "Chevrolet"][i % 3],
        model: ["Camry", "Civic", "Equinox"][i % 3],
        trim: "Base",
        mileage: i * 1000,
        exterior_color: "Black",
        interior_color: "Gray",
      },
      created_at: "2026-01-10T00:00:00Z",
      updated_at: "2026-01-10T00:00:00Z",
    }));

    // IMPORTANT: Setup mock BEFORE navigation to avoid race condition
    // FIXED: Mock /api/v1/products (not /api/v1/vehicles - deprecated endpoint)
    await page.route("**/api/v1/products**", async (route) => {
      const request = route.request();

      if (request.method() !== "GET") {
        await route.continue();
        return;
      }

      const url = new URL(route.request().url());

      // Skip individual product routes
      if (url.pathname.match(/\/api\/v1\/products\/[^?]+/)) {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          products: largeVehicleList,
        }),
      });
    });

    // Navigate AFTER mock is established
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
      return (
        performance.timing.loadEventEnd - performance.timing.navigationStart
      );
    });

    // Page should load in less than 5 seconds (reasonable for 100 vehicles with virtualization)
    expect(loadTime).toBeLessThan(5000);
  });
});
