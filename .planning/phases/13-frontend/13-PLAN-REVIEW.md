# Phase 13 — Plan Review Context
> Generated: 2026-04-26T01:30:00Z
> Iteration: 1
> Purpose: Full context for Brain #7 plan validation

---

## [IMPLEMENTED REALITY]

### Existing API Infrastructure (Already Built)

**Category API Client** ✅ EXISTS (`apps/web/src/lib/api/categories.ts`)
- `useCategories()` hook implemented with 5-min staleTime
- `useCategoryOptions()` transformer for Select dropdowns
- TypeScript types defined in `apps/web/src/types/category.ts`
- Handles errors with toast notifications
- **Status**: Ready to use

**Product API Client** ✅ EXISTS (`apps/web/src/lib/api/products.ts`)
- `createProductWithVehicle()` function implemented
- `useCreateProduct()` mutation hook
- Invalidates `['vehicles']` and `['products']` on success
- TypeScript types defined in `apps/web/src/types/product.ts`
- **Status**: Ready to use

**VehicleForm Component** ⚠️ PARTIAL (`apps/web/src/components/forms/VehicleForm.tsx`)
- 150+ lines, React Hook Form + Zod validation
- VIN decode integration exists
- 40+ form fields organized in sections
- Uses `FB_BRANDS`, `FB_BODY_STYLES` constants (hardcoded Facebook options)
- **Missing**: Category API integration, product submit handler

### Key Project Patterns (from codebase)

1. **TanStack Query** for data fetching (useQuery, useMutation, useInfiniteQuery)
2. **Zod** for runtime validation
3. **React Hook Form** for form state management
4. **Radix UI** + **SelectControlled** for dropdowns (avoiding UUID display issue)
5. **Sonner** for toast notifications
6. **Playwright** for E2E tests (210 existing tests)
7. **Vitest** for unit tests

### Brain #7 Conditions (from 13-BRAIN-OUTPUTS.md)

**APPROVED_WITH_CONDITIONS** (82/100)
- Condition #1: Contract tests for `/categories` and `/vehicles` endpoints
- Condition #2: Smoke tests (20) → implement → full suite (210)
- Condition #3: Lighthouse CI for Performance score ≥ 90
- Condition #4: Test flakiness threshold < 1%

---

## [PLAN SUMMARIES]

### Plan 13-01: Category & Product API Clients ✅ COMPLETE
**Status**: ALREADY IMPLEMENTED (files exist)
- Category API client: `apps/web/src/lib/api/categories.ts` ✅
- Product API client: `apps/web/src/lib/api/products.ts` ✅
- TypeScript types: `category.ts`, `product.ts` ✅
- Unit tests: Need verification (13-01 mentions test files but may not exist)

**Deviation**: Plan 13-01 is complete. No execution needed.

---

### Plan 13-02: VehicleForm Category Integration
**Wave**: 2 | **Depends on**: 13-01 ✅ (satisfied)

**Objective**: Update VehicleForm to use category API instead of hardcoded options

**Key Tasks**:
1. Add `useDecodeVin` hook to vehicles.ts (may already exist)
2. Update VehicleForm to use `useCategories()` and `useCategoryOptions()`
3. Replace hardcoded category dropdown with API-loaded options
4. Conditional attribute rendering based on `category.attribute_schema`

**Acceptance Criteria**:
- Category dropdown loads from API (no hardcoded values)
- Dropdown shows category names (not UUIDs)
- VIN decode hook is functional
- Form validation works

---

### Plan 13-03: VehicleForm Product Submit
**Wave**: 3 | **Depends on**: 13-02

**Objective**: Replace old vehicle creation endpoint with new products endpoint

**Key Tasks**:
1. Update submit handler to call `createProductWithVehicle()`
2. Map form fields to `CreateProductRequest` structure
3. Construct `title` from year/make/model
4. Convert `price` to `price_cents` (× 100)
5. Include `attributes.vin` for auto-vehicle creation

**Acceptance Criteria**:
- Form submits to `POST /api/v1/products` with `attributes.vin`
- VIN decode → submit flow works end-to-end
- Submit redirects to catalog after success
- Product and vehicle records created in DB

---

### Plan 13-04: DataGrid C3 Integration
**Wave**: 3 | **Depends on**: 13-01 ✅ (satisfied)

**Objective**: Update DataGrid to use vehicles endpoint with product join data

**Key Tasks**:
1. Update `transformVehicle()` to `transformVehicleWithProduct()`
2. Extract `title` from `product.title` (not constructed)
3. Extract `price` from `product.price_cents / 100`
4. Extract `status` from `product.status`
5. Verify infinite scroll and virtualization still work

**Acceptance Criteria**:
- DataGrid loads from `GET /api/v1/vehicles` with C3 join
- Vehicle titles display from product.title
- Prices display from product.price_cents
- Infinite scroll triggers on scroll
- Virtualization maintains ~40 rows in DOM

---

### Plan 13-05: Bulk Upload Products Integration
**Wave**: 4 | **Depends on**: 13-01 ✅ (satisfied)

**Objective**: Update BulkUploadCSV to use products bulk endpoint

**Key Tasks**:
1. Rename `useBulkUploadVehicles` to `useBulkUploadProducts`
2. Map CSV columns to `CreateProductRequest` structure
3. Include `attributes.vin` for auto-vehicle creation
4. Update error display for new response format
5. Preserve progress tracking and toast notifications

**Acceptance Criteria**:
- CSV upload calls `POST /api/v1/products/bulk`
- CSV rows map to products with `attributes.vin`
- Backend creates both product and vehicle records
- Invalid VINs show inline errors
- Success toast displays created/failed counts

---

### Plan 13-06: Smoke Tests & E2E Verification
**Wave**: 5 | **Depends on**: 13-02, 13-03, 13-04, 13-05

**Objective**: Implement smoke test suite (20 tests) and update E2E tests

**Key Tasks**:
1. Create `tests/e2e/smoke.spec.ts` with 20 critical path tests
2. Update VehicleForm E2E tests for products API
3. Update DataGrid E2E tests for C3 join data
4. Update bulk upload E2E tests for products schema
5. Verify 20/20 smoke tests pass

**Acceptance Criteria**:
- All 20 smoke tests pass (~2 min execution)
- VehicleForm E2E tests pass with products API
- DataGrid E2E tests pass with C3 data
- Bulk upload E2E tests pass
- No regressions in existing tests

---

## [CODE SNIPPETS]

### Current VehicleForm Submit Handler (needs update)
```typescript
// apps/web/src/components/forms/VehicleForm.tsx:140-150
export function VehicleForm({ mode, vehicleId, initialData, onSuccess, imageUrls = [], onSubmit: customOnSubmit }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDecodingVin, setIsDecodingVin] = useState(false);

  const { register, handleSubmit, control, formState: { errors, isSubmitting }, setValue, /* ... */
}
```

**Issue**: Submit handler not shown in snippet, but plan says it calls old vehicle creation endpoint. Needs to be replaced with `useCreateProduct()`.

---

### Existing Category API (ready to use)
```typescript
// apps/web/src/lib/api/categories.ts:27-43
export function useCategories(): UseQueryResult<Category[], Error> {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/v1/categories");
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to fetch categories" }));
        throw new Error(error.message || "Failed to fetch categories");
      }
      const data = (await res.json()) as BackendCategoryResponse;
      return data.categories;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

**Status**: ✅ Implements Decision #2 (5-min cache)

---

### Existing Product API (ready to use)
```typescript
// apps/web/src/lib/api/products.ts:43-61
export async function createProductWithVehicle(data: CreateProductRequest): Promise<Product> {
  const res = await fetch("/api/v1/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Failed to create product" }));
    throw new Error(error.message || "Failed to create product");
  }

  const product = (await res.json()) as BackendProductResponse;
  return product as Product;
}
```

**Status**: ✅ Implements Decision #1 (auto-vehicle creation)

---

## [CORRECTED ASSUMPTIONS]

### Assumption #1: "Plan 13-01 needs implementation"
**Correction**: ✅ FALSE - Plan 13-01 is ALREADY COMPLETE
- `apps/web/src/lib/api/categories.ts` exists and implements `useCategories()`
- `apps/web/src/lib/api/products.ts` exists and implements `createProductWithVehicle()`
- TypeScript types (`category.ts`, `product.ts`) are defined
- **Impact**: Phase 13 can start at Plan 13-02

---

### Assumption #2: "VehicleForm uses old vehicle creation endpoint"
**Correction**: ⚠️ LIKELY TRUE - Submit handler needs verification
- Plan 13-03 says submit handler calls old endpoint
- Code snippet doesn't show submit logic
- **Risk**: If submit handler is already updated, Plan 13-03 has no work

---

### Assumption #3: "DataGrid needs major updates for C3 schema"
**Correction**: ⚠️ UNKNOWN - Need to verify current implementation
- Plan 13-04 says `transformVehicle()` needs to become `transformVehicleWithProduct()`
- No code snippet from DataGrid.tsx provided
- **Risk**: If DataGrid already uses C3 schema, Plan 13-04 has reduced scope

---

### Assumption #4: "BulkUploadCSV uses old vehicles bulk endpoint"
**Correction**: ⚠️ UNKNOWN - Need to verify current implementation
- Plan 13-05 says `useBulkUploadVehicles` needs renaming
- No code snippet from BulkUploadCSV.tsx provided
- **Risk**: If already using products endpoint, Plan 13-05 has reduced scope

---

### Assumption #5: "All E2E tests need updating"
**Correction**: ✅ TRUE - 210 existing tests, 104 passing, 125 failing (from 13-CONTEXT.md)
- Some tests may already work (no way to know without running)
- Plan 13-06 creates NEW smoke tests (20) as fast verification
- **Risk**: Test failure rate could be > 20% (threshold to stop)

---

## [WHAT I NEED]

### 1. Planning Fallacy Check — What are we underestimating?

**Evaluate**:
- Plan 13-01: Is it really complete? Do unit tests exist and pass?
- Plan 13-02: Is attribute schema rendering more complex than planned? (hardcoded conditionals for ~10 attributes)
- Plan 13-03: Is VIN decode → submit flow more fragile than planned? (timing, validation, rollback)
- Plan 13-04: Is DataGrid virtualization broken by C3 schema changes?
- Plan 13-05: Is CSV parsing more error-prone than planned? (quoted values, empty rows, invalid VINs)
- Plan 13-06: Are smoke tests sufficient? Or will full E2E suite need immediate updates?

**Be specific**: Which plan and which task are at risk?

---

### 2. Omission Bias — What's missing that will block execution?

**Evaluate**:
- **Auth integration**: Do all API calls include auth cookies? (vehicles.ts, products.ts, categories.ts)
- **Error boundaries**: If API fails during VehicleForm submit, is form data preserved?
- **Race conditions**: Category loading vs VIN decode — which happens first? Does order matter?
- **Data migration**: Do existing vehicles in DB have linked products? (or is this greenfield?)
- **Feature flags**: Is there a way to rollback if C3 schema breaks production?
- **Contract tests**: Plan 13-06 mentions them, but are they part of 13-01 or 13-06?

**Be specific**: What gap will block which plan?

---

### 3. Systems Thinking — What feedback loops between plans?

**Evaluate**:
- **Plan 13-02 → 13-03**: VehicleForm category integration must work BEFORE submit handler update
- **Plan 13-04 → 13-06**: DataGrid changes must be tested BEFORE smoke tests verify
- **Plan 13-05 → 13-06**: Bulk upload changes must be tested BEFORE smoke tests verify
- **Plan 13-01 → All plans**: If category/product APIs have bugs, ALL dependent plans fail

**Be specific**: Which plan breaks if another plan has a bug?

---

### 4. Over-engineering Risk — What won't be used?

**Evaluate**:
- **Smoke tests (20)**: Will these be maintained? Or replaced by full E2E suite?
- **useDecodeVin hook**: Is this extracted from VehicleForm? If so, is it reusable elsewhere?
- **transformVehicleWithProduct()**: Is this a one-off transform, or will other components need it?
- **Attribute schema rendering**: Hardcoded conditionals — will this become unmaintainable with > 20 categories?

**Be specific**: Which artifact is YAGNI (You Aren't Gonna Need It)?

---

### 5. Acceptance Criteria Quality — Are done criteria verifiable?

**Evaluate**:
- **Plan 13-02**: "Category dropdown shows category names (not UUIDs)" — ✅ Verifiable (visual check)
- **Plan 13-03**: "Product and vehicle records created in DB" — ⚠️ How to verify? (DB query? API call?)
- **Plan 13-04**: "Infinite scroll triggers on scroll" — ✅ Verifiable (E2E test)
- **Plan 13-05**: "Backend creates both product and vehicle records" — ⚠️ How to verify? (DB query?)
- **Plan 13-06**: "All 20 smoke tests pass" — ✅ Verifiable (test output)

**Be specific**: Which acceptance criteria need DB access or manual verification?

---

## Verdict Request

Please evaluate using your **Systems Thinker** lens (Munger, Kahneman, Tetlock, Hormozi).

**Return**:
1. **Planning Fallacy Analysis** — Which tasks are underestimated?
2. **Omission Bias Analysis** — What's missing that will block execution?
3. **Systems Thinking Analysis** — What feedback loops exist between plans?
4. **Over-engineering Analysis** — What won't be used?
5. **Acceptance Criteria Analysis** — Which criteria need better verification?
6. **Verdict**: APPROVED | APPROVED_WITH_CONDITIONS | REJECTED_REVISE

**Be specific** about WHICH plan and WHICH task has issues.

---

<!-- This file is consumed by Brain #7 (brain-07-growth) -->
