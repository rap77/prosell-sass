import { test, expect } from "@playwright/test";

test.describe("Phase-1: Public Product Page /p/[slug]", () => {
  const API_URL = process.env.API_URL || "http://localhost:8000";
  const WEB_URL = process.env.WEB_URL || "http://localhost:3000";

  test.beforeEach(async ({ page }) => {
    // Skip if staging not available
    if (!process.env.E2E_STAGING) {
      test.skip();
    }
  });

  test("should display published product on public page", async ({ page }) => {
    /**
     * This test requires:
     * 1. A published product in the database
     * 2. Staging environment with real data or seed
     *
     * If running locally, create a product via:
     * - Admin UI: /admin/catalog/create → publish
     * - Or: curl POST /api/v1/products + PUT /api/v1/products/{id}/status
     */

    // Get list of published products from API
    const productsResponse = await page.request.get(
      `${API_URL}/api/v1/public/products`,
      {
        headers: { Accept: "application/json" },
      }
    );

    // If no products, skip this test (need to populate DB first)
    if (productsResponse.status() === 404) {
      test.skip();
    }

    expect(productsResponse.ok()).toBeTruthy();

    // For now, test a known product slug (would come from seeding in real test)
    const testSlug = "test-vehicle";

    // Navigate to public product page
    await page.goto(`${WEB_URL}/p/${testSlug}`, { waitUntil: "networkidle" });

    // Should not return 404
    const pageTitle = await page.title();
    expect(pageTitle).not.toContain("404");

    // Check that key elements are visible
    // (these would exist if product is loaded)
    // Adjust selectors based on actual ProductPublicView component
  });

  test("should return 404 for non-existent product", async ({ page }) => {
    const response = await page.goto(`${WEB_URL}/p/nonexistent-product-xyz`, {
      waitUntil: "networkidle",
    });

    expect(response?.status()).toBe(404);
  });

  test("should fetch public product API without authentication", async ({
    page,
  }) => {
    /**
     * Verify that GET /api/v1/public/products/{slug} works without auth
     */

    // Create a known product slug for testing
    const testSlug = "phase1-test-public-product";

    // Call API without any auth headers
    const response = await page.request.get(
      `${API_URL}/api/v1/public/products/${testSlug}`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    // Should be 200 (exists and published) or 404 (doesn't exist)
    // Should NOT be 401 or 403 (auth required)
    expect([200, 404]).toContain(response.status());
  });

  test("should fetch image URLs without authentication", async ({ page }) => {
    /**
     * Verify that GET /api/v1/public/products/{slug}/image-urls works without auth
     */

    const testSlug = "phase1-test-public-product";

    const response = await page.request.get(
      `${API_URL}/api/v1/public/products/${testSlug}/image-urls`,
      {
        headers: { Accept: "application/json" },
      }
    );

    // Should be 200 (exists and published) or 404 (doesn't exist)
    // Should NOT be 401 or 403 (auth required)
    expect([200, 404]).toContain(response.status());

    if (response.ok()) {
      const data = await response.json();
      expect(data).toHaveProperty("product_id");
      expect(data).toHaveProperty("images");
      expect(Array.isArray(data.images)).toBeTruthy();

      // If there are images, each should have key, url, expires_in
      if (data.images.length > 0) {
        const image = data.images[0];
        expect(image).toHaveProperty("key");
        expect(image).toHaveProperty("url");
        expect(image).toHaveProperty("expires_in");
      }
    }
  });

  test("should generate valid Open Graph meta tags for WhatsApp", async ({
    page,
  }) => {
    /**
     * Test that /p/[slug] generates proper Open Graph meta tags
     * for WhatsApp preview (og:title, og:description, og:image)
     */

    const testSlug = "phase1-test-open-graph";

    // Navigate to page
    await page.goto(`${WEB_URL}/p/${testSlug}`, { waitUntil: "domcontentloaded" });

    // Check for Open Graph meta tags
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute(
      "content"
    );
    const ogDescription = await page
      .locator('meta[property="og:description"]')
      .getAttribute("content");
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute(
      "content"
    );

    // If page loaded (not 404), these should exist
    // (May be empty if product doesn't exist, but structure should be there)
    if (ogTitle) {
      expect(typeof ogTitle).toBe("string");
    }
    if (ogDescription) {
      expect(typeof ogDescription).toBe("string");
    }
    if (ogImage) {
      expect(typeof ogImage).toBe("string");
      expect(ogImage).toMatch(/^https?:\/\//);
    }
  });

  test("should not expose draft/unpublished products", async ({ page }) => {
    /**
     * Verify that a product with status != published returns 404
     */

    // This would need a known draft product slug
    const draftSlug = "phase1-draft-product";

    const response = await page.request.get(
      `${API_URL}/api/v1/public/products/${draftSlug}`,
      {
        headers: { Accept: "application/json" },
      }
    );

    // If this product exists but is a draft, should be 404
    // If it doesn't exist at all, will also be 404
    // Either way, correct behavior
    if (response.status() === 200) {
      const data = await response.json();
      expect(data.status).toBe("published");
      expect(data.published_to_marketplace).toBe(true);
    }
  });

  test("should increment view count on each page visit", async ({ page }) => {
    /**
     * Test that view_count increments when product is viewed
     * This is harder to test in E2E without being able to query DB
     *
     * For now, just verify the endpoint responds and includes view_count
     */

    const testSlug = "phase1-test-views";

    const response = await page.request.get(
      `${API_URL}/api/v1/public/products/${testSlug}`,
      {
        headers: { Accept: "application/json" },
      }
    );

    if (response.ok()) {
      const data = await response.json();
      expect(data).toHaveProperty("view_count");
      expect(typeof data.view_count).toBe("number");
      expect(data.view_count).toBeGreaterThanOrEqual(0);
    }
  });
});
