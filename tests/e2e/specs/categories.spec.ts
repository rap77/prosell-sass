import { expect, test } from "@playwright/test";
import { CategoriesPage } from "../pages/categories-page";

test.describe("Categories", () => {
  let categoriesPage: CategoriesPage;

  test.beforeEach(async ({ page }) => {
    categoriesPage = new CategoriesPage(page);
  });

  test("should display categories page", async ({ page }) => {
    await categoriesPage.goto();
    await expect(page).toHaveURL(/.*categories/);
  });

  test("should create a root category", async ({ page }) => {
    await categoriesPage.goto();

    await categoriesPage.createCategory({
      name: "Test Category",
      slug: "test-category",
      description: "A test category for e2e testing",
    });

    await categoriesPage.verifyCategoryVisible("Test Category");
  });

  test("should validate category name uniqueness", async ({ page }) => {
    await categoriesPage.goto();

    // Create first category
    await categoriesPage.createCategory({
      name: "Duplicate Test",
      slug: "duplicate-test",
    });

    await categoriesPage.verifyCategoryVisible("Duplicate Test");

    // Try to create duplicate
    await categoriesPage.clickNewCategory();
    await categoriesPage.fillCategoryForm({
      name: "Duplicate Test",
      slug: "different-slug",
    });
    await categoriesPage.submit();

    // Should show error
    await categoriesPage.waitForNotification();
    await categoriesPage.verifyNotificationMessage("already exists");
  });

  test("should validate slug format", async ({ page }) => {
    await categoriesPage.goto();
    await categoriesPage.clickNewCategory();

    // Invalid slug with spaces
    await categoriesPage.fillCategoryForm({
      name: "Test Category",
      slug: "test category with spaces",
    });
    await categoriesPage.submit();

    // Should show validation error
    await categoriesPage.waitForNotification();
    await categoriesPage.verifyNotificationMessage("slug");
  });

  test("should pass accessibility checks", async ({ page }) => {
    await categoriesPage.goto();

    // Import dynamically to avoid issues if axe-core is not available
    const AxeBuilder = (await import("@axe-core/playwright")).default;
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
