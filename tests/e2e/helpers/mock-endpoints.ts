/**
 * Mock Endpoint Helpers for E2E Tests
 *
 * Provides reusable mock setup functions for API endpoints.
 * Use these in test.beforeEach() to avoid code duplication.
 */

import type { Page } from "@playwright/test";
import { MOCK_VIN_DECODED, MOCK_VEHICLE_LIST } from "../fixtures/mock-data";

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

type MockVehicleItem = (typeof MOCK_VEHICLE_LIST)[number];

/**
 * Mock vehicles endpoint (GET /api/v1/vehicles)
 *
 * Intercepts all GET requests to the vehicles list endpoint and returns
 * mock data. Supports filtering by query params: make, status, year_min, year_max.
 *
 * Only intercepts GET requests — POST/PATCH/DELETE continue to real backend.
 */
export async function mockVehiclesEndpoint(
  page: Page,
  vehicles: MockVehicleItem[] = MOCK_VEHICLE_LIST
): Promise<void> {
  await page.route("**/api/v1/vehicles**", async (route) => {
    const request = route.request();

    // Only intercept GET list requests — not individual vehicle fetches, bulk upload, etc.
    if (request.method() !== "GET") {
      await route.continue();
      return;
    }

    const url = new URL(request.url());
    const pathname = url.pathname;

    // Skip individual vehicle routes like /api/v1/vehicles/{id} or /api/v1/vehicles/decode-vin
    if (pathname.match(/\/api\/v1\/vehicles\/[^?]+/)) {
      await route.continue();
      return;
    }

    // Apply query param filters
    const makeFilter = url.searchParams.get("make");
    const statusFilter = url.searchParams.get("status");
    const yearMinFilter = url.searchParams.get("year_min");
    const yearMaxFilter = url.searchParams.get("year_max");

    let filtered = [...vehicles];

    if (makeFilter) {
      filtered = filtered.filter(
        (v) => v.make.toLowerCase() === makeFilter.toLowerCase()
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(
        (v) => v.product.status.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    if (yearMinFilter) {
      const yearMin = parseInt(yearMinFilter, 10);
      filtered = filtered.filter((v) => v.year >= yearMin);
    }

    if (yearMaxFilter) {
      const yearMax = parseInt(yearMaxFilter, 10);
      filtered = filtered.filter((v) => v.year <= yearMax);
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: filtered,
        next_cursor: null,
        has_more: false,
      }),
    });
  });
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
