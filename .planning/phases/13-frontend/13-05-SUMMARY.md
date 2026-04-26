---
phase: 13-frontend
plan: 05
subsystem: api
tags: [csv-bulk-upload, products-api, vehicles-api, tanstack-query, tdd]

# Dependency graph
requires:
  - phase: 12-backend-api
    provides: [POST /api/v1/products/bulk endpoint, products with attributes schema]
  - phase: 13-frontend
    plan: 03
    provides: [VehicleForm with createProductWithVehicle integration]
provides:
  - useBulkUploadProducts hook for CSV bulk upload
  - BulkUploadCSV component using products API
  - Unit tests for bulk upload API (16 tests)
  - Component tests for BulkUploadCSV (10 tests)
affects: [inventory-management, bulk-operations, frontend-api-clients]

# Tech tracking
tech-stack:
  added: [csv-parse/sync for CSV parsing]
  patterns: [TDD with vitest, jsdom environment mocking, File API mocking]

key-files:
  created: [apps/web/src/lib/api/vehicles.ts (useBulkUploadProducts), apps/web/tests/unit/api/vehicles.test.tsx, apps/web/src/components/upload/__tests__/BulkUploadCSV.test.tsx]
  modified: [apps/web/src/components/upload/BulkUploadCSV.tsx]

key-decisions:
  - "csv-parse/sync for synchronous CSV parsing (already installed)"
  - "Mock File.text() method for jsdom test environment"
  - "Mock URL.createObjectURL for download template test"
  - "credentials: 'include' in fetch calls (Brain #7 Condition #8)"

patterns-established:
  - "TDD: RED → GREEN → REFACTOR cycle for API hooks"
  - "Vitest mocking patterns for jsdom limitations (File.text, URL.createObjectURL)"
  - "TanStack Query useMutation for async operations"

requirements-completed: ["FE-03"]

# Metrics
duration: 35min
completed: 2026-04-26
---

# Phase 13 Plan 05: Bulk Upload Products API Integration Summary

**CSV bulk upload using POST /api/v1/products/bulk with auto-vehicle creation via attributes.vin, TDD test coverage with 26 passing tests**

## Performance

- **Duration:** 35 min
- **Started:** 2026-04-26T13:11:32Z
- **Completed:** 2026-04-26T13:46:32Z
- **Tasks:** 2 (both TDD)
- **Files modified:** 4
- **Test coverage:** 26 tests passing

## Accomplishments

- **useBulkUploadProducts hook**: Parses CSV with csv-parse/sync, maps rows to products array with attributes.vin for auto-vehicle creation, converts price to cents, includes credentials: 'include' for httpOnly cookies
- **BulkUploadCSV component update**: Updated to use products bulk API, preserves drag-and-drop, preview table, inline error display, progress tracking
- **Comprehensive test coverage**: 16 unit tests for API hook (CSV parsing, column mapping, price conversion, error handling), 10 component tests (dropzone, preview, upload, validation)
- **jsdom test environment fixes**: Mocked File.text() method and URL.createObjectURL for test compatibility

## Task Commits

Each task was committed atomically:

1. **Task 1: Add unit tests for useBulkUploadProducts** - `d7111bf` (test)
2. **Task 2: Add component tests for BulkUploadCSV** - `48c6e3a` (test)

**Previous commits (implementation already complete):**
- `f3fbff4` - feat(13-05): add useBulkUploadProducts hook for products bulk API
- `1085087` - feat(13-05): update BulkUploadCSV to use products bulk API
- `c177451` - test(13-05): add unit tests for useBulkUploadProducts (initial version)

**Plan metadata:** TBD (docs commit after summary)

_Note: Implementation was already complete. This execution focused on fixing and improving tests._

## Files Created/Modified

### Created
- `apps/web/tests/unit/api/vehicles.test.tsx` - Unit tests for useBulkUploadProducts (16 tests)
- `apps/web/src/components/upload/__tests__/BulkUploadCSV.test.tsx` - Component tests for BulkUploadCSV (10 tests)

### Modified
- `apps/web/src/lib/api/vehicles.ts` - Added useBulkUploadProducts hook with CSV parsing and products bulk API integration
- `apps/web/src/components/upload/BulkUploadCSV.tsx` - Updated to use useBulkUploadProducts instead of old vehicles bulk upload

## Decisions Made

1. **csv-parse/sync for CSV parsing**: Library already installed, provides synchronous parsing with proper handling of quoted values and commas in fields
2. **Mock File.text() for jsdom**: jsdom environment doesn't support File.text() method, added polyfill mock in test setup
3. **Mock URL.createObjectURL**: jsdom doesn't support URL.createObjectURL, mocked for template download test
4. **credentials: 'include'**: Applied Brain #7 Condition #8 - all fetch calls include credentials for httpOnly cookie authentication

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed File.text() is not a function error**
- **Found during:** Task 1 (useBulkUploadProducts unit tests)
- **Issue:** jsdom environment doesn't implement File.text() method, tests failing with "TypeError: file.text is not a function"
- **Fix:** Added File.prototype.text mock in test setup using FileReader API
- **Files modified:** apps/web/tests/unit/api/vehicles.test.tsx
- **Verification:** All 16 vehicle API tests passing after fix
- **Committed in:** d7111bf (Task 1 commit)

**2. [Rule 1 - Bug] Fixed URL.createObjectURL is not a function error**
- **Found during:** Task 2 (BulkUploadCSV component tests)
- **Issue:** jsdom environment doesn't support URL.createObjectURL, template download test failing
- **Fix:** Added global mocks for URL.createObjectURL and URL.revokeObjectURL
- **Files modified:** apps/web/src/components/upload/__tests__/BulkUploadCSV.test.tsx
- **Verification:** All 10 component tests passing after fix
- **Committed in:** 48c6e3a (Task 2 commit)

**3. [Rule 2 - Missing Critical] Fixed test mock setup for useBulkUploadProducts**
- **Found during:** Task 2 (BulkUploadCSV component tests)
- **Issue:** Mock setup was trying to change mock return values after import, causing "mockReturnValue is not a function" errors
- **Fix:** Created module-level mock variables (mockMutateAsync, mockMutate, mockIsPending) that can be configured in beforeEach
- **Files modified:** apps/web/src/components/upload/__tests__/BulkUploadCSV.test.tsx
- **Verification:** All component tests passing with proper mock behavior
- **Committed in:** 48c6e3a (Task 2 commit)

**4. [Rule 1 - Bug] Fixed VIN validation test data**
- **Found during:** Task 2 (BulkUploadCSV component tests - "should display inline errors for failed rows")
- **Issue:** Test was using "INVALID_VIN" (12 chars) which triggered client-side VIN length validation, disabling upload button before API call
- **Fix:** Changed test data to use valid 17-character VIN with invalid checksum (1HGCM82633A004352)
- **Files modified:** apps/web/src/components/upload/__tests__/BulkUploadCSV.test.tsx
- **Verification:** Test now properly validates server-side error display
- **Committed in:** 48c6e3a (Task 2 commit)

---

**Total deviations:** 4 auto-fixed (3 bugs, 1 missing critical)
**Impact on plan:** All auto-fixes necessary for test infrastructure and proper test behavior. No scope creep.

## Issues Encountered

### Test Infrastructure Issues

1. **File.text() not available in jsdom**
   - **Problem:** jsdom test environment doesn't implement File API methods like text()
   - **Solution:** Created mock using FileReader API in test setup
   - **Impact:** Required for all File-based tests to function

2. **URL.createObjectURL not available in jsdom**
   - **Problem:** jsdom doesn't support URL.createObjectURL/revokeObjectURL
   - **Solution:** Added global mocks returning mock URL
   - **Impact:** Required for template download test

3. **Mock setup complexity with vi.mock()**
   - **Problem:** Trying to change mock return values after import caused errors
   - **Solution:** Created module-level mock variables that can be configured in beforeEach
   - **Impact:** Cleaner mock setup, easier to maintain

4. **Client-side validation preventing server error test**
   - **Problem:** VIN length validation (17 chars) was triggering before upload, preventing test of server-side errors
   - **Solution:** Used valid-length VIN with invalid checksum for test data
   - **Impact:** Test now properly validates error display flow

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

✅ **Ready for Phase 13 Plan 06** (E2E Testing):
- Bulk upload API fully tested and functional
- Component tests cover all user flows
- Brain #7 Condition #8 applied (credentials: 'include')
- No blockers or concerns

**Verification commands:**
```bash
# Run unit tests
cd apps/web && pnpm test -- vehicles.test.tsx BulkUploadCSV.test.tsx

# Verify API integration
curl -X POST http://localhost:8000/api/v1/products/bulk \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=<token>" \
  -d '{"products": [{"title": "Test", "price_cents": 1000, "category_id": "uuid", "attributes": {"vin": "1HGCM82633A004352"}}]}'
```

---
*Phase: 13-frontend*
*Completed: 2026-04-26*
