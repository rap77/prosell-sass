/**
 * Mock Endpoint Helpers for E2E Tests
 *
 * Provides reusable mock setup functions for API endpoints.
 * Use these in test.beforeEach() to avoid code duplication.
 */

import type { Page } from "@playwright/test";
import { MOCK_VIN_DECODED } from "../fixtures/mock-data";

interface MockCategory {
  id: string;
  name: string;
  slug: string;
  attribute_schema: Record<string, boolean>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface MockProduct {
  id: string;
  name: string;
  category_id: string;
  status: string;
  created_at: string;
}

interface MockVehicleData {
  vin: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  engine: string;
  body_type: string;
  drivetrain: string;
  transmission: string;
  fuel_type: string;
}

/**
 * Mock categories endpoint
 */
export async function mockCategoriesEndpoint(
  page: Page,
  categories: MockCategory[] = []
): Promise<void> {
  await page.route("**/api/v1/categories**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          categories,
          total: categories.length,
        }),
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Mock VIN decode endpoint
 */
export async function mockVinDecodeEndpoint(
  page: Page,
  vin: string,
  vehicleData?: Partial<MockVehicleData>
): Promise<void> {
  await page.route("**/api/v1/vehicles/decode-vin**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        vehicle: vehicleData ?? { ...MOCK_VIN_DECODED, vin },
      }),
    });
  });
}

/**
 * Mock image upload endpoints (presigned URL + status check)
 */
export async function mockImageUploadEndpoints(page: Page): Promise<void> {
  // Mock presigned URL endpoint
  await page.route("**/api/v1/images/upload-url", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          upload_url: `https://mock-spaces.com/upload/${Date.now()}`,
          public_url: `https://mock-spaces.com/public/image-${Date.now()}.jpg`,
          key: `orgs/test-org/vehicles/${Date.now()}.jpg`,
          fileId: `file-${Date.now()}`,
        }),
      });
    }
  });

  // Mock upload URL PUT request (direct to cloud)
  await page.route("**/mock-spaces.com/upload/**", async (route) => {
    if (route.request().method() === "PUT") {
      await route.fulfill({
        status: 200,
        body: "",
      });
    }
  });

  // Mock processing status endpoint
  await page.route("**/api/v1/images/status/**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "complete",
          url: `https://mock-spaces.com/public/final-${Date.now()}.jpg`,
        }),
      });
    }
  });
}

/**
 * Mock products endpoint for DataGrid
 */
export async function mockProductsEndpoint(page: Page, products: MockProduct[]): Promise<void> {
  await page.route("**/api/v1/products**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        products,
        total: products.length,
        page: 1,
        page_size: 20,
      }),
    });
  });
}

/**
 * Mock OAuth endpoints
 */
export async function mockOAuthEndpoints(page: Page): Promise<void> {
  // Mock Google OAuth
  await page.route("**/api/v1/auth/oauth/google**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        url: "https://accounts.google.com/o/oauth2/v2/auth",
      }),
    });
  });

  // Mock Facebook OAuth
  await page.route("**/api/v1/auth/oauth/facebook**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        url: "https://www.facebook.com/v18.0/dialog/oauth",
      }),
    });
  });
}

/**
 * Mock health check endpoint
 */
export async function mockHealthCheckEndpoint(page: Page): Promise<void> {
  await page.route("**/api/health**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "healthy",
        version: "1.0.0",
      }),
    });
  });
}
