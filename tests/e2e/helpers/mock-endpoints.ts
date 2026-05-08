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

// Store multiple VIN mocks in a Map
const vinMockStore = new Map<string, Partial<MockVehicleData>>();

/**
 * Mock vehicles endpoint (GET /api/v1/vehicles and GET /api/v1/products)
 *
 * The catalog page uses GET /api/v1/products internally (via useInfiniteVehicles),
 * so we mock both endpoints to support both usage patterns.
 *
 * Only intercepts GET requests — POST/PATCH/DELETE continue to real backend.
 */
export async function mockVehiclesEndpoint(
  page: Page,
  vehicles: MockVehicleItem[] = MOCK_VEHICLE_LIST
): Promise<void> {
  // Also mock /api/v1/products so the catalog DataGrid can render via useInfiniteVehicles
  await page.route("**/api/v1/products**", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      await route.continue();
      return;
    }
    // Return products in the format useInfiniteVehicles expects
    const products = vehicles.map((v, i) => ({
      id: v.product?.id || `prod-${i}`,
      tenant_id: "test-tenant",
      organization_id: "test-org",
      category_id: v.product?.category_id || "cat-1",
      title: v.product?.title || `${v.year} ${v.make} ${v.model}`,
      slug: null,
      description: null,
      price_cents: v.product?.price_cents || 0,
      currency: "USD",
      condition: "used",
      status: v.product?.status || "published",
      attributes: {
        category: "vehicle",
        vin: v.vin,
        year: v.year,
        make: v.make,
        model: v.model,
        trim: v.trim || null,
        mileage: v.mileage || 0,
        exterior_color: v.exterior_color || null,
        interior_color: v.interior_color || null,
      },
      location_city: null,
      location_state: null,
      location_zip: null,
      is_featured: false,
      view_count: 0,
      favorite_count: 0,
      submitted_for_approval_at: null,
      submitted_by: null,
      approved_at: null,
      approved_by: null,
      rejection_reason: null,
      published_at: v.product?.created_at || "2026-01-01T00:00:00Z",
      sold_at: null,
      archived_at: null,
      created_at: v.product?.created_at || "2026-01-01T00:00:00Z",
      updated_at: v.product?.created_at || "2026-01-01T00:00:00Z",
    }));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        products,
        total: products.length,
        skip: 0,
        limit: 50,
      }),
    });
  });

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
 * Clear VIN mock store (call this in beforeEach to reset state)
 */
export function clearVinMocks(): void {
  vinMockStore.clear();
}

/**
 * Mock VIN decode endpoint
 * FIXED: Now supports multiple VIN mocks by storing them in a Map and checking the requested VIN
 */
export async function mockVinDecodeEndpoint(
  page: Page,
  vin: string,
  vehicleData?: Partial<MockVehicleData>
): Promise<void> {
  // Store this VIN mock
  vinMockStore.set(vin, vehicleData ?? { ...MOCK_VIN_DECODED, vin });

  // Set up route handler (only once per page)
  await page.route("**/api/v1/vehicles/decode-vin**", async (route) => {
    // Read VIN from POST body (frontend sends it as JSON)
    const postData = await route.request().postDataJSON();
    const requestedVin = postData?.vin;

    if (!requestedVin) {
      await route.continue();
      return;
    }

    // Check if we have a mock for this VIN
    const mockVehicle = vinMockStore.get(requestedVin);

    if (mockVehicle) {
      // Return mocked data
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          vin: requestedVin,
          vehicle: {
            year: mockVehicle.year,
            make: mockVehicle.make,
            model: mockVehicle.model,
            trim: mockVehicle.trim,
            body_type: mockVehicle.body_type,
            drivetrain: mockVehicle.drivetrain,
            transmission: mockVehicle.transmission,
            engine: mockVehicle.engine,
            fuel_type: mockVehicle.fuel_type,
          },
          raw_data: {},
          cached: false,
        }),
      });
    } else {
      // No mock for this VIN, continue to real API
      await route.continue();
    }
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
