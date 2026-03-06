import { expect, test } from "@playwright/test";
import { ProductsPage } from "../pages/products-page";

test.describe("Products", () => {
  let productsPage: ProductsPage;

  test.beforeEach(async ({ page }) => {
    productsPage = new ProductsPage(page);
  });

  test("should display products page", async ({ page }) => {
    await productsPage.goto();
    await expect(page).toHaveURL(/.*products/);
  });

  test("should create a product in draft status", async ({ page }) => {
    await productsPage.goto();

    await productsPage.createProduct({
      title: "Test Product",
      description: "A test product for e2e testing",
      price: "9999",
      condition: "new",
    });

    await productsPage.verifyProductVisible("Test Product");
  });

  test("should submit product for approval", async ({ page }) => {
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

  test("should validate product title is required", async ({ page }) => {
    await productsPage.goto();
    await productsPage.clickNewProduct();

    // Try to submit without title
    await productsPage.submit();

    // Should show validation error
    const titleInput = productsPage.productTitleInput;
    await expect(titleInput).toHaveAttribute("required", "");
  });

  test("should validate price is positive", async ({ page }) => {
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

  test("should filter products by status", async ({ page }) => {
    await productsPage.goto();

    // Create products with different statuses
    await productsPage.createProduct({
      title: "Draft Product 1",
      price: "1000",
    });

    // Filter by draft status
    const draftFilter = page.getByLabel(/status/i);
    await draftFilter.selectOption("draft");
    await page.waitForLoadState("networkidle");

    // Verify only draft products shown
    await expect(page.getByText("Draft Product 1")).toBeVisible();
  });

  test("should pass accessibility checks", async ({ page }) => {
    await productsPage.goto();

    const AxeBuilder = (await import("@axe-core/playwright")).default;
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
