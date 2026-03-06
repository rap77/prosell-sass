/**
 * API Tests for Categories, Products, Vehicles
 * Tests the backend endpoints directly without UI
 */

import { expect, test } from "@playwright/test";

const API_BASE = process.env.API_BASE_URL || "http://localhost:8000";

test.describe("API: Categories", () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    // Login to get auth token
    const loginResponse = await request.post(`${API_BASE}/api/v1/auth/login`, {
      data: {
        email: "test@example.com",
        password: "testpassword123",
      },
    });

    if (loginResponse.ok()) {
      const cookies = loginResponse.headers()["set-cookie"] || "";
      const match = cookies.match(/access_token=([^;]+)/);
      authToken = match ? match[1] : "";
    }
  });

  test("GET /api/v1/categories - should list categories", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/v1/categories`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty("categories");
    expect(Array.isArray(data.categories)).toBeTruthy();
  });

  test("POST /api/v1/categories - should create category", async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/v1/categories`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      data: {
        name: `API Test Category ${Date.now()}`,
        slug: `api-test-${Date.now()}`,
        description: "Created via API e2e test",
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty("id");
    expect(data).toHaveProperty("name");
  });

  test("POST /api/v1/categories - should validate slug format", async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/v1/categories`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      data: {
        name: "Test Category",
        slug: "invalid slug with spaces",
      },
    });

    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBe(422); // Validation error
  });
});

test.describe("API: Products", () => {
  let authToken: string;
  let categoryId: string;

  test.beforeAll(async ({ request }) => {
    // Login and create a category
    const loginResponse = await request.post(`${API_BASE}/api/v1/auth/login`, {
      data: {
        email: "test@example.com",
        password: "testpassword123",
      },
    });

    if (loginResponse.ok()) {
      const cookies = loginResponse.headers()["set-cookie"] || "";
      const match = cookies.match(/access_token=([^;]+)/);
      authToken = match ? match[1] : "";
    }

    // Create a test category
    const categoryResponse = await request.post(`${API_BASE}/api/v1/categories`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      data: {
        name: "Test Category",
        slug: `test-${Date.now()}`,
      },
    });

    if (categoryResponse.ok()) {
      const categoryData = await categoryResponse.json();
      categoryId = categoryData.id;
    }
  });

  test("GET /api/v1/products - should list products", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/v1/products`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty("products");
    expect(Array.isArray(data.products)).toBeTruthy();
  });

  test("POST /api/v1/products - should create product", async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/v1/products`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      data: {
        title: `API Test Product ${Date.now()}`,
        description: "Created via API e2e test",
        price_cents: 10000,
        condition: "new",
        category_id: categoryId,
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty("id");
    expect(data.status).toBe("draft");
  });

  test("POST /api/v1/products - should validate title is required", async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/v1/products`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      data: {
        description: "No title provided",
        price_cents: 10000,
      },
    });

    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBe(422);
  });
});

test.describe("API: Vehicles", () => {
  test("POST /api/v1/vehicles/decode-vin - should decode valid VIN", async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/v1/vehicles/decode-vin`, {
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        vin: "1HGCM826712345678", // Valid checksum
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty("vin");
    expect(data).toHaveProperty("vehicle");
    expect(data.vehicle).toHaveProperty("make");
    expect(data.vehicle).toHaveProperty("model");
  });

  test("POST /api/v1/vehicles/decode-vin - should reject invalid VIN length", async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/v1/vehicles/decode-vin`, {
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        vin: "123", // Too short
      },
    });

    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBe(422);
  });

  test("POST /api/v1/vehicles/decode-vin - should reject invalid characters", async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/v1/vehicles/decode-vin`, {
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        vin: "1HGCM82633A12345I", // Contains I
      },
    });

    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBe(422);
  });

  test("POST /api/v1/vehicles/decode-vin - should validate checksum", async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/v1/vehicles/decode-vin`, {
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        vin: "1HGCM826012345678", // Invalid checksum
      },
    });

    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBe(422);
  });

  test("POST /api/v1/vehicles/decode-vin - should cache results", async ({ request }) => {
    const vin = "1HGCM826712345678";

    // First request
    const response1 = await request.post(`${API_BASE}/api/v1/vehicles/decode-vin`, {
      headers: {
        "Content-Type": "application/json",
      },
      data: { vin },
    });

    expect(response1.ok()).toBeTruthy();
    const data1 = await response1.json();

    // Second request should use cache
    const response2 = await request.post(`${API_BASE}/api/v1/vehicles/decode-vin`, {
      headers: {
        "Content-Type": "application/json",
      },
      data: { vin },
    });

    expect(response2.ok()).toBeTruthy();
    const data2 = await response2.json();

    expect(data1.vehicle).toEqual(data2.vehicle);
  });
});
