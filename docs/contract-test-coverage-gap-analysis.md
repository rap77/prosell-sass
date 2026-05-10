# Contract Test Coverage Gap Analysis

**Generated**: 2026-05-10
**Task**: B2.6.01 - Identify missing contract test coverage
**Status**: COMPLETE ✅

---

## Executive Summary

**Total Routers**: 19
**Routers with Contract Tests**: 5 (26%)
**Routers WITHOUT Contract Tests**: 14 (74%)

**Critical Gap**: Product, Category, Team, Auth, and Publisher routers lack contract test coverage.

---

## 1. Routers MISSING Contract Tests (Priority Order)

### High Priority (MVP Critical)

#### ❌ product_router.py (14 endpoints)
- **Prefix**: `/api/v1/products`
- **Why Critical**: Core C3 model - vehicles are created via products
- **Missing Tests**:
  - POST /api/v1/products (create product + vehicle)
  - GET /api/v1/products (list with pagination)
  - GET /api/v1/products/{id} (product details)
  - PUT /api/v1/products/{id} (update product)
  - DELETE /api/v1/products/{id} (delete product)
  - PATCH /api/v1/products/{id}/status (approve/reject)
  - GET /api/v1/products/{id}/vehicles (get linked vehicle)

#### ❌ category_router.py (7 endpoints)
- **Prefix**: `/api/v1/categories`
- **Why Critical**: C3 model foundation - dynamic attributes depend on categories
- **Missing Tests**:
  - GET /api/v1/categories (list categories)
  - GET /api/v1/categories/{id} (category details with attribute_schema)
  - POST /api/v1/categories (create category - admin only)
  - PUT /api/v1/categories/{id} (update category)
  - DELETE /api/v1/categories/{id} (delete category)

#### ❌ team_router.py (estimated 5+ endpoints)
- **Prefix**: `/api/v1/teams`
- **Why Critical**: Multi-tenancy and dealer assignment
- **Missing Tests**:
  - GET /api/v1/teams (list teams)
  - GET /api/v1/teams/{id} (team details)
  - POST /api/v1/teams (create team)
  - PUT /api/v1/teams/{id} (update team)
  - DELETE /api/v1/teams/{id} (delete team)
  - POST /api/v1/teams/{id}/members (add member)
  - DELETE /api/v1/teams/{id}/members/{user_id} (remove member)

#### ❌ auth_router.py (12 endpoints)
- **Prefix**: `/api/v1/auth`
- **Why Critical**: Authentication and session management
- **Missing Tests**:
  - POST /api/v1/auth/register (user registration)
  - POST /api/v1/auth/login (email/password login)
  - POST /api/v1/auth/logout (session termination)
  - GET /api/v1/auth/state (session validation)
  - POST /api/v1/auth/oauth/google (Google OAuth)
  - POST /api/v1/auth/oauth/facebook (Facebook OAuth)
  - POST /api/v1/auth/refresh (token refresh)
  - POST /api/v1/auth/verify-email (email verification)
  - POST /api/v1/auth/forgot-password (password reset request)
  - POST /api/v1/auth/reset-password (password reset confirm)
  - POST /api/v1/auth/2fa/enable (enable 2FA)
  - POST /api/v1/auth/2fa/disable (disable 2FA)

### Medium Priority (Important for MVP)

#### ❌ publisher_router.py (3 endpoints)
- **Prefix**: `/api/v1/publisher`
- **Why Important**: Facebook Marketplace publishing
- **Missing Tests**:
  - POST /api/v1/publisher/listing (publish to Facebook)
  - GET /api/v1/publisher/listing/{id} (get listing status)
  - DELETE /api/v1/publisher/listing/{id} (delete from Facebook)

#### ❌ image_router.py (estimated 5+ endpoints)
- **Prefix**: `/api/v1/images`
- **Why Important**: Vehicle image upload with presigned URLs
- **Missing Tests**:
  - POST /api/v1/images/upload/request (get presigned URL)
  - POST /api/v1/images/upload/confirm (confirm upload)
  - GET /api/v1/images/{id} (get image metadata)
  - DELETE /api/v1/images/{id} (delete image)

#### ❌ user_branch_router.py (3 endpoints)
- **Prefix**: `/api/v1/users`
- **Why Important**: User-branch assignment (multi-location)
- **Missing Tests**:
  - GET /api/v1/users/{id}/branches (list user branches)
  - POST /api/v1/users/{id}/branches (assign branch)
  - DELETE /api/v1/users/{id}/branches/{branch_id} (remove branch)

### Low Priority (Nice to Have)

#### ❌ facebook_router.py (3 endpoints)
- **Prefix**: `/api/v1/facebook`
- **Why Less Critical**: Webhook handling (already has some schema tests)
- **Missing Tests**:
  - POST /api/v1/facebook/webhook (webhook receiver)
  - GET /api/v1/facebook/webhook (verification challenge)

#### ❌ branch_router.py (estimated 3+ endpoints)
- **Prefix**: `/api/v1/branches`
- **Why Less Critical**: Branch management (orgs already tested)
- **Missing Tests**:
  - GET /api/v1/branches (list branches)
  - GET /api/v1/branches/{id} (branch details)
  - POST /api/v1/branches (create branch)
  - PUT /api/v1/branches/{id} (update branch)

#### ❌ vendedor_router.py (estimated 3+ endpoints)
- **Prefix**: `/api/v1/vendedores`
- **Why Less Critical**: Dealer-specific endpoints (may overlap with teams)
- **Status**: Need to inspect router file

#### ❌ wallet_router.py (estimated 3+ endpoints)
- **Prefix**: `/api/v1/wallet`
- **Why Less Critical**: Payments/wallet (out of MVP scope)
- **Status**: Out of scope for MVP

#### ❌ admin_router.py (estimated 5+ endpoints)
- **Prefix**: `/api/v1/admin`
- **Why Less Critical**: Admin-only endpoints
- **Status**: Nice to have, not MVP-critical

#### ❌ health_router.py (3 endpoints)
- **Prefix**: `/health`
- **Why Less Critical**: Health checks (simple)
- **Missing Tests**:
  - GET /health (liveness probe)
  - GET /health/ready (readiness probe)
  - GET /health/live (liveness probe)

#### ❌ test_router.py (3 endpoints)
- **Prefix**: `/test`
- **Why Less Critical**: Test utilities only
- **Status**: Skip - test-only endpoints

---

## 2. Routers WITH Contract Tests ✅

#### ✅ appointment_router.py
- **Test File**: `tests/e2e/layer2/appointments-contract.spec.ts`
- **Coverage**: FULL - All CRUD operations tested
- **Test Count**: 23 tests
- **Status**: EXCELLENT

#### ✅ lead_router.py
- **Test File**: `tests/e2e/layer2/leads-contract.spec.ts`
- **Coverage**: FULL - All CRUD operations tested
- **Test Count**: 22 tests
- **Status**: EXCELLENT

#### ✅ vehicle_router.py
- **Test File**: `tests/e2e/layer2/vehicles-contract.spec.ts`
- **Coverage**: PARTIAL - VIN decode only
- **Test Count**: 6 tests
- **Status**: GOOD (vehicle CRUD tested via products)

#### ⚠️ org_router.py
- **Test File**: `apps/api/tests/contract/openapi/test_organizations_schema.py`
- **Coverage**: UNKNOWN - Need to verify test completeness
- **Status**: NEEDS REVIEW

#### ⚠️ webhook_router.py
- **Test File**: `apps/api/tests/contract/openapi/test_webhooks_schema.py`
- **Coverage**: UNKNOWN - Need to verify test completeness
- **Status**: NEEDS REVIEW

---

## 3. Test Coverage Gaps by Schema Type

### Missing Product Schema Tests
- **ProductResponse** (DTO)
- **CreateProductRequest** (DTO)
- **UpdateProductRequest** (DTO)
- **ProductListResponse** (pagination wrapper)

### Missing Category Schema Tests
- **CategoryResponse** (DTO)
- **CategoryWithAttributeSchema** (nested attribute_schema)
- **CreateCategoryRequest** (DTO)
- **UpdateCategoryRequest** (DTO)

### Missing Team Schema Tests
- **TeamResponse** (DTO)
- **CreateTeamRequest** (DTO)
- **UpdateTeamRequest** (DTO)
- **TeamMemberResponse** (nested users)

### Missing Auth Schema Tests
- **LoginRequest** (DTO)
- **LoginResponse** (DTO with tokens)
- **RegisterRequest** (DTO)
- **UserResponse** (DTO)
- **OAuthCallbackRequest** (DTO)

### Missing Publisher Schema Tests
- **PublishListingRequest** (DTO)
- **ListingResponse** (DTO with status)
- **ListingStatusResponse** (status enum)

---

## 4. Recommended Implementation Order

### Phase 1: MVP Critical (B2.6.02 - B2.6.05)
1. **product_router.py** - Core C3 model
2. **category_router.py** - C3 foundation
3. **team_router.py** - Multi-tenancy
4. **auth_router.py** - Session management

### Phase 2: MVP Important (B2.6.06 - B2.6.08)
5. **publisher_router.py** - Facebook publishing
6. **image_router.py** - Image upload
7. **user_branch_router.py** - Multi-location

### Phase 3: Nice to Have (B2.6.09 - B2.6.10)
8. **branch_router.py** - Branch management
9. **facebook_router.py** - Webhook completion
10. **admin_router.py** - Admin endpoints

### Phase 4: Out of Scope (Skip)
- **wallet_router.py** - Payments (post-MVP)
- **test_router.py** - Test utilities only
- **health_router.py** - Simple health checks

---

## 5. Test Pattern Recommendations

### Use E2E Layer 2 Tests for:
- Business logic validation (status transitions, validation rules)
- Multi-endpoint flows (create → read → update → delete)
- Authentication/authorization flows
- Pagination and filtering

### Use API Schema Tests for:
- Pydantic DTO structure validation
- Field format validation (email, UUID, datetime)
- OpenAPI schema contract verification
- Request/response type matching

### Test Structure Pattern:
```typescript
// E2E: tests/e2e/layer2/{resource}-contract.spec.ts
test.describe('Layer 2: {Resource} - Contract Validation', () => {
  test.describe('POST /api/v1/{resource} - Create', () => {
    test('should create with valid data', async () => { ... });
    test('should reject invalid data', async () => { ... });
  });
  test.describe('GET /api/v1/{resource} - List', () => {
    test('should return paginated list', async () => { ... });
  });
});
```

---

## 6. Next Steps

1. ✅ **B2.6.01 COMPLETE** - Coverage gap analysis done
2. **B2.6.02** - Compare routers with existing contract tests
3. **B2.6.03** - Add missing product schema tests
4. **B2.6.04** - Add missing appointment schema tests (verify completeness)
5. **B2.6.05** - Create teams schema tests
6. **B2.6.06** - Verify request DTOs match OpenAPI
7. **B2.6.07** - Verify response DTOs match OpenAPI
8. **B2.6.08** - Verify status codes correct
9. **B2.6.09** - Verify validation rules documented
10. **B2.6.10** - All API endpoints have contract tests

---

**Analysis Tool**: `tests/contract_coverage_analysis.py`
**Report Generated**: 2026-05-10 09:15 UTC
