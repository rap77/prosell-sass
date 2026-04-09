import { expect, test } from "@playwright/test";
import { ProductsPage } from "../pages/products-page";

// NOTE: /products route is not yet implemented in the web app.
// These tests are skipped until the products management UI is built.
// Products are managed via the catalog at /catalog/create.
// The products API is tested separately in products-api.spec.ts.
test.describe("Products", () => {
  let productsPage: ProductsPage;

  test.beforeEach(async ({ page }) => {
    productsPage = new ProductsPage(page);
  });

  test.skip("should display products page", async ({ page }) => {
    // SKIP: /products route not implemented yet
    await productsPage.goto();
    await expect(page).toHaveURL(/.*products/);
  });

  test.skip("should create a product in draft status", async ({ page }) => {
    // SKIP: /products route not implemented yet
    await productsPage.goto();

    await productsPage.createProduct({
      title: "Test Product",
      description: "A test product for e2e testing",
      price: "9999",
      condition: "new",
    });

    await productsPage.verifyProductVisible("Test Product");
  });

  test.skip("should submit product for approval", async ({ page }) => {
    // SKIP: /products route not implemented yet
    await productsPage.goto();

    // Create product
    await productsPage.createProduct({
      title: "Product to Approve",
      price: "10000",
    });

    await productsPage.verifyProductVisible("Product to Approve");

    // Submit for approval
    await productsPage.submitForApproval("Product to Approve");

    // Verify status changed to pending
    const productCard = productsPage.findProductByTitle("Product to Approve");
    await expect(productCard.getByText(/pending/i)).toBeVisible();
  });

  test.skip("should validate product title is required", async ({ page }) => {
    // SKIP: /products route not implemented yet
    await productsPage.goto();
    await productsPage.clickNewProduct();

    // Try to submit without title
    await productsPage.submit();

    // Should show validation error
    const titleInput = productsPage.productTitleInput;
    await expect(titleInput).toHaveAttribute("required", "");
  });

  test.skip("should validate price is positive", async ({ page }) => {
    // SKIP: /products route not implemented yet
    await productsPage.goto();
    await productsPage.clickNewProduct();

    await productsPage.fillProductForm({
      title: "Test Product",
      price: "-100", // Invalid negative price
    });
    await productsPage.submit();

    // Should show validation error
    await productsPage.waitForNotification();
    await productsPage.verifyNotificationMessage("price");
  });

  test.skip("should filter products by status", async ({ page }) => {
    // SKIP: /products route not implemented yet
    await productsPage.goto();

    // Create products with different statuses
    await productsPage.createProduct({
      title: "Draft Product 1",
      price: "1000",
    });

    // Filter by draft status
    const draftFilter = page.getByLabel(/status/i);
    await draftFilter.selectOption("draft");
    await page.waitForLoadState("load");

    // Verify only draft products shown
    await expect(page.getByText("Draft Product 1")).toBeVisible();
  });

  test.skip("should pass accessibility checks", async ({ page }) => {
    // SKIP: /products route not implemented yet (page returns 404)
    await productsPage.goto();

    const AxeBuilder = (await import("@axe-core/playwright")).default;
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
