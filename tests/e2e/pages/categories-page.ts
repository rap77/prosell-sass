/**
 * CategoriesPage - Page Object for Category management
 */

import { Page, expect } from "@playwright/test";
import { BasePage } from "../base-page";

export class CategoriesPage extends BasePage {
  // Locators
  readonly newCategoryButton = this.page.getByRole("button", { name: /new category|crear categoría/i });
  readonly categoryNameInput = this.page.getByLabel(/name|nombre/i);
  readonly categorySlugInput = this.page.getByLabel(/slug/i);
  readonly categoryDescriptionInput = this.page.getByLabel(/description|descripción/i);
  readonly saveButton = this.page.getByRole("button", { name: /save|guardar/i });
  readonly cancelButton = this.page.getByRole("button", { name: /cancel|cancelar/i });

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to categories page
   */
  async goto(): Promise<void> {
    await super.goto("/categories");
  }

  /**
   * Click "New Category" button
   */
  async clickNewCategory(): Promise<void> {
    await this.newCategoryButton.click();
  }

  /**
   * Fill category form
   */
  async fillCategoryForm(data: {
    name: string;
    slug?: string;
    description?: string;
  }): Promise<void> {
    await this.categoryNameInput.fill(data.name);
    if (data.slug) {
      await this.categorySlugInput.fill(data.slug);
    }
    if (data.description) {
      await this.categoryDescriptionInput.fill(data.description);
    }
  }

  /**
   * Submit the form
   */
  async submit(): Promise<void> {
    await this.saveButton.click();
    await this.page.waitForLoadState("load");
  }

  /**
   * Create a new category
   */
  async createCategory(data: {
    name: string;
    slug?: string;
    description?: string;
  }): Promise<void> {
    await this.clickNewCategory();
    await this.fillCategoryForm(data);
    await this.submit();
  }

  /**
   * Find category card by name
   */
  findCategoryByName(name: string) {
    return this.page.getByRole("heading", { name }).locator("../../..");
  }

  /**
   * Verify category is visible in list
   */
  async verifyCategoryVisible(name: string): Promise<void> {
    await expect(this.findCategoryByName(name)).toBeVisible();
  }
}
