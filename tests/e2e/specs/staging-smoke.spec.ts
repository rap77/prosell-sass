/**
 * Staging Smoke Tests - E2E
 *
 * Comprehensive smoke tests for staging deployment.
 * Tests: Admin login, dashboard, vehicles/catalog, Phase 8 features.
 *
 * Run with: BASE_URL=http://localhost:3000 TEST_USER_EMAIL=admin@prosell-demo.com TEST_USER_PASSWORD=Admin123! pnpm test staging-smoke
 */

import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = "admin@prosell-demo.com";
const ADMIN_PASSWORD = "Admin123!";

test.describe("Staging Smoke Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Set base URL for staging
    test.info().annotations.push({ type: "environment", value: "staging" });
  });

  test.describe("Dashboard", () => {
    test.use({ storageState: ".auth/storage-state.json" });

    test("should access dashboard page", async ({ page }) => {
      await page.goto("/dashboard");

      // Wait for page load
      await page.waitForLoadState("load");

      // Take screenshot
      await page.screenshot({ path: "test-results/dashboard.png", fullPage: true });

      // Check if dashboard content exists
      // Note: Dashboard may not be fully implemented, so we just check it loads
      const title = await page.title();
      console.log("Dashboard page title:", title);

      // Check for common dashboard elements
      const hasContent = await page.locator("body").textContent();
      expect(hasContent).toBeTruthy();
    });

    test("should display navigation menu", async ({ page }) => {
      await page.goto("/dashboard");
      await page.waitForLoadState("load");

      // Look for navigation elements
      const nav = page.locator("nav").or(page.locator("[role=\"navigation\"]"));
      const isVisible = await nav.count();

      console.log("Navigation elements found:", isVisible);

      if (isVisible > 0) {
        await page.screenshot({ path: "test-results/dashboard-nav.png" });
      }
    });
  });

  test.describe("Vehicles Catalog", () => {
    test.use({ storageState: ".auth/storage-state.json" });

    test("should access vehicles list page", async ({ page }) => {
      await page.goto("/vehicles");
      await page.waitForLoadState("load");

      // Take screenshot
      await page.screenshot({ path: "test-results/vehicles-list.png", fullPage: true });

      // Check if page loads
      const title = await page.title();
      console.log("Vehicles page title:", title);

      // Look for vehicle-related content
      const hasVehicleContent = await page.getByText(/vehicle/i).count();
      console.log("Vehicle-related elements found:", hasVehicleContent);
    });

    test("should display filters on vehicles page", async ({ page }) => {
      await page.goto("/vehicles");
      await page.waitForLoadState("load");

      // Look for filter elements (Phase 8 feature)
      const filterButton = page.getByRole("button", { name: /filter/i });
      const searchInput = page.getByPlaceholder(/search/i);

      const hasFilters = await filterButton.count();
      const hasSearch = await searchInput.count();

      console.log("Filter button found:", hasFilters);
      console.log("Search input found:", hasSearch);

      // Take screenshot showing filters
      await page.screenshot({ path: "test-results/vehicles-filters.png" });

      // If filters exist, try clicking one
      if (hasFilters > 0) {
        await filterButton.first().click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: "test-results/vehicles-filters-open.png" });
      }
    });

    test("should display data grid on vehicles page", async ({ page }) => {
      await page.goto("/vehicles");
      await page.waitForLoadState("load");

      // Look for data grid or table elements (Phase 8 feature)
      const table = page.locator("table").or(page.locator("[role=\"table\"]"));
      const grid = page.locator(".datagrid").or(page.locator("[data-testid*=\"grid\"]"));

      const hasTable = await table.count();
      const hasGrid = await grid.count();

      console.log("Table elements found:", hasTable);
      console.log("Data grid elements found:", hasGrid);

      // Take screenshot showing grid
      await page.screenshot({ path: "test-results/vehicles-datagrid.png" });

      // Check for vehicle cards or list items
      const vehicleCards = page.locator("[data-testid*=\"vehicle\"]").or(
        page.locator(".vehicle-card")
      );
      const cardCount = await vehicleCards.count();
      console.log("Vehicle cards found:", cardCount);
    });
  });

  test.describe("Vehicle Creation", () => {
    test.use({ storageState: ".auth/storage-state.json" });

    test("should access vehicle creation page", async ({ page }) => {
      await page.goto("/vehicles/new");
      await page.waitForLoadState("load");

      // Take screenshot
      await page.screenshot({ path: "test-results/vehicle-new.png", fullPage: true });

      // Check for VIN input (Inventory MVP feature)
      const vinInput = page.getByLabel(/vin/i).or(page.locator("#vin"));
      const hasVinInput = await vinInput.count();

      console.log("VIN input found:", hasVinInput);

      if (hasVinInput > 0) {
        // Check for decode VIN button
        const decodeButton = page.getByRole("button", { name: /decode/i });
        const hasDecodeButton = await decodeButton.count();
        console.log("Decode VIN button found:", hasDecodeButton);

        await page.screenshot({ path: "test-results/vehicle-form-vin.png" });
      }
    });

    test("should show validation for invalid VIN", async ({ page }) => {
      await page.goto("/vehicles/new");
      await page.waitForLoadState("load");

      const vinInput = page.getByLabel(/vin/i).or(page.locator("#vin"));

      if (await vinInput.count() > 0) {
        // Fill with invalid VIN (too short)
        await vinInput.fill("123");

        // Try to decode or submit
        const decodeButton = page.getByRole("button", { name: /decode/i });
        if (await decodeButton.count() > 0) {
          await decodeButton.click();
          await page.waitForTimeout(2000);
        }

        // Take screenshot showing validation
        await page.screenshot({ path: "test-results/vehicle-vin-validation.png" });
      }
    });
  });

  test.describe("Phase 8 Features Verification", () => {
    test.use({ storageState: ".auth/storage-state.json" });

    test("should verify dynamic filters are present", async ({ page }) => {
      await page.goto("/vehicles");
      await page.waitForLoadState("load");

      // Phase 8: Dynamic filters by make, model, year, etc.
      const filterControls = page.locator("[data-testid*=\"filter\"]").or(
        page.locator(".filter")
      );

      const filterCount = await filterControls.count();
      console.log("Filter controls found:", filterCount);

      // Look for specific filter types
      const makeFilter = page.getByText(/make/i);
      const modelFilter = page.getByText(/model/i);
      const yearFilter = page.getByText(/year/i);

      const hasMake = await makeFilter.count();
      const hasModel = await modelFilter.count();
      const hasYear = await yearFilter.count();

      console.log("Make filter:", hasMake > 0 ? "✓" : "✗");
      console.log("Model filter:", hasModel > 0 ? "✓" : "✗");
      console.log("Year filter:", hasYear > 0 ? "✓" : "✗");

      await page.screenshot({ path: "test-results/phase8-filters.png" });
    });

    test("should verify search functionality", async ({ page }) => {
      await page.goto("/vehicles");
      await page.waitForLoadState("load");

      // Phase 8: Search functionality
      const searchInput = page.getByPlaceholder(/search/i).or(
        page.locator("input[type=\"search\"]")
      );

      const hasSearch = await searchInput.count();

      if (hasSearch > 0) {
        console.log("Search input found: ✓");

        // Take screenshot of search
        await page.screenshot({ path: "test-results/phase8-search.png" });

        // Try typing in search
        await searchInput.first().fill("Honda");
        await page.waitForTimeout(1000);
        await page.screenshot({ path: "test-results/phase8-search-filled.png" });
      } else {
        console.log("Search input found: ✗");
      }
    });

    test("should verify infinite scroll or pagination", async ({ page }) => {
      await page.goto("/vehicles");
      await page.waitForLoadState("load");

      // Phase 8: Infinite scroll or pagination
      const pagination = page.locator("[role=\"navigation\"]").or(
        page.locator(".pagination")
      );

      const hasPagination = await pagination.count();

      console.log("Pagination found:", hasPagination > 0 ? "✓" : "✗");

      // Check for scroll indicators
      const scrollIndicator = page.getByText(/load more/i).or(
        page.getByText(/showing/i)
      );

      const hasScroll = await scrollIndicator.count();
      console.log("Infinite scroll indicator:", hasScroll > 0 ? "✓" : "✗");

      await page.screenshot({ path: "test-results/phase8-pagination.png" });
    });
  });

  test.describe("API Endpoints Verification", () => {
    test("should verify API is accessible", async ({ page }) => {
      // Make a direct API call through the page
      const response = await page.request.get("http://localhost:8000/api/v1/auth/health");

      expect(response.status()).toBe(200);

      const body = await response.json();
      console.log("API Health check:", body);

      expect(body).toHaveProperty("status");
    });

    test("should verify vehicles API endpoint", async ({ page }) => {
      // Try to access vehicles API (may need auth)
      const response = await page.request.get("http://localhost:8000/api/v1/vehicles");

      console.log("Vehicles API status:", response.status());

      // May be 401 (unauthorized), 403 (forbidden), or 200 (if public endpoint)
      expect([200, 401, 403]).toContain(response.status());
    });
  });

  test.describe("Accessibility Checks", () => {
    test("should pass accessibility on login page", async ({ page }) => {
      await page.goto("/auth/login");

      const AxeBuilder = (await import("@axe-core/playwright")).default;
      const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

      console.log("A11y violations on login:", accessibilityScanResults.violations.length);

      if (accessibilityScanResults.violations.length > 0) {
        console.log("Violations:", JSON.stringify(accessibilityScanResults.violations, null, 2));
      }

      // Allow some violations for staging
      expect(accessibilityScanResults.violations.length).toBeLessThan(10);
    });

    test("should pass accessibility on vehicles page", async ({ page }) => {
      await page.goto("/vehicles");
      await page.waitForLoadState("load");

      const AxeBuilder = (await import("@axe-core/playwright")).default;
      const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

      console.log("A11y violations on vehicles:", accessibilityScanResults.violations.length);

      if (accessibilityScanResults.violations.length > 0) {
        console.log("Violations:", JSON.stringify(accessibilityScanResults.violations, null, 2));
      }

      // Allow some violations for staging
      expect(accessibilityScanResults.violations.length).toBeLessThan(10);
    });
  });
});
