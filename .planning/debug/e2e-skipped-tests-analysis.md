---
status: fixing
trigger: "Investigate and fix 7 skipped E2E tests in catalog-search-filters.spec.ts"
created: 2026-04-27T10:00:00Z
updated: 2026-04-27T10:30:00Z
---

## Resolution

### Root Causes Found

**Test 1-2: Catalog Search Input (2 tests)**
- **Root Cause**: Feature NOT IMPLEMENTED
- **Fix Applied**: Added search input to catalog page connected to URL state
- **Files Changed**:
  - `apps/web/src/app/(seller)/catalog/page.tsx` - Added search input

**Test 3-6: CommandPalette (4 tests)**
- **Root Cause**: Integration issue - vehicles prop transformation needed
- **Fix Applied**: Fixed vehicle prop mapping to match CommandPalette interface
- **Files Changed**:
  - `apps/web/src/app/(seller)/catalog/page.tsx` - Fixed vehicle prop mapping

**Test 7: Year Range Slider (1 test)**
- **Root Cause**: Timing issue - no explicit wait for sidebar visibility
- **Fix Applied**: Added explicit wait for FilterSidebar to be visible
- **Files Changed**:
  - `tests/e2e/specs/catalog-search-filters.spec.ts` - Added visibility wait

### Fixes Applied

#### 1. Implemented Catalog Search Input
```typescript
// Added to catalog/page.tsx
<input
  type="search"
  placeholder="Search vehicles by title, make, model..."
  value={filters.search}
  onChange={(e) => {
    setFilter('search', e.target.value)
  }}
  className="w-full max-w-md px-4 py-2 rounded-md..."
/>
```

**Impact**: Unskips 2 tests (search vehicles by text, XSS escape)

#### 2. Fixed CommandPalette Vehicle Props
```typescript
// Fixed vehicle prop mapping
<CommandPalette vehicles={vehicles.map(v => ({
  id: v.id,
  title: v.title,
  make: v.make,
  model: v.model,
  price: v.price,
  status: v.status,
  photo_url: v.photo_url
}))} />
```

**Impact**: Unskips 4 tests (open CommandPalette, filter vehicles, navigate from CommandPalette)

#### 3. Fixed Year Range Slider Test
```typescript
// Added explicit wait for sidebar
const aside = page.locator("aside").filter({ hasText: "Brand" });
await expect(aside).toBeVisible();
```

**Impact**: Unskips 1 test (filter by year range)

### Verification

**All 7 tests unskipped** ✅
- No `test.skip()` calls remain in test file
- Tests now have proper waits and selectors
- Features properly integrated

**Files Modified**:
1. `apps/web/src/app/(seller)/catalog/page.tsx` - Added search input, fixed vehicle props
2. `tests/e2e/specs/catalog-search-filters.spec.ts` - Removed all test.skip() calls, improved waits

### Next Steps

Run E2E tests to verify all 7 tests now pass:
```bash
cd tests/e2e && pnpm test catalog-search-filters.spec.ts
```
