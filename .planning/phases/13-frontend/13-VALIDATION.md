---
phase: 13
slug: frontend
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-12
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright ^1.44.0 (E2E) + Vitest (unit) |
| **Config file** | `tests/e2e/playwright.config.ts` |
| **Quick run command** | `pnpm test --grep @smoke` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~600 seconds (10 min) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test --grep @smoke` (20 smoke tests, ~2 min)
- **After every plan wave:** Run `pnpm test` (210 full tests, ~10 min)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 1 | FE-01, FE-02 | unit | `pnpm test -- categories.test.ts` | ✅ W0 | ⬜ pending |
| 13-01-02 | 01 | 1 | FE-01, FE-02 | unit | `pnpm test -- products.test.ts` | ✅ W0 | ⬜ pending |
| 13-02-01 | 02 | 2 | FE-01, FE-02 | unit | `pnpm test -- vehicles.test.ts --grep decode` | ✅ W0 | ⬜ pending |
| 13-02-02 | 02 | 2 | FE-01, FE-02 | unit | `pnpm test -- VehicleForm.test.tsx` | ✅ W0 | ⬜ pending |
| 13-02-03 | 02 | 2 | FE-01, FE-02 | unit | `pnpm test -- VehicleForm.test.tsx` | ✅ W0 | ⬜ pending |
| 13-02-04 | 02 | 2 | FE-01, FE-02 | e2e | `pnpm test -- vehicle-form-vin.spec.ts --grep "VIN decode populates"` | ✅ W0 | ⬜ pending |
| 13-03-01 | 03 | 3 | FE-04 | unit | `pnpm test -- VehicleDataGrid.test.tsx` | ✅ W0 | ⬜ pending |
| 13-04-01 | 04 | 3 | FE-03 | unit | `pnpm test -- BulkUploadCSV.test.tsx` | ✅ W0 | ⬜ pending |
| 13-05-01 | 05 | 0 | FE-01..04 | e2e | `pnpm test -- smoke.spec.ts` | ✅ W0 | ⬜ pending |
| 13-06-01 | 06 | 4 | FE-01..04 | e2e | `pnpm test -- smoke.spec.ts` | ✅ W0 | ⬜ pending |
| 13-06-02 | 06 | 4 | FE-01..04 | e2e | `pnpm test -- smoke.spec.ts` | ✅ W0 | ⬜ pending |
| 13-06-03 | 06 | 4 | FE-01..04 | e2e | `pnpm test -- vehicle-form-vin.spec.ts` | ✅ W0 | ⬜ pending |
| 13-07-01 | 07 | 5 | FE-01..04 | e2e | `pnpm test -- vehicles.spec.ts` | ✅ W0 | ⬜ pending |
| 13-07-02 | 07 | 5 | FE-01..04 | e2e | `pnpm test -- bulk-upload.spec.ts` | ✅ W0 | ⬜ pending |
| 13-07-03 | 07 | 5 | FE-01..04 | e2e | `pnpm test -- categories.spec.ts` | ✅ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/e2e/smoke.spec.ts` — 20 smoke tests covering critical paths (auth, VIN decode, form submit, DataGrid, CSV upload, API contracts) — **CREATED in Plan 13-05 (Wave 0)**
- [ ] `apps/web/src/lib/api/categories.ts` — Category API client with `useCategories()` hook — **Plan 13-01**
- [ ] `apps/web/src/lib/api/products.ts` — Product API client with `createProductWithVehicle()` function — **Plan 13-01**
- [ ] `apps/web/src/types/category.ts` — TypeScript types matching CategoryResponse DTO — **Plan 13-01**
- [ ] `apps/web/src/types/product.ts` — TypeScript types matching ProductResponse DTO — **Plan 13-01**

*Wave 0 stubs needed before plan execution begins. Smoke test stubs created in Plan 13-05 (Wave 0).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Lighthouse Performance score | FE-04 | CI infrastructure not set up yet | Run `pnpm build && npx lhci autorun` on DataGrid page, verify score >= 90 |
| Load test: 1000 vehicles render < 2s | FE-04 | Requires manual hardware measurement | Open DataGrid with 1000+ vehicles, use DevTools Performance tab, verify render time |

*All other behaviors have automated E2E verification.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (smoke test stubs created in Plan 13-05)
- [x] No watch-mode flags
- [x] Feedback latency < 120s (smoke tests in ~2 min)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

---

## Contract Testing Requirements

Per CONTEXT.md Brain #7 must-have condition #3: **Add contract tests for `/categories` and `/vehicles` endpoints (OpenAPI validation)**

### Layer 1: OpenAPI Structure Tests

```typescript
// tests/e2e/contract/categories-structure.spec.ts
test("GET /api/v1/categories matches OpenAPI schema", async ({ request }) => {
  const response = await request.get("/api/v1/categories");
  expect(response.ok()).toBeTruthy();

  const data = await response.json();
  expect(data).toHaveProperty("categories");
  expect(Array.isArray(data.categories)).toBeTruthy();

  // Validate first item structure
  const category = data.categories[0];
  expect(category).toHaveProperty("id");
  expect(category).toHaveProperty("name");
  expect(category).toHaveProperty("slug");
  expect(category).toHaveProperty("attribute_schema");
});
```

### Layer 2: Integration + Format Tests

```typescript
// tests/e2e/contract/products-format.spec.ts
test("POST /api/v1/products with VIN creates product and vehicle", async ({ request }) => {
  const response = await request.post("/api/v1/products", {
    data: {
      title: "2020 Honda Civic",
      price_cents: 1850000,
      category_id: "uuid-here",
      attributes: {
        vin: "1HGCM82633A123456",
        year: 2020,
        make: "honda",
        model: "civic",
      },
    },
  });

  expect(response.ok()).toBeTruthy();
  const data = await response.json();

  // Validate ProductResponse structure
  expect(data).toHaveProperty("id");
  expect(data).toHaveProperty("title", "2020 Honda Civic");
  expect(data).toHaveProperty("price_cents", 1850000);
  expect(data).toHaveProperty("attributes");
  expect(data.attributes).toHaveProperty("vin", "1HGCM82633A123456");

  // Verify vehicle record created (backend query)
  const vehicleResponse = await request.get(`/api/v1/vehicles/${data.id}`);
  expect(vehicleResponse.ok()).toBeTruthy();
});
```

---

## Performance Validation (Lighthouse CI)

Per CONTEXT.md Brain #7 must-have condition #4: **Set up Lighthouse CI (Performance score < 90 = fail)**

### Configuration

```javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: [
        "http://localhost:3000/catalog",
        "http://localhost:3000/inventory/new",
      ],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.9 }],
        "categories:accessibility": ["warn", { minScore: 0.9 }],
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
```

### Run Command

```bash
pnpm build
npx lhci autorun
```

**Pass threshold:** Performance score >= 90/100

---

## Smoke Test Suite

Per CONTEXT.md Decision #5: **Smoke tests (20) → implement → full suite (210)**

### Test Distribution (20 total)

1. **Auth Flow (3 tests)**
   - Login with valid credentials → redirect to dashboard
   - Logout → redirect to home
   - Protected route without auth → redirect to login

2. **Vehicle Form (5 tests)**
   - VIN decode populates make/model/year fields
   - Category dropdown loads options from API
   - Form submit creates product+vehicle record
   - Form validation shows errors for missing required fields
   - Submit success → redirect to catalog

3. **DataGrid (4 tests)**
   - DataGrid loads first page of vehicles
   - Infinite scroll triggers at bottom, loads more rows
   - Row selection checkbox works
   - Status badge displays correct color (green=available, red=sold)

4. **CSV Upload (3 tests)**
   - CSV file uploads successfully
   - Invalid VIN shows inline error in preview table
   - Success toast displays created count

5. **Categories (2 tests)**
   - Category list loads from API
   - Category filter in DataGrid works

6. **API Contracts (3 tests)**
   - `GET /api/v1/categories` returns valid schema
   - `POST /api/v1/products` creates product+vehicle
   - `GET /api/v1/vehicles` returns paginated results with next_cursor

**File:** `tests/e2e/smoke.spec.ts` (created in Plan 13-05 Wave 0, implemented in Plan 13-06)
