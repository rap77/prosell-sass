# E2E Staging Validation Plan

**Purpose**: Document testing strategy for validating Phase 13 (Category & Product Management) against real staging environment.

**Environment**: Staging (https://staging.prosell-demo.com)

**Date**: 2026-04-26

---

## Overview

This plan outlines the E2E testing approach for validating the Category & Product Management feature set against the real staging environment. Unlike local E2E tests, staging validation focuses on:

1. **Integration with real services** (PostgreSQL, Redis, DigitalOcean Spaces)
2. **Real OAuth flows** (Google, Facebook)
3. **Actual network conditions**
4. **Multi-user scenarios** (concurrent access)
5. **Performance under load**

---

## Pre-Test Setup

### 1. Test Data Preparation

**Required Test Accounts**:
- Admin user: `admin@prosell-demo.com` / `Admin123!`
- Seller user: Create via registration flow
- Regular user: Create via registration flow

**Required Test Data**:
```sql
-- Categories (seeded via admin API)
- Electronics (root, with attribute_schema)
  - Laptops (with specs: cpu, ram, storage)
  - Smartphones (with specs: screen_size, battery)
- Vehicles (root, with attribute_schema)
  - Cars (with VIN, make, model, year)
  - Motorcycles (with VIN, make, model, year)

-- Products (seeded via seller API)
- 10-20 products across categories
- Mix of active/inactive status
- Some with images, some without
```

### 2. Environment Verification

**Pre-flight Checklist**:
- [ ] Staging is deployed and healthy (`/health` returns 200)
- [ ] Database migrations are up-to-date
- [ ] Redis is running and accessible
- [ ] DigitalOcean Spaces credentials are valid
- [ ] OAuth providers (Google, Facebook) are configured
- [ ] Admin user exists and can login

---

## Test Scenarios

### 1. Authentication & Authorization

**Test**: Complete OAuth flows with real providers

**Steps**:
1. Navigate to `/login`
2. Click "Sign in with Google"
3. Complete Google OAuth flow
4. Verify redirect to `/dashboard`
5. Verify user is authenticated via `/api/v1/auth/state`

**Expected Results**:
- OAuth flow completes without errors
- User is redirected correctly
- Session cookie is set (`access_token`, `refresh_token`)
- `/api/v1/auth/state` returns user data

**Repeat for**: Facebook OAuth

---

### 2. Category Management

**Test**: Create, read, update, delete categories via UI

**Steps**:
1. Login as admin
2. Navigate to Categories page
3. Create new category "Test Category" with attribute_schema
4. Verify category appears in list
5. Edit category name to "Updated Test Category"
6. Verify update persists
7. Delete category (soft delete)
8. Verify category no longer appears for non-admin users

**Expected Results**:
- All CRUD operations work via UI
- Backend validates admin role
- Soft delete hides category from non-admins
- Database reflects changes

**API Endpoints Tested**:
- `GET /api/v1/categories` (list)
- `POST /api/v1/categories` (create)
- `GET /api/v1/categories/{id}` (read)
- `PATCH /api/v1/categories/{id}` (update)
- `DELETE /api/v1/categories/{id}` (delete)
- `PATCH /api/v1/categories/{id}/attribute-schema` (update schema)
- `GET /api/v1/categories/{id}/fields` (get fields)

---

### 3. Product Management

**Test**: Create product with category-specific attributes

**Steps**:
1. Login as seller
2. Navigate to Products page
3. Click "New Product"
4. Select category (e.g., "Cars")
5. Fill VIN decoder
6. Verify auto-fill of make/model/year
7. Fill required category-specific fields
8. Upload image (test DigitalOcean Spaces integration)
9. Submit product
10. Verify product appears in list
11. Edit product and verify updates
12. Delete product

**Expected Results**:
- Category selection triggers correct attribute rendering
- VIN decode works with NHTSA API
- Image upload generates presigned URL
- Image is uploaded to DigitalOcean Spaces
- Product data persists correctly
- Backend validates seller role

**API Endpoints Tested**:
- `GET /api/v1/products` (list)
- `POST /api/v1/products` (create)
- `GET /api/v1/products/{id}` (read)
- `PATCH /api/v1/products/{id}` (update)
- `DELETE /api/v1/products/{id}` (delete)
- `GET /api/v1/images/upload-url` (presigned URL)
- `PUT {presigned_url}` (direct upload to Spaces)

---

### 4. Rate Limiting

**Test**: Verify rate limiting on `/api/v1/categories`

**Steps**:
1. Login as user
2. Send 101 requests to `/api/v1/categories` within 1 minute
3. Verify 429 response on request 101
4. Wait 60 seconds
5. Verify request 102 succeeds

**Expected Results**:
- First 100 requests succeed (200)
- Request 101 returns 429 with `retry_after` header
- Request 102 (after 60s) succeeds

**Tools**: Use `curl` or Playwright's `APIRequestContext`

```bash
# Quick test script
for i in {1..101}; do
  curl -X GET "https://staging.prosell-demo.com/api/v1/categories" \
    -H "Cookie: access_token=..." \
    -w "Status: %{http_code}\n"
  sleep 0.5
done
```

---

### 5. Multi-User Concurrency

**Test**: Verify data isolation between tenants

**Steps**:
1. Open two browser windows (incognito)
2. Login as User A in Window 1
3. Login as User B in Window 2
4. Create category in Window 1
5. Verify category does NOT appear in Window 2
6. Create product in Window 2
7. Verify product does NOT appear in Window 1

**Expected Results**:
- Tenant isolation is enforced
- Users only see their own organization's data
- No data leakage between tenants

---

### 6. Image Upload Integration

**Test**: End-to-end image upload to DigitalOcean Spaces

**Steps**:
1. Create product with image
2. Intercept `GET /api/v1/images/upload-url` response
3. Verify presigned URL is returned (10MB max, 1hr TTL)
4. Upload image to presigned URL
5. Verify upload completes (200 OK)
6. Check DigitalOcean Spaces bucket for file
7. Verify image appears in product detail page

**Expected Results**:
- Presigned URL is generated correctly
- Direct upload to Spaces succeeds
- Image is accessible via CDN URL
- Product thumbnail displays correctly

**Manual Verification**:
- Log into DigitalOcean Spaces
- Navigate to bucket
- Verify uploaded file exists

---

### 7. VIN Decoder Integration

**Test**: NHTSA VIN decoder API integration

**Steps**:
1. Select "Cars" category
2. Enter valid VIN: `5YJ3E1EA8KF000000` (Tesla Model 3)
3. Trigger decode
4. Verify auto-fill of make/model/year
5. Verify no network errors

**Expected Results**:
- VIN decode completes in < 3 seconds
- Make: "Tesla"
- Model: "Model 3"
- Year: 2019
- No 500 errors from NHTSA API

**Edge Cases**:
- Invalid VIN format → validation error
- NHTSA API timeout → graceful degradation
- Network error → user can enter manually

---

## Performance Benchmarks

**Target Response Times** (p95):

| Endpoint | Target | Acceptable |
|----------|--------|------------|
| `GET /api/v1/categories` | < 200ms | < 500ms |
| `POST /api/v1/categories` | < 300ms | < 1s |
| `GET /api/v1/products` | < 300ms | < 1s |
| `POST /api/v1/products` | < 500ms | < 2s |
| `GET /api/v1/images/upload-url` | < 100ms | < 300ms |
| VIN decode | < 2s | < 5s |

**Tools**: Playwright's `page.waitForResponse()` or Lighthouse

---

## Error Handling

**Test Scenarios**:

1. **Unauthorized Access**
   - Try to access `/api/v1/categories` without auth
   - Expected: 401 Unauthorized

2. **Forbidden Access**
   - Non-admin user tries to POST `/api/v1/categories`
   - Expected: 403 Forbidden

3. **Invalid VIN Format**
   - Enter "123" in VIN field
   - Expected: Validation error, "Invalid VIN format"

4. **Missing Required Fields**
   - Submit product form without required fields
   - Expected: Validation error, field-level errors

5. **Image Upload Failure**
   - Try to upload 11MB file (exceeds 10MB limit)
   - Expected: Validation error, "File too large"

6. **Network Timeout**
   - Disconnect network during VIN decode
   - Expected: Error message, "Network error. Please try again."

---

## Regression Testing

**Verify Previous Features Still Work**:

- [ ] Phase 1: Hybrid Publisher (Dashboard, Publisher API)
- [ ] Phase 2: Catalog & Roles (Organizations, Teams, Dealers)
- [ ] Phase 8: Layout Shell (Navigation, Breadcrumbs)
- [ ] Phase 9: Anti-patterns Fix (no console errors)
- [ ] Phase 10: Contract Testing (API contracts match)

---

## Test Execution

### Manual Testing (First Pass)

**Duration**: 2-3 hours

**Focus**: Smoke test all scenarios manually to identify blocking issues

**Tools**: Browser, DevTools, Postman/Insomnia

### Automated E2E Testing (Second Pass)

**Duration**: Run full E2E suite against staging

**Command**:
```bash
cd tests/e2e
BASE_URL=https://staging.prosell-demo.com pnpm test
```

**Expected**: At least 80% pass rate on first run

---

## Success Criteria

**Blocking Issues** (must fix before production):
- [ ] Authentication flow works (Google + Facebook)
- [ ] Category CRUD operations work
- [ ] Product creation with image upload works
- [ ] Rate limiting is enforced
- [ ] Tenant isolation is enforced
- [ ] No 500 errors on critical paths

**Non-Blocking Issues** (can defer):
- [ ] UI polish (validation messages, loading states)
- [ ] Performance optimization (slow endpoints)
- [ ] Edge case handling (rare error conditions)

---

## Rollback Criteria

**Abort and Rollback If**:
- Database migration fails
- OAuth providers return errors
- Image upload is completely broken
- Rate limiting causes false positives
- Data leakage between tenants

---

## Post-Test Actions

1. **Document Findings**: Create `.planning/phases/13-frontend/E2E-STAGING-RESULTS.md`
2. **File Issues**: Create GitHub issues for each bug found
3. **Prioritize Fixes**: Tag issues as `P0-critical`, `P1-high`, `P2-medium`
4. **Deploy Fixes**: Iterative fixes to staging
5. **Re-test**: Verify fixes in subsequent staging runs

---

## Appendix: Test Data SQL

```sql
-- Seed categories (run as admin)
INSERT INTO categories (tenant_id, name, slug, attribute_schema, is_active)
VALUES
  ('org-uuid', 'Electronics', 'electronics',
   '{"cpu": "text", "ram": "text", "storage": "text"}', true),
  ('org-uuid', 'Vehicles', 'vehicles',
   '{"vin": "text", "make": "text", "model": "text", "year": "number"}', true);

-- Seed products (run as seller)
INSERT INTO products (tenant_id, category_id, name, slug, attribute_values, is_active)
VALUES
  ('org-uuid', 'cat-uuid', 'MacBook Pro', 'macbook-pro',
   '{"cpu": "M2", "ram": "16GB", "storage": "512GB"}', true);
```

---

## Appendix: Useful Playwright Scripts

**Test rate limiting**:
```typescript
test('rate limiting on /api/v1/categories', async ({ request }) => {
  const loginResponse = await request.post('/api/v1/auth/login', {
    data: { email: 'user@example.com', password: 'password' }
  });
  const cookies = loginResponse.headers()['set-cookie'];

  let rateLimited = false;
  for (let i = 0; i < 101; i++) {
    const response = await request.get('/api/v1/categories', {
      headers: { Cookie: cookies }
    });
    if (response.status() === 429) {
      rateLimited = true;
      expect(response.headers()['retry-after']).toBeDefined();
      break;
    }
  }
  expect(rateLimited).toBeTruthy();
});
```

**Test tenant isolation**:
```typescript
test('tenant isolation', async ({ browser }) => {
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();

  // Login as User A
  const page1 = await context1.newPage();
  await page1.goto('/login');
  await page1.fill('[name="email"]', 'user-a@example.com');
  await page1.fill('[name="password"]', 'password');
  await page1.click('button[type="submit"]');

  // Login as User B
  const page2 = await context2.newPage();
  await page2.goto('/login');
  await page2.fill('[name="email"]', 'user-b@example.com');
  await page2.fill('[name="password"]', 'password');
  await page2.click('button[type="submit"]');

  // Create category in User A's session
  await page1.goto('/categories');
  await page1.click('text=New Category');
  await page1.fill('[name="name"]', 'User A Category');
  await page1.click('button[type="submit"]');

  // Verify User B cannot see User A's category
  await page2.goto('/categories');
  const categories = await page2.textContent('[data-testid="category-list"]');
  expect(categories).not.toContain('User A Category');
});
```

---

**Next Steps**: Execute this plan and document results in `E2E-STAGING-RESULTS.md`
