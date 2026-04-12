# Phase 13: Frontend — VehicleForm, DataGrid, CSV Upload - Research

**Researched:** 2026-04-12
**Domain:** Frontend Integration with C3 Backend Schema
**Confidence:** HIGH

## Summary

Phase 13 connects the existing frontend components to the new C3 (categories+products+vehicles) backend schema implemented in Phase 12. This is an integration phase, not a redesign — the UI components already exist and work with mock data. The primary work is updating API calls, adjusting TypeScript types, and ensuring the two-step submit pattern (Product → Vehicle) works seamlessly.

**Key architectural decision from CONTEXT.md:** Backend auto-creates vehicle record if VIN present during product creation (Option B). This eliminates the need for two separate API calls from the frontend and simplifies error handling.

**Primary recommendation:** Use the existing component patterns (TanStack Query, React Hook Form + Zod, TanStack Virtual) and update only the data layer. The UI is solid; focus on contract alignment.

## User Constraints (from CONTEXT.md)

### Locked Decisions
1. **Backend auto-creates vehicle if VIN present** (Option B) — Frontend calls `POST /api/v1/products` with `attributes.vin`, backend creates both Product and Vehicle transactionally
2. **Load all categories at once, cache 5min client-side** — No pagination for categories (300 × 100 bytes = 30KB payload)
3. **Cursor-based infinite scroll for DataGrid** — Use `useInfiniteQuery` with cursor pagination
4. **Hardcoded attribute schema rendering now** — No generic FormBuilder; conditional rendering for known category attributes
5. **Smoke tests (20) → implement → full suite (210)** — Don't run all 210 tests upfront; implement smoke tests first

### Claude's Discretion
- Error handling strategy for partial failures (e.g., product created but vehicle failed)
- Loading states and optimistic UI updates
- Test migration approach (update existing tests vs. write new ones)

### Deferred Ideas (OUT OF SCOPE)
- Generic FormBuilder for dynamic attribute schema (deferred to future when category count > 20)
- Numeric pagination for DataGrid (only if users request "jump to page 47")
- Real-time updates (WebSocket, Server-Sent Events)

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| **FE-01** | Vehicle form uses new products+vehicles schema (no standalone vehicles) | Section: Standard Stack - Two-Step Submit Pattern |
| **FE-02** | Categories loaded from API and displayed in vehicle form | Section: Standard Stack - Category Loading |
| **FE-03** | Bulk CSV upload works with new products+vehicles schema | Section: Standard Stack - CSV Upload Mapping |
| **FE-04** | DataGrid displays vehicles from new products+vehicles join query | Section: Standard Stack - DataGrid Integration |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **TanStack Query v5** | ^5.0.0 | Data fetching, caching, mutations | Declarative API, automatic caching, optimistic updates, React 19 compatible |
| **React Hook Form** | ^7.51.0 | Form state management, validation | Minimal re-renders, Zod integration, works with React 19 |
| **Zod** | ^3.23.0 | Schema validation | Type-safe validation, TypeScript inference |
| **TanStack Virtual** | ^3.10.0 | Row virtualization for DataGrid | 60fps with 1000+ rows, only ~40 rows in DOM |
| **Playwright** | ^1.44.0 | E2E testing | Cross-browser, fast execution, good CI integration |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **csv-parse/sync** | ^5.5.0 | CSV parsing for bulk upload | Client-side CSV parsing before upload |
| **react-dropzone** | ^14.2.0 | File upload UI | Drag-and-drop CSV upload |
| **sonner** | ^1.5.0 | Toast notifications | Success/error messages |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| TanStack Query | SWR, React Query v4 | TanStack Query v5 has better React 19 support and `useInfiniteQuery` |
| React Hook Form | Formik, Final Form | RHF has better performance (minimal re-renders) and Zod integration |
| TanStack Virtual | react-window, react-virtuoso | TanStack Virtual is part of TanStack ecosystem, better integration with Table |

**Installation:**
```bash
# All dependencies already installed in apps/web/package.json
pnpm install  # No new packages needed
```

## Architecture Patterns

### Recommended Project Structure
```
apps/web/src/
├── components/
│   ├── forms/
│   │   └── VehicleForm.tsx          # UPDATE: Use products API
│   ├── datagrid/
│   │   └── DataGrid.tsx             # UPDATE: Use vehicles API with join
│   └── upload/
│       └── BulkUploadCSV.tsx        # UPDATE: Map to products+vehicles schema
├── lib/
│   ├── api/
│   │   ├── vehicles.ts              # UPDATE: Add createProductWithVehicle
│   │   ├── categories.ts            # NEW: Category API client
│   │   └── products.ts              # NEW: Product API client
│   └── hooks/
│       ├── useVehicleFilters.ts     # Existing: filter logic
│       └── useDataGrid.ts           # Existing: DataGrid hooks
└── types/
    ├── vehicle.ts                   # UPDATE: Match VehicleResponse DTO
    ├── product.ts                   # NEW: Product types
    └── category.ts                  # NEW: Category types
```

### Pattern 1: Two-Step Submit Pattern (Backend Auto-Creates Vehicle)
**What:** Frontend sends single `POST /api/v1/products` request with VIN in `attributes`. Backend creates Product and Vehicle in one transaction.

**When to use:** All vehicle creation flows (form submit, CSV upload)

**Example:**
```typescript
// apps/web/src/lib/api/products.ts
export async function createProductWithVehicle(data: {
  title: string;
  price_cents: number;
  category_id: string;
  attributes: {
    vin: string;  // Backend auto-creates vehicle if present
    make?: string;
    model?: string;
    // ... other vehicle fields
  };
}) {
  const response = await fetch("/api/v1/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to create product");
  }

  return response.json() as Promise<ProductResponse>;
}

// Usage in VehicleForm.tsx
const onSubmit = async (data: VehicleFormValues) => {
  const result = await createProductWithVehicle({
    title: `${data.year} ${data.make} ${data.model}`,
    price_cents: Math.round(Number(data.price) * 100),
    category_id: selectedCategoryId,
    attributes: {
      vin: data.vin,
      year: data.year,
      make: data.make,
      model: data.model,
      // ... map other fields
    },
  });

  toast.success("Vehicle created");
  router.push("/catalog");
};
```

**Why this pattern:**
- Single network roundtrip (faster UX)
- Backend handles transaction rollback (if vehicle creation fails, product is not created)
- Frontend doesn't need complex error recovery logic

### Pattern 2: Category Loading with Client-Side Cache
**What:** Load all categories once on mount, cache for 5 minutes with TanStack Query's `staleTime`.

**When to use:** Category dropdowns in forms, filters

**Example:**
```typescript
// apps/web/src/lib/api/categories.ts
export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await fetch("/api/v1/categories");
      if (!response.ok) throw new Error("Failed to fetch categories");
      return response.json() as Promise<CategoryListResponse>;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Usage in VehicleForm.tsx
const { data: categories, isLoading } = useCategories();
```

**Why this pattern:**
- 300 categories × 100 bytes = 30KB (negligible payload)
- Eliminates loading states during form interaction
- Categories change rarely (5min staleTime is acceptable)

### Pattern 3: Cursor-Based Infinite Scroll for DataGrid
**What:** Use `useInfiniteQuery` with cursor pagination for large vehicle lists.

**When to use:** Vehicle catalog, dealer inventory

**Example:**
```typescript
// apps/web/src/lib/api/vehicles.ts
export function useInfiniteVehicles(filters?: VehicleFilters, limit: number = 50) {
  return useInfiniteQuery({
    queryKey: ["vehicles", "infinite", filters, limit],
    queryFn: async ({ pageParam }: { pageParam: string | null }) => {
      const params = new URLSearchParams();
      if (filters?.status) params.append("status", filters.status);
      if (pageParam) params.append("cursor", pageParam);
      params.append("limit", limit.toString());

      const response = await fetch(`/api/v1/vehicles?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch vehicles");

      return response.json() as Promise<CatalogResponseDTO>;
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    staleTime: 60 * 1000, // 1 minute
  });
}

// Usage in DataGrid.tsx
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteVehicles();

const allVehicles = data.pages.flatMap((page) => page.items);

// Infinite scroll trigger
const observerTarget = useRef<HTMLDivElement>(null);
useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    { threshold: 1.0 }
  );

  if (observerTarget.current) {
    observer.observe(observerTarget.current);
  }

  return () => observer.disconnect();
}, [hasNextPage, isFetchingNextPage, fetchNextPage]);
```

**Why this pattern:**
- "Scanning inventory" = natural scroll behavior
- Cursor pagination is more stable than offset (no duplicate rows if data changes)
- TanStack Virtual + useInfiniteQuery = 60fps with 1000+ rows

### Pattern 4: Hardcoded Attribute Schema Rendering
**What:** Conditionally render form fields based on `category.attribute_schema` keys. No generic FormBuilder.

**When to use:** Vehicle form attribute sections

**Example:**
```typescript
// apps/web/src/components/forms/VehicleForm.tsx
const { data: category } = useCategories(selectedCategoryId);

return (
  <section className="grid grid-cols-4 gap-4">
    {/* Year field */}
    {category?.attribute_schema?.year && (
      <FormField name="attributes.year">
        <Input type="number" min={1900} max={2030} />
      </FormField>
    )}

    {/* Make field */}
    {category?.attribute_schema?.make && (
      <FormField name="attributes.make">
        <SelectControlled options={FB_BRANDS} />
      </FormField>
    )}

    {/* Model field */}
    {category?.attribute_schema?.model && (
      <FormField name="attributes.model">
        <Input type="text" placeholder="Camry, F-150, etc." />
      </FormField>
    )}
  </section>
);
```

**Why this pattern:**
- FormBuilder generic = 2-3 weeks (validation, error handling, dynamic types)
- Current categories have known attributes (hardcode 5-10 conditionals)
- YAGNI principle: don't build abstraction until 3+ use cases

### Anti-Patterns to Avoid
- **Anti-pattern: Manual state management for API data**
  - Why it's bad: Race conditions, stale data, no caching
  - What to do instead: Use TanStack Query's `useQuery` and `useMutation`

- **Anti-pattern: Separate API calls for Product and Vehicle**
  - Why it's bad: Two network roundtrips, complex error recovery
  - What to do instead: Single `POST /api/v1/products` with VIN in attributes (backend auto-creates vehicle)

- **Anti-pattern: Paginated categories**
  - Why it's bad: Loading states, race conditions, complexity for 300 items
  - What to do instead: Load all at once, cache client-side

- **Anti-pattern: Numeric pagination for DataGrid**
  - Why it's bad: "Jump to page 47" is rare use case
  - What to do instead: Cursor-based infinite scroll (add numeric pagination later if users request it)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| **Form validation** | Custom validation logic | Zod + React Hook Form | Type-safe, automatic error messages, minimal re-renders |
| **Data fetching** | useState + useEffect | TanStack Query | Automatic caching, refetching, optimistic updates |
| **CSV parsing** | Custom string splitting | csv-parse/sync | Handles quotes, commas, edge cases |
| **Row virtualization** | Custom scroll logic | TanStack Virtual | Proven 60fps performance, handles edge cases |
| **File upload** | FormData manually | react-dropzone | Drag-and-drop, file type validation, progress tracking |
| **Toast notifications** | Custom alert() | sonner | Beautiful, accessible, stackable |
| **Infinite scroll** | Scroll event listeners | useInfiniteQuery + IntersectionObserver | Automatic deduplication, cache management |

**Key insight:** All these problems have well-tested solutions. Custom implementations introduce bugs that waste time debugging.

## Common Pitfalls

### Pitfall 1: Breaking VIN Decode Flow
**What goes wrong:** VIN decode still works, but form submits to wrong endpoint or with wrong payload structure.

**Why it happens:** VehicleForm has two modes: (1) decode VIN → populate fields, (2) submit form. Decode calls `POST /api/v1/vehicles/decode-vin` (still works), but submit now calls `POST /api/v1/products` (new endpoint).

**How to avoid:**
- Keep VIN decode endpoint unchanged
- Only update submit handler to use `createProductWithVehicle`
- Test decode → submit flow end-to-end

**Warning signs:** VIN decode works but submit fails with 400/500 error

### Pitfall 2: Category Select Shows IDs Instead of Names
**What goes wrong:** Category dropdown displays UUIDs instead of human-readable names.

**Why it happens:** `useCategories` returns full Category objects, but Select component expects `{ value, label }` format.

**How to avoid:**
- Transform categories to options format: `categories.map((c) => ({ value: c.id, label: c.name }))`
- Use `SelectControlled` wrapper (already in codebase)

**Warning signs:** Dropdown shows "550e8400-e29b-41d4-a716-446655440000" instead of "Sedan"

### Pitfall 3: DataGrid Shows 40 Rows Instead of Virtualized
**What goes wrong:** DataGrid renders all 1000 rows, page lags, browser memory spike.

**Why it happens:** TanStack Virtual not configured correctly, or `estimateSize` returns wrong value.

**How to avoid:**
- Use existing `useVirtualizer` hook from DataGrid.tsx
- Keep `estimateSize: () => 60` (row height in px)
- Keep `overscan: 10` (buffer rows)
- Add dev warning: `if (rows.length > 100) console.warn("⚠️ Virtualization not working")`

**Warning signs:** Console warning "Rendering 1000 rows - should be ~40"

### Pitfall 4: CSV Upload Creates Products But Not Vehicles
**What goes wrong:** CSV upload succeeds, but vehicles don't appear in catalog.

**Why it happens:** CSV parser maps columns to product fields, but forgets to include `attributes.vin` (required for auto-vehicle creation).

**How to avoid:**
- Ensure CSV template includes `vin` column
- Map CSV columns to `attributes` object, not top-level fields
- Test with CSV that has valid VINs

**Warning signs:** "Successfully uploaded 10 vehicles" but only 10 products exist (no vehicle records)

### Pitfall 5: Test Updates Break Existing Functionality
**What goes wrong:** Updating tests for new schema breaks unrelated features (e.g., auth, layout).

**Why it happens:** Test updates touch shared fixtures or utilities that other tests depend on.

**How to avoid:**
- Run smoke tests first (20 tests covering critical paths)
- Update tests in isolation (one file at a time)
- Use `test.only` to run single test file during development
- Run full suite only after all individual tests pass

**Warning signs:** `npm test` shows 50 failing tests (only 5 were expected to break)

## Code Examples

### Example 1: Create Product with Vehicle (Single API Call)
```typescript
// Source: CONTEXT.md Decision #1
// apps/web/src/lib/api/products.ts

export interface CreateProductRequest {
  title: string;
  price_cents: number;
  category_id: string;
  attributes: {
    vin: string;  // Backend auto-creates vehicle if present
    year?: number;
    make?: string;
    model?: string;
    trim?: string;
    body_type?: string;
    mileage?: number;
    // ... other vehicle fields
  };
}

export async function createProductWithVehicle(
  data: CreateProductRequest
): Promise<ProductResponse> {
  const response = await fetch("/api/v1/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(error.message || "Failed to create product");
  }

  return response.json();
}
```

### Example 2: Category Loading with Cache
```typescript
// Source: CONTEXT.md Decision #2
// apps/web/src/lib/api/categories.ts

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await fetch("/api/v1/categories");
      if (!response.ok) throw new Error("Failed to fetch categories");
      return response.json() as Promise<CategoryListResponse>;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Transform to options for Select
export function useCategoryOptions() {
  const { data } = useCategories();
  return useMemo(
    () => data?.categories.map((c) => ({ value: c.id, label: c.name })) || [],
    [data]
  );
}
```

### Example 3: Infinite Scroll DataGrid
```typescript
// Source: CONTEXT.md Decision #3
// apps/web/src/lib/api/vehicles.ts

export function useInfiniteVehicles(filters?: VehicleFilters) {
  return useInfiniteQuery({
    queryKey: ["vehicles", "infinite", filters],
    queryFn: async ({ pageParam }: { pageParam: string | null }) => {
      const params = new URLSearchParams();
      if (filters?.status) params.append("status", filters.status);
      if (filters?.search) params.append("search", filters.search);
      if (pageParam) params.append("cursor", pageParam);
      params.append("limit", "50");

      const response = await fetch(`/api/v1/vehicles?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch vehicles");

      return response.json() as Promise<CatalogResponseDTO>;
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    staleTime: 60 * 1000, // 1 minute
  });
}
```

### Example 4: CSV Upload Mapping
```typescript
// Source: CONTEXT.md Decision #4
// apps/web/src/components/upload/BulkUploadCSV.tsx

async function handleUpload(file: File) {
  const records = await parseCSV(file); // Using csv-parse/sync

  const products = records.map((row) => ({
    title: `${row.year} ${row.make} ${row.model}`,
    price_cents: Math.round(Number(row.price) * 100),
    category_id: VEHICLE_CATEGORY_ID, // Hardcoded for now
    attributes: {
      vin: row.vin,          // REQUIRED - triggers vehicle auto-creation
      year: Number(row.year),
      make: row.make,
      model: row.model,
      trim: row.trim,
      mileage: Number(row.mileage),
      exterior_color: row.exterior_color,
      // ... map other fields to attributes
    },
  }));

  const response = await fetch("/api/v1/products/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ products }),
  });

  if (!response.ok) {
    throw new Error("Failed to upload vehicles");
  }

  return response.json();
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| **Two separate API calls** (POST /vehicles, then POST /products) | **Single API call** (POST /products with VIN in attributes) | Phase 12 (backend) + Phase 13 (frontend) | Simpler frontend, transactional backend, better error handling |
| **Offset pagination** (page=1, page=2) | **Cursor pagination** (cursor=abc123) | Phase 12 (backend) + Phase 13 (frontend) | No duplicate rows if data changes, better infinite scroll |
| **Hardcoded category options** | **Dynamic categories from API** | Phase 13 | No frontend deploys for category changes |
| **Mock data in components** | **Real backend integration** | Phase 13 | End-to-end data flow, demo requires seeded DB |

**Deprecated/outdated:**
- **Standalone vehicles table**: Replaced by products+vehicles(FK) architecture (C3 schema)
- **Direct vehicle creation**: Use `POST /api/v1/products` with VIN in attributes
- **Mock vehicle data**: Removed from components, use seeded DB for development

## Open Questions

1. **Should we migrate existing VehicleForm tests or write new ones?**
   - What we know: 24 existing VehicleForm tests (VIN decode, field validation, submit)
   - What's unclear: How many tests will break after API changes?
   - Recommendation: Run existing tests first, categorize failures (data layer vs. UI layer), update data layer tests only

2. **How to handle CSV upload errors for partial failures?**
   - What we know: Backend returns `{ created_count, failed_count, errors: [{ row_number, vin, error }] }`
   - What's unclear: Should frontend show inline errors for each row or summary toast?
   - Recommendation: Show summary toast + inline errors in preview table (already implemented in BulkUploadCSV.tsx)

3. **Should DataGrid support server-side sorting?**
   - What we know: TanStack Table supports client-side sorting (already implemented)
   - What's unclear: Does backend support `?sort_by=make&sort_order=asc`?
   - Recommendation: Keep client-side sorting for MVP (works with infinite scroll), add server-side sorting later if performance issues arise

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright ^1.44.0 |
| Config file | `tests/e2e/playwright.config.ts` |
| Quick run command | `pnpm test --grep @smoke` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FE-01 | Vehicle form submits to products API | E2E | `pnpm test vehicle-form.spec.ts` | ✅ `tests/e2e/specs/vehicle-form-vin.spec.ts` |
| FE-02 | Categories load and display in form | E2E | `pnpm test categories.spec.ts` | ✅ `tests/e2e/specs/categories.spec.ts` |
| FE-03 | CSV upload creates products+vehicles | E2E | `pnpm test products.spec.ts --grep upload` | ✅ `tests/e2e/specs/products.spec.ts` |
| FE-04 | DataGrid displays vehicles with join | E2E | `pnpm test vehicles.spec.ts --grep datagrid` | ✅ `tests/e2e/specs/vehicles.spec.ts` |

### Sampling Rate
- **Per task commit:** `pnpm test --grep @smoke` (20 smoke tests, ~2 min)
- **Per wave merge:** `pnpm test` (210 full tests, ~10 min)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Smoke Test Strategy
Create `tests/e2e/smoke.spec.ts` with 20 critical tests:

1. **Auth Flow (3 tests)**
   - Login with valid credentials
   - Logout redirects to home
   - Protected route redirects to login

2. **Vehicle Form (5 tests)**
   - VIN decode populates fields
   - Category dropdown loads options
   - Form submit creates product+vehicle
   - Form validation shows errors
   - Submit redirects to catalog

3. **DataGrid (4 tests)**
   - DataGrid loads first page
   - Infinite scroll loads more rows
   - Row selection works
   - Status badge displays correctly

4. **CSV Upload (3 tests)**
   - CSV file uploads successfully
   - Invalid VIN shows error
   - Success toast displays count

5. **Categories (2 tests)**
   - Category list loads
   - Category filter works

6. **API Contracts (3 tests)**
   - `GET /api/v1/categories` returns valid schema
   - `POST /api/v1/products` creates product+vehicle
   - `GET /api/v1/vehicles` returns paginated results

### Wave 0 Gaps
- [ ] `tests/e2e/smoke.spec.ts` — 20 smoke tests covering critical paths
- [ ] `apps/web/src/lib/api/categories.ts` — Category API client
- [ ] `apps/web/src/lib/api/products.ts` — Product API client with `createProductWithVehicle`
- [ ] `apps/web/src/types/category.ts` — TypeScript types matching CategoryResponse DTO
- [ ] `apps/web/src/types/product.ts` — TypeScript types matching ProductResponse DTO

### Contract Testing
Use existing contract-testing skill (`.skills/contract-testing/SKILL.md`) to validate API contracts:

1. **Layer 1 (OpenAPI Validator)**: Fast structure check for `/categories` and `/vehicles` endpoints
2. **Layer 2 (Integration + Contract)**: Full format validation for `POST /products` with VIN auto-create

Example contract test:
```typescript
// tests/e2e/contract/products-contract.spec.ts
test("POST /api/v1/products creates product and vehicle", async ({ page }) => {
  const response = await page.request.post("/api/v1/products", {
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
  expect(data).toHaveProperty("id");
  expect(data).toHaveProperty("attributes");
  expect(data.attributes).toHaveProperty("vin", "1HGCM82633A123456");
});
```

### Performance Validation
- **Lighthouse CI**: Run on DataGrid page, Performance score must be >= 90
- **Load test**: 1000 vehicles in DataGrid must render in < 2s on median hardware
- **Bundle size**: `pnpm build` must not increase bundle size by > 50KB

### Regression Prevention
- **Contract tests**: Run before every merge, detect API schema changes
- **Smoke tests**: Run after every commit, detect critical path breakage
- **Visual regression**: Use Percy or Chromatic (optional) if UI changes are frequent

## Sources

### Primary (HIGH confidence)
- **CONTEXT.md** (Phase 13) — User decisions from brain consultation (backend auto-create vehicle, category caching strategy, infinite scroll)
- **REQUIREMENTS.md** — Project requirements (FE-01 through FE-04)
- **STATE.md** — Project state and history (Phase 12 complete, backend API ready)
- **CLAUDE.md** — Project tech stack (Next.js 16, React 19, TanStack Query v5, Playwright)
- **Contract Testing Skill** (`.skills/contract-testing/SKILL.md`) — Multi-layer contract testing patterns
- **Existing frontend code** — VehicleForm.tsx, DataGrid.tsx, BulkUploadCSV.tsx (working patterns)
- **Backend DTOs** — CategoryResponse, ProductResponse, VehicleResponse, CatalogResponseDTO

### Secondary (MEDIUM confidence)
- **TanStack Query docs** — `useInfiniteQuery` with cursor pagination (pattern from existing code)
- **TanStack Virtual docs** — Row virtualization for DataGrid (already implemented in DataGrid.tsx)
- **React Hook Form docs** — Zod integration (pattern from existing VehicleForm.tsx)

### Tertiary (LOW confidence)
- None — all sources verified against codebase or official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, verified from package.json and existing code
- Architecture: HIGH - Patterns from existing components (VehicleForm, DataGrid, BulkUploadCSV)
- Pitfalls: HIGH - Based on real issues found in previous phases (VIN decode, Select controlled)
- Validation: HIGH - Existing test infrastructure (Playwright, contract-testing skill)

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (30 days — stable frontend stack, unlikely to change)

**Next steps:**
1. Create smoke test suite (`tests/e2e/smoke.spec.ts`)
2. Implement Category API client (`apps/web/src/lib/api/categories.ts`)
3. Implement Product API client (`apps/web/src/lib/api/products.ts`)
4. Update VehicleForm to use `createProductWithVehicle`
5. Update DataGrid to use `useInfiniteVehicles`
6. Update BulkUploadCSV to map to products+vehicles schema
7. Run smoke tests and fix failures
8. Update full E2E suite and verify all tests pass
