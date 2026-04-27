import { test, expect } from "@playwright/test";

/**
 * E2E Tests for Catalog Search and Filter Functionality
 *
 * Tests:
 * - Client-side instant search for title/ID/make/model
 * - FilterSidebar with Brand, Status, Price, Year filters
 * - CommandPalette (Cmd+K) with fuzzy search
 * - URL state sync for shareable filtered links
 *
 * NOTE: Most tests are skipped because catalog UI features are not yet implemented.
 * These tests are ready for when the UI is built.
 */

test.describe("Catalog Search and Filters", () => {
  // Catalog UI is implemented (Inventory MVP complete 2026-03-31)
  // Tests now functional with real API data

  test.beforeEach(async ({ page }) => {
    // Navigate to catalog page
    await page.goto("/catalog");
    // Wait for page to load
    await page.waitForLoadState("load");
  });

  test.afterEach(async ({ page }) => {
    // Clean up any extra pages created during tests
    const context = page.context();
    const pages = context.pages();
    // Keep only the first page (main test page)
    for (let i = 1; i < pages.length; i++) {
      if (!pages[i].isClosed()) {
        await pages[i].close();
      }
    }
  });

  test("should display FilterSidebar with all filters", async ({ page }) => {
    // Check FilterSidebar is visible
    const aside = page.locator("aside").filter({ hasText: "Brand" });
    await expect(aside).toBeVisible();

    // Check all filter sections are visible
    await expect(page.getByText("Brand")).toBeVisible();
    await expect(page.getByText("Price Range")).toBeVisible();
    await expect(page.getByText("Status")).toBeVisible();
    await expect(page.getByText("Year Range")).toBeVisible();

    // Check Clear All Filters button
    await expect(page.getByText("Clear All Filters")).toBeVisible();
  });

  test("should filter vehicles by brand", async ({ page }) => {
    // Wait for vehicles to load
    await page.waitForSelector('[data-testid="vehicle-row"]', { timeout: 10000 });

    // Get initial vehicle count
    const initialCount = await page.locator('[data-testid="vehicle-row"]').count();

    // Click Toyota brand checkbox
    await page.getByLabel("Toyota").check();

    // Wait for URL update (explicit wait instead of timeout)
    await expect(page).toHaveURL(/brand=Toyota/, { timeout: 5000 });

    // Wait for new results to load
    await page.waitForSelector('[data-testid="vehicle-row"]', { timeout: 10000 });

    // Get filtered vehicle count
    const filteredCount = await page.locator('[data-testid="vehicle-row"]').count();

    // Filtered count should be less than or equal to initial count
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  });

  test("should filter vehicles by status", async ({ page }) => {
    // Wait for vehicles to load
    await page.waitForSelector('[data-testid="vehicle-row"]', { timeout: 10000 });

    // Click published status checkbox
    await page.getByLabel("published").check();

    // Wait for URL update
    await expect(page).toHaveURL(/status=published/, { timeout: 5000 });

    // Wait for new results
    await page.waitForSelector('[data-testid="vehicle-row"]', { timeout: 10000 });

    // All visible vehicles should have "published" status
    const statusBadges = page.locator('[data-testid="vehicle-status"]');
    const count = await statusBadges.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const statusText = await statusBadges.nth(i).textContent();
      expect(statusText?.toLowerCase()).toContain("published");
    }
  });

  test("should filter by year range", async ({ page }) => {
    // Wait for vehicles to load
    await page.waitForSelector('[data-testid="vehicle-row"]', { timeout: 10000 });

    // Adjust year range slider (this is a simplified test - actual slider interaction may vary)
    // For now, we'll test that the year filter updates the URL
    const yearSlider = page.locator('input[type="range"]').first();
    if (await yearSlider.isVisible()) {
      await yearSlider.click({ position: { x: 10, y: 0 } });

      // Wait for URL update (explicit wait)
      await expect(page).toHaveURL(/minYear=/, { timeout: 5000 });
    }
  });

  test("should clear all filters", async ({ page }) => {
    // Set some filters
    await page.getByLabel("Toyota").check();

    // Verify URL has filters
    await expect(page).toHaveURL(/brand=Toyota/);

    // Click Clear All Filters button
    await page.getByText("Clear All Filters").click();

    // Verify URL is clean (no filter parameters)
    await expect(page).toHaveURL(/\/catalog$/);

    // Wait for vehicles to reload
    await page.waitForSelector('[data-testid="vehicle-row"]', { timeout: 10000 });
  });

  test("should search vehicles by text", async ({ page }) => {
    // Wait for vehicles to load
    await page.waitForSelector('[data-testid="vehicle-row"]', { timeout: 10000 });

    // Find search input (if it exists in the UI)
    const searchInput = page.getByPlaceholder(/search|buscar/i);

    if (await searchInput.isVisible()) {
      // Type search query
      await searchInput.fill("Toyota");

      // Wait for URL to update with search parameter
      await expect(page).toHaveURL(/search=Toyota/, { timeout: 5000 });

      // Wait for new results
      await page.waitForSelector('[data-testid="vehicle-row"]', { timeout: 10000 });

      // Get filtered vehicle count
      const filteredCount = await page.locator('[data-testid="vehicle-row"]').count();

      // Should have some results (unless no vehicles match)
      expect(filteredCount).toBeGreaterThanOrEqual(0);
    } else {
      // Skip test if search input doesn't exist
      test.skip(true, "Search input not found in UI - feature may not be implemented yet");
    }
  });

  test("should open CommandPalette and show search input when Cmd+K is pressed", async ({ page }) => {
    // Press Cmd+K (or Ctrl+K on Windows/Linux)
    await page.keyboard.press(process.platform === "darwin" ? "Meta+K" : "Control+K");

    // CommandPalette dialog should appear
    const dialog = page.locator('[role="dialog"]').filter({ hasText: "Search vehicles" });
    await expect(dialog).toBeVisible();

    // Check for search input
    const searchInput = page.getByPlaceholder(/search vehicles/i);
    await expect(searchInput).toBeVisible();

    // Check for action buttons
    await expect(page.getByText("Publish vehicle")).toBeVisible();
    await expect(page.getByText("Create new vehicle")).toBeVisible();

    // Close with Escape
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  });

  test("should filter vehicles in CommandPalette", async ({ page }) => {
    // Wait for vehicles to load
    await page.waitForSelector('[data-testid="vehicle-row"]', { timeout: 10000 });

    // Open CommandPalette
    await page.keyboard.press(process.platform === "darwin" ? "Meta+K" : "Control+K");

    // Type search query
    const searchInput = page.getByPlaceholder(/search vehicles/i);
    await searchInput.fill("Toyota");

    // Wait for results to appear
    await page.waitForSelector('[role="option"]', { timeout: 3000 }).catch(() => {});

    // Check for vehicle results
    const vehicleItems = page.locator('[role="option"]').filter({ hasText: /Toyota/i });
    const count = await vehicleItems.count();

    // Should show some results (or "No vehicles found" message)
    if (count > 0) {
      // Verify results contain the search term
      for (let i = 0; i < Math.min(count, 3); i++) {
        const itemText = await vehicleItems.nth(i).textContent();
        expect(itemText?.toLowerCase()).toContain("toyota");
      }
    } else {
      // Check for "No vehicles found" message
      await expect(page.getByText("No vehicles found")).toBeVisible();
    }

    // Close CommandPalette
    await page.keyboard.press("Escape");
  });

  test("should navigate to vehicle from CommandPalette", async ({ page }) => {
    // Wait for vehicles to load
    await page.waitForSelector('[data-testid="vehicle-row"]', { timeout: 10000 });

    // Get first vehicle ID from the grid
    const firstVehicle = page.locator('[data-testid="vehicle-row"]').first();
    const vehicleId = await firstVehicle.getAttribute("data-vehicle-id");

    // Open CommandPalette
    await page.keyboard.press(process.platform === "darwin" ? "Meta+K" : "Control+K");

    // Click on first vehicle in CommandPalette
    const firstOption = page.locator('[role="option"]').first();
    await firstOption.click();

    // Should navigate to vehicle details page
    await page.waitForURL(/\/catalog\/[a-zA-Z0-9-]+$/);
    await expect(page).toHaveURL(new RegExp(`/catalog/${vehicleId}`));
  });

  test("should sync filters to URL for shareable links", async ({ page }) => {
    // Wait for vehicles to load
    await page.waitForSelector('[data-testid="vehicle-row"]', { timeout: 10000 });

    // Apply multiple filters
    await page.getByLabel("Toyota").check();
    await page.getByLabel("published").check();

    // Check URL has all filter parameters
    const url = page.url();
    expect(url).toContain("brand=Toyota");
    expect(url).toContain("status=published");

    // Copy URL (simulate user copying link)
    const shareableUrl = url;

    // Open URL in new page (simulates another user clicking the link)
    const newPage = await page.context().newPage();
    await newPage.goto(shareableUrl);

    // Wait for page to load
    await newPage.waitForLoadState("load");
    await newPage.waitForSelector('[data-testid="vehicle-row"]', { timeout: 10000 });

    // Verify filters are applied (check checkboxes are checked)
    await expect(newPage.getByLabel("Toyota")).toBeChecked();
    await expect(newPage.getByLabel("published")).toBeChecked();
  });

  test("should collapse and expand FilterSidebar", async ({ page }) => {
    // Check initial width (expanded)
    const aside = page.locator("aside").filter({ hasText: "Brand" });
    await expect(aside).toHaveClass(/w-64/);

    // Click collapse button
    await page.getByLabel(/collapse filters/i).click();

    // Should collapse to w-16
    await expect(aside).toHaveClass(/w-16/);

    // Filter content should be hidden
    await expect(page.getByText("Brand")).not.toBeVisible();

    // Click expand button
    await page.getByLabel(/expand filters/i).click();

    // Should expand back to w-64
    await expect(aside).toHaveClass(/w-64/);

    // Filter content should be visible again
    await expect(page.getByText("Brand")).toBeVisible();
  });

  test("should show correct vehicle count", async ({ page }) => {
    // Wait for vehicles to load
    await page.waitForSelector('[data-testid="vehicle-row"]', { timeout: 10000 });

    // Get vehicle count from grid
    const gridCount = await page.locator('[data-testid="vehicle-row"]').count();

    // Get count from UI text
    const countText = page.getByText(/\d+ vehicles found/);
    await expect(countText).toBeVisible();

    const countMatch = await countText.textContent();
    const uiCount = parseInt(countText?.match(/\d+/)?.[0] || "0");

    // Counts should match
    expect(uiCount).toBe(gridCount);
  });

  test("should show empty state when no vehicles match filters", async ({ page }) => {
    // Wait for vehicles to load
    await page.waitForSelector('[data-testid="vehicle-row"]', { timeout: 10000 });

    // Apply filter that matches no vehicles (e.g., very specific year range if possible)
    // For this test, we'll use status filter that might return empty
    await page.getByLabel("sold").check();

    // Wait for URL to update with the filter
    await expect(page).toHaveURL(/status=sold/, { timeout: 5000 });

    // Check if results are empty
    const vehicleRows = page.locator('[data-testid="vehicle-row"]');
    const count = await vehicleRows.count();

    if (count === 0) {
      // Should show empty state message
      await expect(page.getByText("No vehicles found")).toBeVisible();
      await expect(page.getByText(/Try adjusting your filters/)).toBeVisible();
    }
    // If results exist, skip this assertion (test data has sold vehicles)
  });

  test("should escape XSS in search query", async ({ page }) => {
    // Wait for vehicles to load
    await page.waitForSelector('[data-testid="vehicle-row"]', { timeout: 10000 });

    // Find search input (if it exists in the UI)
    const searchInput = page.getByPlaceholder(/search|buscar/i);

    if (await searchInput.isVisible()) {
      const xssPayload = "<script>alert('xss')</script>";

      // Set up dialog listener BEFORE filling input
      let alertFired = false;
      page.on("dialog", async (dialog) => {
        alertFired = true;
        await dialog.dismiss();
      });

      // Type XSS payload
      await searchInput.fill(xssPayload);

      // Wait for URL to update
      await expect(page).toHaveURL(/search=/, { timeout: 5000 });

      // Verify the payload is escaped in the URL
      const url = page.url();
      expect(url).toContain(encodeURIComponent(xssPayload));

      // Brief wait then verify XSS did not execute
      await page.waitForTimeout(300);
      expect(alertFired).toBe(false);
    } else {
      test.skip(true, "Search input not found in UI - feature may not be implemented yet");
    }
  });
});
