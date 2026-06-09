# Contract Test Implementation Plan

**Generated**: 2026-05-10
**Tasks**: B2.6.03 - B2.6.10
**Status**: READY FOR IMPLEMENTATION

---

## Overview

This document provides a detailed implementation plan for adding contract tests to all missing API endpoints. It follows the TDD pattern established by the existing appointments and leads contract tests.

---

## Phase 1: Product Schema Tests (B2.6.03)

### DTOs to Test

```
apps/api/src/prosell/application/dto/product/
├── __init__.py
├── attributes.py      (VehicleAttributes, RealEstateAttributes, GenericProductAttributes)
├── create.py          (CreateProductRequest)
├── response.py        (ProductResponse, ProductListResponse)
└── update.py          (UpdateProductRequest)
```

### Test File Structure

```
tests/e2e/layer2/products-contract.spec.ts
```

### Test Cases (Priority Order)

#### Group 1: Product Creation (POST /api/v1/products)

```typescript
test("P-01: should create product with vehicle", async ({ request }) => {
  const response = await request.post("/api/v1/products", {
    data: {
      title: "2017 Toyota Camry SE",
      price_cents: 1500000,
      category_id: categoryId,
      condition: "used",
      attributes: {
        vin: "2GNALBEK8H1615946",
        year: 2017,
        make: "chevrolet",
        model: "equinox",
        body_type: "suv",
      },
    },
  });

  expect(response.status()).toBe(201);

  const body = await response.json();
  expect(body).toHaveProperty("id");
  expect(body).toHaveProperty("title", "2017 Toyota Camry SE");
  expect(body).toHaveProperty("price_cents", 1500000);
  expect(body).toHaveProperty("status", "draft");
  expect(body).toHaveProperty("condition", "used");
  expect(body).toHaveProperty("created_at");
  expect(body).toHaveProperty("updated_at");
});

test("P-02: should reject product without title", async ({ request }) => {
  const response = await request.post("/api/v1/products", {
    data: {
      price_cents: 1500000,
      category_id: categoryId,
      condition: "used",
      attributes: {},
    },
  });

  expect(response.status()).toBe(422);
});

test("P-03: should reject product with invalid price_cents", async ({
  request,
}) => {
  const response = await request.post("/api/v1/products", {
    data: {
      title: "Test Product",
      price_cents: -100, // Invalid: negative
      category_id: categoryId,
      condition: "used",
      attributes: {},
    },
  });

  expect(response.status()).toBe(422);
});

test("P-04: should reject product with invalid condition", async ({
  request,
}) => {
  const response = await request.post("/api/v1/products", {
    data: {
      title: "Test Product",
      price_cents: 1500000,
      category_id: categoryId,
      condition: "invalid-condition", // Invalid enum
      attributes: {},
    },
  });

  expect(response.status()).toBe(422);
});
```

#### Group 2: Product List (GET /api/v1/products)

```typescript
test("P-05: should return paginated product list", async ({ request }) => {
  const response = await request.get("/api/v1/products?limit=10&offset=0");

  expect(response.status()).toBe(200);

  const body = await response.json();
  expect(body).toHaveProperty("products"); // Note: uses 'products' not 'items'
  expect(body).toHaveProperty("total");
  expect(body).toHaveProperty("limit", 10);
  expect(body).toHaveProperty("offset", 0);
  expect(Array.isArray(body.products)).toBe(true);
});

test("P-06: should filter products by status", async ({ request }) => {
  const response = await request.get("/api/v1/products?status=draft");

  expect(response.status()).toBe(200);

  const body = await response.json();
  if (body.products.length > 0) {
    body.products.forEach((product: any) => {
      expect(product.status).toBe("draft");
    });
  }
});

test("P-07: should filter products by category", async ({ request }) => {
  const response = await request.get(
    `/api/v1/products?category_id=${categoryId}`,
  );

  expect(response.status()).toBe(200);
});
```

#### Group 3: Product Details (GET /api/v1/products/{id})

```typescript
test("P-08: should return product details", async ({ request }) => {
  // Create product first
  const createResponse = await request.post("/api/v1/products", {
    data: {
      title: "Detail Test Product",
      price_cents: 2000000,
      category_id: categoryId,
      condition: "used",
      attributes: { vin: "2GNALBEK8H1615946" },
    },
  });

  const product = await createResponse.json();
  const response = await request.get(`/api/v1/products/${product.id}`);

  expect(response.status()).toBe(200);

  const body = await response.json();
  expect(body).toHaveProperty("id", product.id);
  expect(body).toHaveProperty("title", "Detail Test Product");
  expect(body).toHaveProperty("attributes");
  expect(body.attributes).toHaveProperty("vin", "2GNALBEK8H1615946");
});

test("P-09: should return 404 for non-existent product", async ({
  request,
}) => {
  const response = await request.get(
    "/api/v1/products/00000000-0000-0000-0000-000000000000",
  );
  expect(response.status()).toBe(404);
});
```

#### Group 4: Product Update (PATCH /api/v1/products/{id})

```typescript
test("P-10: should update product title", async ({ request }) => {
  const createResponse = await request.post("/api/v1/products", {
    data: {
      title: "Original Title",
      price_cents: 1500000,
      category_id: categoryId,
      condition: "used",
      attributes: {},
    },
  });

  const product = await createResponse.json();
  const response = await request.patch(`/api/v1/products/${product.id}`, {
    data: { title: "Updated Title" },
  });

  expect(response.status()).toBe(200);

  const body = await response.json();
  expect(body).toHaveProperty("title", "Updated Title");
});

test("P-11: should update product status to submitted", async ({ request }) => {
  const createResponse = await request.post("/api/v1/products", {
    data: {
      title: "Status Test",
      price_cents: 1500000,
      category_id: categoryId,
      condition: "used",
      attributes: {},
    },
  });

  const product = await createResponse.json();
  const response = await request.post(`/api/v1/products/${product.id}/submit`);

  expect(response.status()).toBe(200);

  const body = await response.json();
  expect(body).toHaveProperty("status", "submitted");
});
```

#### Group 5: Product Status Transitions

```typescript
test("P-12: should approve submitted product", async ({ request }) => {
  // Create -> Submit -> Approve
  const createResp = await request.post("/api/v1/products", {
    data: {
      title: "Approval Test",
      price_cents: 1500000,
      category_id: categoryId,
      condition: "used",
      attributes: {},
    },
  });

  const product = await createResp.json();

  await request.post(`/api/v1/products/${product.id}/submit`);
  const approveResp = await request.post(
    `/api/v1/products/${product.id}/approve`,
  );

  expect(approveResp.status()).toBe(200);
  expect((await approveResp.json()).status).toBe("approved");
});

test("P-13: should reject product", async ({ request }) => {
  const createResp = await request.post("/api/v1/products", {
    data: {
      title: "Rejection Test",
      price_cents: 1500000,
      category_id: categoryId,
      condition: "used",
      attributes: {},
    },
  });

  const product = await createResp.json();

  await request.post(`/api/v1/products/${product.id}/submit`);
  const rejectResp = await request.post(
    `/api/v1/products/${product.id}/reject`,
    {
      data: { reason: "Test rejection" },
    },
  );

  expect(rejectResp.status()).toBe(200);
  expect((await rejectResp.json()).status).toBe("rejected");
});
```

### Estimated Test Count: 20-25 tests

---

## Phase 2: Appointment Schema Tests (B2.6.04)

### Current Status

✅ **ALREADY EXCELLENT** - `tests/e2e/layer2/appointments-contract.spec.ts` has 23 comprehensive tests

### Action Required

**VERIFY COMPLETENESS** - Review existing tests to ensure all DTOs are covered:

- ✅ CreateAppointmentRequest
- ✅ AppointmentResponse
- ✅ AppointmentListResponse
- ✅ UpdateAppointmentRequest
- ✅ AppointmentStatus enum

### Verification Checklist

```bash
# Run existing appointment tests
cd tests/e2e && npx playwright test layer2/appointments-contract.spec.ts

# Check DTO coverage
grep -r "CreateAppointmentRequest\|AppointmentResponse" \
  apps/api/tests/contract/ tests/e2e/layer2/appointments-contract.spec.ts
```

### Expected Outcome

**NO NEW TESTS NEEDED** - Existing tests are comprehensive. Mark B2.6.04 as complete after verification.

---

## Phase 3: Teams Schema Tests (B2.6.05)

### DTOs to Test

```
apps/api/src/prosell/application/dto/team/
├── __init__.py
├── create.py          (CreateTeamRequest)
├── response.py        (TeamResponse, TeamMemberResponse)
└── update.py          (UpdateTeamRequest)
```

### Test File Structure

```
tests/e2e/layer2/teams-contract.spec.ts
```

### Test Cases (Priority Order)

#### Group 1: Team Creation (POST /api/v1/teams)

```typescript
test("T-01: should create team with valid data", async ({ request }) => {
  const response = await request.post("/api/v1/teams", {
    data: {
      name: "Sales Team A",
      description: "Main sales team",
    },
  });

  expect(response.status()).toBe(201);

  const body = await response.json();
  expect(body).toHaveProperty("id");
  expect(body).toHaveProperty("name", "Sales Team A");
  expect(body).toHaveProperty("description", "Main sales team");
  expect(body).toHaveProperty("created_at");
});

test("T-02: should reject team without name", async ({ request }) => {
  const response = await request.post("/api/v1/teams", {
    data: {
      description: "Team without name",
    },
  });

  expect(response.status()).toBe(422);
});
```

#### Group 2: Team List (GET /api/v1/teams)

```typescript
test("T-03: should return team list", async ({ request }) => {
  const response = await request.get("/api/v1/teams");

  expect(response.status()).toBe(200);

  const body = await response.json();
  expect(body).toHaveProperty("items");
  expect(Array.isArray(body.items)).toBe(true);
});
```

#### Group 3: Team Members Management

```typescript
test("T-04: should add member to team", async ({ request }) => {
  const teamResp = await request.post("/api/v1/teams", {
    data: { name: "Member Test Team" },
  });
  const team = await teamResp.json();

  const response = await request.post(`/api/v1/teams/${team.id}/members`, {
    data: { user_id: testUserId },
  });

  expect(response.status()).toBe(201);
});

test("T-05: should remove member from team", async ({ request }) => {
  // Setup: Create team with member
  const teamResp = await request.post("/api/v1/teams", {
    data: { name: "Remove Member Team" },
  });
  const team = await teamResp.json();

  await request.post(`/api/v1/teams/${team.id}/members`, {
    data: { user_id: testUserId },
  });

  // Act: Remove member
  const response = await request.delete(
    `/api/v1/teams/${team.id}/members/${testUserId}`,
  );

  expect(response.status()).toBe(204);
});
```

### Estimated Test Count: 10-15 tests

---

## Phase 4: DTO OpenAPI Verification (B2.6.06 - B2.6.07)

### Request DTOs (B2.6.06)

**Objective**: Verify all request DTOs match OpenAPI schema

**Verification Script**:

```python
# apps/api/tests/contract/openapi/test_request_dto_matching.py
import pytest
from prosell.application.dto.product import CreateProductRequest
from prosell.application.dto.team import CreateTeamRequest
from prosell.application.dto.appointment.request import CreateAppointmentRequest

@pytest.mark.parametrize("dto_class", [
    CreateProductRequest,
    CreateTeamRequest,
    CreateAppointmentRequest,
])
def test_request_dto_matches_openapi(dto_class):
    """Verify request DTO schema matches OpenAPI spec."""
    schema = dto_class.model_json_schema()
    # Verify against OpenAPI JSON schema
    # This is a placeholder - actual implementation depends on OpenAPI export
    assert schema is not None
    assert "title" in schema
    assert "properties" in schema
```

### Response DTOs (B2.6.07)

**Objective**: Verify all response DTOs match OpenAPI schema

**Verification Script**:

```python
# apps/api/tests/contract/openapi/test_response_dto_matching.py
import pytest
from prosell.application.dto.product import ProductResponse
from prosell.application.dto.team import TeamResponse
from prosell.application.dto.appointment.response import AppointmentResponse

@pytest.mark.parametrize("dto_class", [
    ProductResponse,
    TeamResponse,
    AppointmentResponse,
])
def test_response_dto_matches_openapi(dto_class):
    """Verify response DTO schema matches OpenAPI spec."""
    schema = dto_class.model_json_schema()
    # Verify against OpenAPI JSON schema
    assert schema is not None
    assert "title" in schema
    assert "properties" in schema
```

---

## Phase 5: Status Code Verification (B2.6.08)

**Objective**: Verify correct status codes for all endpoints

**Test Matrix**:

```
POST /api/v1/products:
  - 201: Product created
  - 422: Validation error (missing title, invalid price, etc.)

GET /api/v1/products:
  - 200: Success (paginated list)
  - 422: Invalid query params (negative limit, etc.)

GET /api/v1/products/{id}:
  - 200: Product found
  - 404: Product not found
  - 422: Invalid UUID format

PATCH /api/v1/products/{id}:
  - 200: Product updated
  - 404: Product not found
  - 422: Invalid UUID or validation error

DELETE /api/v1/products/{id}:
  - 204: Product deleted
  - 404: Product not found
  - 422: Invalid UUID format
```

**Verification Script**:

```typescript
// tests/e2e/layer2/status-codes.spec.ts
test.describe("Status Code Verification", () => {
  test("products: 201 on create", async ({ request }) => {
    const response = await request.post("/api/v1/products", {
      data: validProductData,
    });
    expect(response.status()).toBe(201);
  });

  test("products: 422 on invalid create", async ({ request }) => {
    const response = await request.post("/api/v1/products", {
      data: {
        /* invalid */
      },
    });
    expect(response.status()).toBe(422);
  });

  test("products: 404 on get non-existent", async ({ request }) => {
    const response = await request.get(
      "/api/v1/products/00000000-0000-0000-0000-000000000000",
    );
    expect(response.status()).toBe(404);
  });

  // ... repeat for all endpoints
});
```

---

## Phase 6: Validation Rules Documentation (B2.6.09)

**Objective**: Ensure all validation rules are documented in OpenAPI schema

**Validation Rules to Document**:

### Product Validation

```yaml
CreateProductRequest:
  title:
    type: string
    minLength: 1
    maxLength: 255
  price_cents:
    type: integer
    minimum: 0
    maximum: 100000000 # $1M max
  condition:
    type: string
    enum: [new, used, refurbished]
  category_id:
    type: string
    format: uuid
  attributes:
    type: object
    # Dynamic based on category attribute_schema
```

### Appointment Validation

```yaml
CreateAppointmentRequest:
  lead_id:
    type: string
    format: uuid
  user_id:
    type: string
    format: uuid
  product_id:
    type: string
    format: uuid
  scheduled_at:
    type: string
    format: date-time
    # Business rule: Must be future date, business hours
  notes:
    type: string
    maxLength: 2000
    nullable: true
```

### Team Validation

```yaml
CreateTeamRequest:
  name:
    type: string
    minLength: 1
    maxLength: 100
  description:
    type: string
    maxLength: 500
    nullable: true
```

**Verification Script**:

```python
# apps/api/tests/contract/openapi/test_validation_rules.py
def test_product_validation_rules_in_openapi():
    """Verify product validation rules are in OpenAPI schema."""
    # Load OpenAPI schema
    # Check CreateProductRequest has:
    # - title: minLength=1, maxLength=255
    # - price_cents: minimum=0
    # - condition: enum=[new, used, refurbished]
    # etc.
```

---

## Phase 7: Complete Coverage (B2.6.10)

**Objective**: All API endpoints have contract tests

### Coverage Checklist

#### ✅ COMPLETE (5 routers)

- [x] appointment_router.py - 23 tests
- [x] lead_router.py - 22 tests
- [x] vehicle_router.py - 6 tests (VIN decode)
- [x] org_router.py - test_organizations_schema.py
- [x] webhook_router.py - test_webhooks_schema.py

#### 🔄 IN PROGRESS (3 routers)

- [ ] product_router.py - B2.6.03 (20-25 tests planned)
- [ ] team_router.py - B2.6.05 (10-15 tests planned)
- [ ] category_router.py - Needs test file

#### ⏳ TODO (6 routers)

- [ ] auth_router.py - 12 endpoints
- [ ] publisher_router.py - 3 endpoints
- [ ] image_router.py - 5+ endpoints
- [ ] user_branch_router.py - 3 endpoints
- [ ] branch_router.py - 3+ endpoints
- [ ] facebook_router.py - 3 endpoints

#### ⏭️ OUT OF SCOPE (3 routers)

- [ ] health_router.py - Simple health checks
- [ ] test_router.py - Test utilities
- [ ] wallet_router.py - Post-MVP

### Final Verification Script

```bash
#!/bin/bash
# Run all contract tests
echo "Running E2E contract tests..."
cd tests/e2e && npx playwright test layer2/

echo "Running API contract tests..."
cd apps/api && uv run pytest tests/contract/

echo "Generating coverage report..."
python3 tests/contract_coverage_analysis.py

echo "Verifying OpenAPI schema..."
uv run pytest tests/contract/openapi/
```

---

## Implementation Timeline

### Week 1: MVP Critical (P0)

- Day 1-2: B2.6.03 - Product schema tests (20-25 tests)
- Day 3: B2.6.04 - Verify appointment tests (already complete)
- Day 4-5: B2.6.05 - Teams schema tests (10-15 tests)

### Week 2: Verification & Documentation (P1-P2)

- Day 1: B2.6.06 - Verify request DTOs match OpenAPI
- Day 2: B2.6.07 - Verify response DTOs match OpenAPI
- Day 3: B2.6.08 - Verify status codes correct
- Day 4: B2.6.09 - Verify validation rules documented
- Day 5: B2.6.10 - Final coverage verification

### Week 3+: Lower Priority (P3-P4)

- auth_router.py - 12 endpoints
- publisher_router.py - 3 endpoints
- image_router.py - 5+ endpoints
- user_branch_router.py - 3 endpoints

---

## Test Pattern Reference

### Factory Pattern (for test data)

```typescript
// tests/factories/ProductFactory.ts
export class ProductFactory {
  private counter = 0;

  create(): ProductData {
    this.counter++;
    return {
      title: `Test Product ${this.counter}`,
      price_cents: 1500000,
      category_id: this.generateId("category"),
      condition: "used",
      attributes: { vin: "2GNALBEK8H1615946" },
    };
  }

  generateId(prefix: string): string {
    return `${prefix}-${this.counter}`;
  }

  reset(): void {
    this.counter = 0;
  }
}
```

### Test Organization

```typescript
test.describe('Layer 2: Products - Contract Validation', () => {
  test.beforeEach(async () => {
    factory.reset();
  });

  test.describe('POST /api/v1/products - Create', () => {
    test('should create with valid data', async () => { ... });
    test('should reject invalid data', async () => { ... });
  });

  test.describe('GET /api/v1/products - List', () => {
    test('should return paginated list', async () => { ... });
    test('should filter by status', async () => { ... });
  });
});
```

---

## Success Criteria

### Quantitative

- [ ] 80%+ router coverage (15/19 routers have tests)
- [ ] 200+ contract tests total (current: 51, planned: 150+)
- [ ] All P0 (MVP Critical) endpoints tested
- [ ] All P1 (MVP Important) endpoints tested

### Qualitative

- [ ] All tests follow the appointments/leads pattern
- [ ] All tests validate: status, structure, formats, business rules
- [ ] All DTOs match OpenAPI schema
- [ ] All validation rules documented
- [ ] Test suite runs in <5 minutes

---

**Document Status**: READY FOR IMPLEMENTATION
**Next Action**: Begin B2.6.03 - Implement product schema tests
**Estimated Completion**: 2 weeks for MVP-critical endpoints
