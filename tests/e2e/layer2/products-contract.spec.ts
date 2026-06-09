/**
 * Layer 2 Contract Tests - Product Lifecycle
 *
 * Validates product endpoints with full contract validation:
 * - Pydantic structure validation
 * - Field format checks (UUID, datetime, enums)
 * - Business rules (status transitions, validation constraints)
 * - Multiple test scenarios (valid, invalid, edge cases)
 *
 * Endpoints tested:
 * - POST /api/v1/products (create product)
 * - GET /api/v1/products (list products)
 * - GET /api/v1/products/{id} (get product details)
 * - PATCH /api/v1/products/{id} (update product)
 * - DELETE /api/v1/products/{id} (delete product)
 * - POST /api/v1/products/{id}/submit (submit for approval)
 * - POST /api/v1/products/{id}/approve (approve product)
 * - POST /api/v1/products/{id}/reject (reject product)
 * - POST /api/v1/products/{id}/pause (pause product)
 * - POST /api/v1/products/{id}/resume (resume product)
 * - POST /api/v1/products/{id}/mark-sold (mark as sold)
 *
 * Contract Validation Rules:
 * - title: required, string, 1-500 chars
 * - price_cents: required, integer >= 0
 * - category_id: required, valid UUID
 * - condition: required, enum (new, used, certified_pre_owned, refurbished)
 * - status: required, enum (draft, pending, published, rejected, paused, archived, sold, reserved)
 * - attributes: optional, object (vehicle attributes: vin, year, make, model, mileage, etc.)
 * - created_at/updated_at: required, ISO datetime format
 * - tenant_id/organization_id: required, UUID
 */

import { test, expect } from "../fixtures/auth";

// Helper function to get a real category ID from the database
async function getVehiclesCategoryId(
  authenticatedRequest: any,
): Promise<string> {
  const response = await authenticatedRequest.get("/api/v1/categories");
  expect(response.status()).toBe(200);

  const body = await response.json();
  const categories = body.categories || body;

  // Find the Vehicles category (seeded by init_data.py)
  const vehiclesCategory = categories.find(
    (cat: any) => cat.slug === "vehicles",
  );
  expect(vehiclesCategory).toBeDefined();

  return vehiclesCategory.id;
}

test.describe("Layer 2: Product Lifecycle - Contract Validation", () => {
  let categoryId: string;

  test.beforeAll(async ({ authenticatedRequest }) => {
    // Get a real category ID from the database
    categoryId = await getVehiclesCategoryId(authenticatedRequest);
  });

  // ============================================
  // GROUP 1: Product Creation (POST /api/v1/products)
  // ============================================
  test.describe("POST /api/v1/products - Create Product", () => {
    test("P-01: should create product with vehicle attributes", async ({
      authenticatedRequest,
    }) => {
      // Arrange: Generate fresh test data
      const productData = {
        title: "2017 Toyota Camry SE",
        price_cents: 1500000, // $15,000.00
        category_id: categoryId,
        condition: "used",
        attributes: {
          vin: "2GNALBEK8H1615946",
          year: 2017,
          make: "chevrolet",
          model: "equinox",
          body_type: "suv",
          mileage: 50000, // Required field for vehicle attributes
        },
      };

      // Act: Create product via API
      const response = await authenticatedRequest.post("/api/v1/products", {
        data: productData,
      });

      // Assert: Verify response structure (Pydantic validation)
      expect(response.status()).toBe(201);

      const body = await response.json();
      expect(body).toHaveProperty("id");
      expect(body).toHaveProperty("title", "2017 Toyota Camry SE");
      expect(body).toHaveProperty("price_cents", 1500000);
      expect(body).toHaveProperty("status", "draft"); // Default status
      expect(body).toHaveProperty("condition", "used");
      expect(body).toHaveProperty("created_at");
      expect(body).toHaveProperty("updated_at");
      expect(body).toHaveProperty("tenant_id");
      expect(body).toHaveProperty("organization_id");

      // Assert: Verify field formats (Contract validation)
      // UUID format validation
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(body.id).toMatch(uuidRegex);
      expect(body.tenant_id).toMatch(uuidRegex);
      expect(body.organization_id).toMatch(uuidRegex);

      // ISO datetime format validation
      const datetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
      expect(body.created_at).toMatch(datetimeRegex);
      expect(body.updated_at).toMatch(datetimeRegex);

      // Assert: Verify attributes object structure
      expect(body).toHaveProperty("attributes");
      expect(body.attributes).toHaveProperty("vin", "2GNALBEK8H1615946");
      expect(body.attributes).toHaveProperty("year", 2017);
      expect(body.attributes).toHaveProperty("make", "chevrolet");
      expect(body.attributes).toHaveProperty("model", "equinox");
      expect(body.attributes).toHaveProperty("body_type", "suv");
      expect(body.attributes).toHaveProperty("mileage", 50000);
    });

    test("P-02: should reject product without title", async ({
      authenticatedRequest,
    }) => {
      // Arrange: Missing required field
      const productData = {
        price_cents: 1500000,
        category_id: categoryId,
        condition: "used",
        attributes: {
          mileage: 50000,
        },
      };

      // Act: Attempt to create product
      const response = await authenticatedRequest.post("/api/v1/products", {
        data: productData,
      });

      // Assert: Verify validation error
      expect(response.status()).toBe(422);

      const body = await response.json();
      expect(body).toHaveProperty("detail");
    });

    test("P-03: should reject product with invalid price_cents", async ({
      authenticatedRequest,
    }) => {
      // Arrange: Invalid negative price
      const productData = {
        title: "Test Product",
        price_cents: -100, // Invalid: negative
        category_id: categoryId,
        condition: "used",
        attributes: {
          mileage: 50000,
        },
      };

      // Act: Attempt to create product
      const response = await authenticatedRequest.post("/api/v1/products", {
        data: productData,
      });

      // Assert: Verify validation error
      expect(response.status()).toBe(422);

      const body = await response.json();
      expect(body).toHaveProperty("detail");
    });

    test("P-04: should reject product with invalid condition", async ({
      authenticatedRequest,
    }) => {
      // Arrange: Invalid enum value
      const productData = {
        title: "Test Product",
        price_cents: 1500000,
        category_id: categoryId,
        condition: "invalid-condition", // Invalid enum
        attributes: {
          mileage: 50000,
        },
      };

      // Act: Attempt to create product
      const response = await authenticatedRequest.post("/api/v1/products", {
        data: productData,
      });

      // Assert: Verify validation error
      expect(response.status()).toBe(422);

      const body = await response.json();
      expect(body).toHaveProperty("detail");
    });

    test("P-05: should reject product without category_id", async ({
      authenticatedRequest,
    }) => {
      // Arrange: Missing required field
      const productData = {
        title: "Test Product",
        price_cents: 1500000,
        condition: "used",
        attributes: {
          mileage: 50000,
        },
      };

      // Act: Attempt to create product
      const response = await authenticatedRequest.post("/api/v1/products", {
        data: productData,
      });

      // Assert: Verify validation error
      expect(response.status()).toBe(422);

      const body = await response.json();
      expect(body).toHaveProperty("detail");
    });
  });

  // ============================================
  // GROUP 2: Product List (GET /api/v1/products)
  // ============================================
  test.describe("GET /api/v1/products - List Products", () => {
    test("P-06: should return paginated product list", async ({
      authenticatedRequest,
    }) => {
      // Act: Get product list
      const response = await authenticatedRequest.get(
        "/api/v1/products?limit=10&offset=0",
      );

      // Assert: Verify response structure
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty("products"); // Note: uses 'products' not 'items'
      expect(body).toHaveProperty("total");
      expect(body).toHaveProperty("limit", 10);
      expect(body).toHaveProperty("skip", 0); // API uses 'skip' not 'offset'
      expect(Array.isArray(body.products)).toBe(true);
    });

    test("P-07: should filter products by status", async ({
      authenticatedRequest,
    }) => {
      // Act: Filter by status
      const response = await authenticatedRequest.get(
        "/api/v1/products?status=draft",
      );

      // Assert: Verify response structure
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty("products");

      // Assert: Verify all products have the requested status
      if (body.products.length > 0) {
        body.products.forEach((product: any) => {
          expect(product.status).toBe("draft");
        });
      }
    });

    test("P-08: should filter products by category", async ({
      authenticatedRequest,
    }) => {
      // Act: Filter by category
      const response = await authenticatedRequest.get(
        `/api/v1/products?category_id=${categoryId}`,
      );

      // Assert: Verify response structure
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty("products");
    });

    test("P-09: should filter products by condition", async ({
      authenticatedRequest,
    }) => {
      // Act: Filter by condition
      const response = await authenticatedRequest.get(
        "/api/v1/products?condition=used",
      );

      // Assert: Verify response structure
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty("products");

      // Assert: Verify all products have the requested condition
      if (body.products.length > 0) {
        body.products.forEach((product: any) => {
          expect(product.condition).toBe("used");
        });
      }
    });

    test("P-10: should filter products by price range", async ({
      authenticatedRequest,
    }) => {
      // Act: Filter by price range
      const response = await authenticatedRequest.get(
        "/api/v1/products?min_price=1000000&max_price=2000000",
      );

      // Assert: Verify response structure
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty("products");

      // Assert: Verify all products are within price range
      if (body.products.length > 0) {
        body.products.forEach((product: any) => {
          expect(product.price_cents).toBeGreaterThanOrEqual(1000000);
          expect(product.price_cents).toBeLessThanOrEqual(2000000);
        });
      }
    });
  });

  // ============================================
  // GROUP 3: Product Details (GET /api/v1/products/{id})
  // ============================================
  test.describe("GET /api/v1/products/{id} - Get Product Details", () => {
    test("P-11: should return product details", async ({
      authenticatedRequest,
    }) => {
      // Arrange: Create product first
      const createResponse = await authenticatedRequest.post(
        "/api/v1/products",
        {
          data: {
            title: "Detail Test Product",
            price_cents: 2000000,
            category_id: categoryId,
            condition: "used",
            attributes: { vin: "2GNALBEK8H1615946", mileage: 50000 },
          },
        },
      );

      const product = await createResponse.json();

      // Act: Get product details
      const response = await authenticatedRequest.get(
        `/api/v1/products/${product.id}`,
      );

      // Assert: Verify response structure
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty("id", product.id);
      expect(body).toHaveProperty("title", "Detail Test Product");
      expect(body).toHaveProperty("attributes");
      expect(body.attributes).toHaveProperty("vin", "2GNALBEK8H1615946");
    });

    test("P-12: should return 404 for non-existent product", async ({
      authenticatedRequest,
    }) => {
      // Act: Get non-existent product
      const response = await authenticatedRequest.get(
        "/api/v1/products/00000000-0000-0000-0000-000000000000",
      );

      // Assert: Verify 404
      expect(response.status()).toBe(404);
    });

    test("P-13: should return 422 for invalid UUID format", async ({
      authenticatedRequest,
    }) => {
      // Act: Get product with invalid UUID
      const response = await authenticatedRequest.get(
        "/api/v1/products/invalid-uuid-format",
      );

      // Assert: Verify 422 (validation error)
      expect(response.status()).toBe(422); // FastAPI validation for UUID
    });
  });

  // ============================================
  // GROUP 4: Product Update (PATCH /api/v1/products/{id})
  // ============================================
  test.describe("PATCH /api/v1/products/{id} - Update Product", () => {
    test("P-14: should update product title", async ({
      authenticatedRequest,
    }) => {
      // Arrange: Create product
      const createResponse = await authenticatedRequest.post(
        "/api/v1/products",
        {
          data: {
            title: "Original Title",
            price_cents: 1500000,
            category_id: categoryId,
            condition: "used",
            attributes: { mileage: 50000 },
          },
        },
      );

      const product = await createResponse.json();

      // Act: Update product title
      const response = await authenticatedRequest.patch(
        `/api/v1/products/${product.id}`,
        {
          data: { title: "Updated Title" },
        },
      );

      // Assert: Verify update
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty("title", "Updated Title");
      expect(body).toHaveProperty("id", product.id);
    });

    test("P-15: should update product price", async ({
      authenticatedRequest,
    }) => {
      // Arrange: Create product
      const createResponse = await authenticatedRequest.post(
        "/api/v1/products",
        {
          data: {
            title: "Price Test Product",
            price_cents: 1500000,
            category_id: categoryId,
            condition: "used",
            attributes: { mileage: 50000 },
          },
        },
      );

      const product = await createResponse.json();

      // Act: Update product price
      const response = await authenticatedRequest.patch(
        `/api/v1/products/${product.id}`,
        {
          data: { price_cents: 1750000 },
        },
      );

      // Assert: Verify update
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty("price_cents", 1750000);
    });

    test("P-16: should update product condition", async ({
      authenticatedRequest,
    }) => {
      // Arrange: Create product
      const createResponse = await authenticatedRequest.post(
        "/api/v1/products",
        {
          data: {
            title: "Condition Test Product",
            price_cents: 1500000,
            category_id: categoryId,
            condition: "used",
            attributes: { mileage: 50000 },
          },
        },
      );

      const product = await createResponse.json();

      // Act: Update product condition
      const response = await authenticatedRequest.patch(
        `/api/v1/products/${product.id}`,
        {
          data: { condition: "certified_pre_owned" },
        },
      );

      // Assert: Verify update
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty("condition", "certified_pre_owned");
    });

    test("P-17: should update product attributes", async ({
      authenticatedRequest,
    }) => {
      // Arrange: Create product
      const createResponse = await authenticatedRequest.post(
        "/api/v1/products",
        {
          data: {
            title: "Attributes Test Product",
            price_cents: 1500000,
            category_id: categoryId,
            condition: "used",
            attributes: { vin: "2GNALBEK8H1615946", mileage: 50000 },
          },
        },
      );

      const product = await createResponse.json();

      // Act: Update product attributes
      const newAttributes = {
        vin: "2GNALBEK8H1615946",
        year: 2017,
        make: "chevrolet",
        model: "equinox",
        body_type: "suv",
        mileage: 55000,
      };

      const response = await authenticatedRequest.patch(
        `/api/v1/products/${product.id}`,
        {
          data: { attributes: newAttributes },
        },
      );

      // Assert: Verify update
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty("attributes");
      expect(body.attributes).toHaveProperty("year", 2017);
      expect(body.attributes).toHaveProperty("make", "chevrolet");
      expect(body.attributes).toHaveProperty("mileage", 55000);
    });
  });

  // ============================================
  // GROUP 5: Product Status Transitions
  // ============================================
  test.describe("Product Status Transitions", () => {
    test("P-18: should submit product for approval (draft → pending)", async ({
      authenticatedRequest,
    }) => {
      // Arrange: Create draft product
      const createResponse = await authenticatedRequest.post(
        "/api/v1/products",
        {
          data: {
            title: "Submit Test Product",
            price_cents: 1500000,
            category_id: categoryId,
            condition: "used",
            attributes: { mileage: 50000 },
          },
        },
      );

      const product = await createResponse.json();
      expect(product.status).toBe("draft");

      // Act: Submit for approval
      const response = await authenticatedRequest.post(
        `/api/v1/products/${product.id}/submit`,
      );

      // Assert: Verify status transition
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty("status", "pending");
    });

    test("P-19: should approve product (pending → published)", async ({
      authenticatedRequest,
    }) => {
      // Arrange: Create and submit product
      const createResponse = await authenticatedRequest.post(
        "/api/v1/products",
        {
          data: {
            title: "Approve Test Product",
            price_cents: 1500000,
            category_id: categoryId,
            condition: "used",
            attributes: { mileage: 50000 },
          },
        },
      );

      const product = await createResponse.json();

      // Submit for approval
      await authenticatedRequest.post(`/api/v1/products/${product.id}/submit`);

      // Act: Approve product
      const response = await authenticatedRequest.post(
        `/api/v1/products/${product.id}/approve`,
      );

      // Assert: Verify status transition
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty("status", "published");
    });

    test("P-20: should reject product (pending → rejected)", async ({
      authenticatedRequest,
    }) => {
      // Arrange: Create and submit product
      const createResponse = await authenticatedRequest.post(
        "/api/v1/products",
        {
          data: {
            title: "Reject Test Product",
            price_cents: 1500000,
            category_id: categoryId,
            condition: "used",
            attributes: { mileage: 50000 },
          },
        },
      );

      const product = await createResponse.json();

      // Submit for approval
      await authenticatedRequest.post(`/api/v1/products/${product.id}/submit`);

      // Act: Reject product
      const response = await authenticatedRequest.post(
        `/api/v1/products/${product.id}/reject?reason=Test+rejection`,
      );

      // Assert: Verify status transition
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty("status", "rejected");
    });

    test("P-21: should pause product (published → paused)", async ({
      authenticatedRequest,
    }) => {
      // Arrange: Create and publish product
      const createResponse = await authenticatedRequest.post(
        "/api/v1/products",
        {
          data: {
            title: "Pause Test Product",
            price_cents: 1500000,
            category_id: categoryId,
            condition: "used",
            attributes: { mileage: 50000 },
          },
        },
      );

      const product = await createResponse.json();

      // Submit and approve
      await authenticatedRequest.post(`/api/v1/products/${product.id}/submit`);
      await authenticatedRequest.post(`/api/v1/products/${product.id}/approve`);

      // Act: Pause product
      const response = await authenticatedRequest.post(
        `/api/v1/products/${product.id}/pause`,
      );

      // Assert: Verify status transition
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty("status", "paused");
    });

    test("P-22: should resume product (paused → published)", async ({
      authenticatedRequest,
    }) => {
      // Arrange: Create and pause product
      const createResponse = await authenticatedRequest.post(
        "/api/v1/products",
        {
          data: {
            title: "Resume Test Product",
            price_cents: 1500000,
            category_id: categoryId,
            condition: "used",
            attributes: { mileage: 50000 },
          },
        },
      );

      const product = await createResponse.json();

      // Submit, approve, then pause
      await authenticatedRequest.post(`/api/v1/products/${product.id}/submit`);
      await authenticatedRequest.post(`/api/v1/products/${product.id}/approve`);
      await authenticatedRequest.post(`/api/v1/products/${product.id}/pause`);

      // Act: Resume product
      const response = await authenticatedRequest.post(
        `/api/v1/products/${product.id}/resume`,
      );

      // Assert: Verify status transition
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty("status", "published");
    });

    test("P-23: should mark product as sold (published → sold)", async ({
      authenticatedRequest,
    }) => {
      // Arrange: Create and publish product
      const createResponse = await authenticatedRequest.post(
        "/api/v1/products",
        {
          data: {
            title: "Sold Test Product",
            price_cents: 1500000,
            category_id: categoryId,
            condition: "used",
            attributes: { mileage: 50000 },
          },
        },
      );

      const product = await createResponse.json();

      // Submit and approve
      await authenticatedRequest.post(`/api/v1/products/${product.id}/submit`);
      await authenticatedRequest.post(`/api/v1/products/${product.id}/approve`);

      // Act: Mark as sold
      const response = await authenticatedRequest.post(
        `/api/v1/products/${product.id}/mark-sold`,
      );

      // Assert: Verify status transition
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty("status", "sold");
    });
  });

  // ============================================
  // GROUP 6: Product Deletion (DELETE /api/v1/products/{id})
  // ============================================
  test.describe("DELETE /api/v1/products/{id} - Delete Product", () => {
    test("P-24: should delete product", async ({ authenticatedRequest }) => {
      // Arrange: Create product
      const createResponse = await authenticatedRequest.post(
        "/api/v1/products",
        {
          data: {
            title: "Delete Test Product",
            price_cents: 1500000,
            category_id: categoryId,
            condition: "used",
            attributes: { mileage: 50000 },
          },
        },
      );

      const product = await createResponse.json();

      // Act: Delete product
      const response = await authenticatedRequest.delete(
        `/api/v1/products/${product.id}`,
      );

      // Assert: Verify deletion
      expect(response.status()).toBe(204);

      // Verify product no longer exists
      const getResponse = await authenticatedRequest.get(
        `/api/v1/products/${product.id}`,
      );
      expect(getResponse.status()).toBe(404);
    });

    test("P-25: should return 404 when deleting non-existent product", async ({
      authenticatedRequest,
    }) => {
      // Act: Delete non-existent product
      const response = await authenticatedRequest.delete(
        "/api/v1/products/00000000-0000-0000-0000-000000000000",
      );

      // Assert: Verify 404
      expect(response.status()).toBe(404);
    });
  });
});
