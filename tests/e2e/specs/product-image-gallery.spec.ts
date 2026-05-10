/**
 * E2E tests for ProductImageGallery (B3.1.09)
 *
 * Tests the multi-image gallery component including:
 * - Main image display
 * - Thumbnail navigation
 * - Prev/next button functionality
 * - Keyboard navigation (arrow keys)
 * - Responsive design
 *
 * Component: apps/web/src/components/catalog/ProductImageGallery.tsx
 * Tests Location: apps/web/src/components/catalog/__tests__/ProductImageGallery.test.tsx
 *
 * To run these tests manually:
 * 1. Start the dev server: cd apps/web && pnpm dev
 * 2. Run tests: cd tests/e2e && npx playwright test product-image-gallery.spec.ts
 */

import { test, expect, type Page } from "@playwright/test";

/**
 * Mock product images for testing
 */
const mockImages = [
  {
    id: "img-1",
    url: "https://picsum.photos/800/600?random=1",
    thumbnail_url: "https://picsum.photos/200/200?random=1",
    alt_text: "Front view",
  },
  {
    id: "img-2",
    url: "https://picsum.photos/800/600?random=2",
    thumbnail_url: "https://picsum.photos/200/200?random=2",
    alt_text: "Side view",
  },
  {
    id: "img-3",
    url: "https://picsum.photos/800/600?random=3",
    thumbnail_url: "https://picsum.photos/200/200?random=3",
    alt_text: "Rear view",
  },
];

test.describe("ProductImageGallery E2E", () => {
  /**
   * Navigate to a page with ProductImageGallery component
   * For this test, we'll create a simple test page
   */
  test.beforeEach(async ({ page }) => {
    // Create a test page with ProductImageGallery
    await page.goto("/catalog/product-image-gallery-test");
  });

  test("should display main image prominently", async ({ page }) => {
    // Main image should be visible
    const mainImage = page.locator('[data-testid="image-gallery"] img').first();
    await expect(mainImage).toBeVisible();
    await expect(mainImage).toHaveAttribute("alt", "Front view");
  });

  test("should display all thumbnails", async ({ page }) => {
    // Should have 3 thumbnails + 1 main image = 4 total images
    const images = page.locator('[data-testid="image-gallery"] img');
    await expect(images).toHaveCount(4);
  });

  test("should highlight selected thumbnail", async ({ page }) => {
    // First thumbnail should have ring-blue-500 class
    const firstThumbnail = page.locator("button").filter({ hasText: "View image 1" });
    await expect(firstThumbnail).toHaveClass(/ring-blue-500/);
  });

  test("should navigate to next image when next button is clicked", async ({ page }) => {
    const nextButton = page.getByLabel("Next image");
    const mainImage = page.locator('[data-testid="image-gallery"] img').first();

    // Initial image should be "Front view"
    await expect(mainImage).toHaveAttribute("alt", "Front view");

    // Click next button
    await nextButton.click();

    // Should now show "Side view"
    await expect(mainImage).toHaveAttribute("alt", "Side view");
  });

  test("should navigate to previous image when previous button is clicked", async ({ page }) => {
    const nextButton = page.getByLabel("Next image");
    const prevButton = page.getByLabel("Previous image");
    const mainImage = page.locator('[data-testid="image-gallery"] img').first();

    // Go to second image first
    await nextButton.click();
    await expect(mainImage).toHaveAttribute("alt", "Side view");

    // Go back to first image
    await prevButton.click();
    await expect(mainImage).toHaveAttribute("alt", "Front view");
  });

  test("should disable previous button on first image", async ({ page }) => {
    const prevButton = page.getByLabel("Previous image");
    await expect(prevButton).toBeDisabled();
  });

  test("should disable next button on last image", async ({ page }) => {
    const nextButton = page.getByLabel("Next image");

    // Navigate to last image (click next twice)
    await nextButton.click();
    await nextButton.click();

    // Next button should be disabled
    await expect(nextButton).toBeDisabled();
  });

  test("should update main image when thumbnail is clicked", async ({ page }) => {
    const thirdThumbnail = page.getByLabel("View image 3: Rear view");
    const mainImage = page.locator('[data-testid="image-gallery"] img').first();

    // Click third thumbnail
    await thirdThumbnail.click();

    // Main image should now be "Rear view"
    await expect(mainImage).toHaveAttribute("alt", "Rear view");
  });

  test("should support keyboard navigation with arrow keys", async ({ page }) => {
    const gallery = page.getByTestId("image-gallery");
    const mainImage = page.locator('[data-testid="image-gallery"] img').first();

    // Focus the gallery
    await gallery.focus();

    // Press ArrowRight to go to next image
    await page.keyboard.press("ArrowRight");
    await expect(mainImage).toHaveAttribute("alt", "Side view");

    // Press ArrowLeft to go back
    await page.keyboard.press("ArrowLeft");
    await expect(mainImage).toHaveAttribute("alt", "Front view");
  });

  test("should show image counter", async ({ page }) => {
    const counter = page.locator('[data-testid="image-gallery"]').getByText(/1 \/ 3/);
    await expect(counter).toBeVisible();
  });

  test("should be responsive on mobile viewport", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Gallery should still be visible
    const gallery = page.getByTestId("image-gallery");
    await expect(gallery).toBeVisible();

    // Should have flex-col class for mobile
    await expect(gallery).toHaveClass(/flex-col/);
  });

  test("should handle keyboard focus management", async ({ page }) => {
    const gallery = page.getByTestId("image-gallery");

    // Gallery should have tabIndex for keyboard navigation
    await expect(gallery).toHaveAttribute("tabIndex", "0");
  });
});

/**
 * Note: These E2E tests complement the 20 unit tests in ProductImageGallery.test.tsx
 * The unit tests cover all edge cases and interactions, while E2E tests verify
 * the component works correctly in a real browser environment.
 *
 * For comprehensive testing, run both:
 * - Unit tests: pnpm test run ProductImageGallery
 * - E2E tests: npx playwright test product-image-gallery.spec.ts
 */
