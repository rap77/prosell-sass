/**
 * ProductsPage - Page Object for Product management
 */

import { Page, expect } from "@playwright/test";
import { BasePage } from "../base-page";

export class ProductsPage extends BasePage {
  // Locators
  readonly newProductButton = this.page.getByRole("button", { name: /new product|crear producto/i });
  readonly productTitleInput = this.page.getByLabel(/title|título/i });
  readonly productDescriptionInput = this.page.getByLabel(/description|descripción/i });
  readonly productPriceInput = this.page.getByLabel(/price|precio/i);
  readonly productConditionSelect = this.page.getByLabel(/condition|condición/i);
  readonly productCategorySelect = this.page.getByLabel(/category|categoría/i);
  readonly saveButton = this.page.getByRole("button", { name: /save|guardar/i });
  readonly submitForApprovalButton = this.page.getByRole("button", { name: /submit|enviar/i });

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to products page
   */
  async goto(): Promise<void> {
    await this.goto("/products");
  }

  /**
   * Click "New Product" button
   */
  async clickNewProduct(): Promise<void> {
    await this.newProductButton.click();
  }

  /**
   * Fill product form
   */
  async fillProductForm(data: {
    title: string;
    description?: string;
    price?: string;
    condition?: string;
    category?: string;
  }): Promise<void> {
    await this.productTitleInput.fill(data.title);
    if (data.description) {
      await this.productDescriptionInput.fill(data.description);
    }
    if (data.price) {
      await this.productPriceInput.fill(data.price);
    }
    if (data.condition) {
      await this.productConditionSelect.selectOption(data.condition);
    }
    if (data.category) {
      await this.productCategorySelect.selectOption(data.category);
    }
  }

  /**
   * Submit the form
   */
  async submit(): Promise<void> {
    await this.saveButton.click();
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Create a new product
   */
  async createProduct(data: {
    title: string;
    description?: string;
    price?: string;
    condition?: string;
    category?: string;
  }): Promise<void> {
    await this.clickNewProduct();
    await this.fillProductForm(data);
    await this.submit();
  }

  /**
   * Find product card by title
   */
  findProductByTitle(title: string) {
    return this.page.getByRole("heading", { name: title }).locator("../../..");
  }

  /**
   * Verify product is visible in list
   */
  async verifyProductVisible(title: string): Promise<void> {
    await expect(this.findProductByTitle(title)).toBeVisible();
  }

  /**
   * Submit product for approval
   */
  async submitForApproval(title: string): Promise<void> {
    const productCard = this.findProductByTitle(title);
    await productCard.getByRole("button", { name: /submit/i }).click();
    await this.page.waitForLoadState("networkidle");
  }
}
