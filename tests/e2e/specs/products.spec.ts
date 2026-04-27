/**
 * Products E2E Tests
 *
 * Tests the Products page UI with mocked API responses.
 * The page at /products renders products from /api/v1/products.
 * All API calls are intercepted via page.route() to ensure deterministic tests.
 */

import { expect, test } from "@playwright/test";

const MOCK_CATEGORIES = [
  {
    id: "cat-1",
    name: "SUVs",
    slug: "suvs",
    attribute_schema: { year: true, make: true, model: true },
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

const MOCK_PRODUCTS = [
  {
    id: "prod-1",
    title: "2024 Toyota RAV4",
    price_cents: 3500000,
    category_id: "cat-1",
    attributes: { condition: "new", year: 2024, make: "Toyota", model: "RAV4" },
    status: "draft",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "prod-2",
    title: "2023 Honda Civic",
    price_cents: 2500000,
    category_id: "cat-1",
    attributes: { condition: "used", year: 2023, make: "Honda", model: "Civic" },
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

test.describe("Products", () => {
  test.beforeEach(async ({ page }) => {
    // Mock the products list endpoint
    await page.route("**/api/v1/products**", async (route) => {
      const url = route.request().url();

      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            products: MOCK_PRODUCTS,
            total: MOCK_PRODUCTS.length,
            page: 1,
            page_size: 20,
          }),
        });
      } else if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: `prod-${Date.now()}`,
            title: body.title,
            price_cents: body.price_cents,
            category_id: body.category_id,
            attributes: body.attributes || {},
            status: "draft",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        });
      } else if (route.request().method() === "PATCH") {
        // For status updates (submit for approval)
        const productId = url.match(/\/products\/([^/]+)/)?.[1];
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: productId,
            title: "Updated Product",
            price_cents: 1000000,
            status: "active",
            category_id: "cat-1",
            attributes: {},
            created_at: "2026-01-01T00:00:00Z",
            updated_at: new Date().toISOString(),
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Mock the categories endpoint for the category dropdown
    await page.route("**/api/v1/categories**", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            categories: MOCK_CATEGORIES,
            total: MOCK_CATEGORIES.length,
            page: 1,
            page_size: 20,
          }),
        });
      } else {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: "cat-new",
            name: "New Category",
            slug: "new-category",
            attribute_schema: {},
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        });
      }
    });

    await page.goto("/products");
    await page.waitForLoadState("load");
  });

  test("should display products page", async ({ page }) => {
    await expect(page).toHaveURL(/.*products/);
    await expect(page.getByRole("heading", { name: /products/i })).toBeVisible();
  });

  test("should display existing products from API", async ({ page }) => {
    await expect(page.getByText("2024 Toyota RAV4")).toBeVisible();
    await expect(page.getByText("2023 Honda Civic")).toBeVisible();

    // Verify price display (price_cents / 100)
    await expect(page.getByText(/\$35,000\.00/)).toBeVisible();
  });

  test("should create a product in draft status", async ({ page }) => {
    // Click "New Product" button
    await page.getByRole("button", { name: /new product/i }).click();

    // Fill form
    await page.getByLabel(/title/i).fill("Test Product");
    await page.getByLabel(/price/i).fill("9999");

    // Select condition
    await page.getByLabel(/condition/i).selectOption("new");

    // Select category
    await page.getByLabel(/^category$/i).selectOption("cat-1");

    // Submit
    await page.getByRole("button", { name: /^save$/i }).click();

    // Should show success toast
    await expect(page.getByText(/product created/i)).toBeVisible({ timeout: 5000 });
  });

  test("should validate product title is required", async ({ page }) => {
    await page.getByRole("button", { name: /new product/i }).click();

    // Try to submit without title
    const titleInput = page.getByLabel(/title/i);
    await expect(titleInput).toHaveAttribute("required", "");
  });

  test("should filter products by status", async ({ page }) => {
    // The products page has a status filter dropdown
    const statusFilter = page.getByLabel(/status/i);
    await statusFilter.selectOption("draft");

    // Should show only draft products
    await expect(page.getByText("2024 Toyota RAV4")).toBeVisible();
  });

  test("should pass accessibility checks", async ({ page }) => {
    const AxeBuilder = (await import("@axe-core/playwright")).default;
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
