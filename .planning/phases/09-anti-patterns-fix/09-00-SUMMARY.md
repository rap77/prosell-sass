---
phase: 09-anti-patterns-fix
plan: 00
subsystem: code-quality
tags: [react-19, anti-patterns, refactoring, toast-notifications]
---

# Phase 09 Plan 00: Anti-Patterns Fix Summary

**Completed:** 2026-03-28
**Duration:** ~25 minutes
**Status:** ✅ COMPLETE

## One-Liner

React 19 Compiler enabled with useCallback removed from 3 hooks and console.error replaced with toast notifications in 3 forms, achieving 476/476 tests passing.

## Completed Tasks

| Task | Name | Commit | Files |
| ---- | ---- | ---- | ----- |
| 00 | Enable React Compiler | 68557bc | next.config.ts, catalog/create/page.tsx, ActionMenu.tsx, DataGridRow.tsx, CommandPalette.tsx, images.ts, middleware.ts, setup.tsx, vitest.config.ts |
| 01-03 | Remove useCallback | 3fb4aad | useLocalStorageSchema.ts, useOAuthPreload.ts, useVehicleFilters.ts |
| 04-06 | Replace console.error with toast | 26dcd57 | TeamForm.tsx, MemberForm.tsx, OrganizationForm.tsx |
| - | Fix tests | 043af3e | DataGridRow.test.tsx, setup.tsx, CommandPalette.test.tsx |

## Deviations from Plan

### Auto-fixed Issues (Rule 1 - Bugs)

**1. [Task 00] Missing use-toast component**
- **Found during:** Build verification after enabling React Compiler
- **Issue:** catalog/create/page.tsx imported non-existent `@/components/ui/use-toast`
- **Fix:** Replaced with `import { toast } from "sonner"` and updated API calls
- **Files modified:** apps/web/src/app/(seller)/catalog/create/page.tsx

**2. [Task 00] Missing DropdownMenu import**
- **Found during:** Build verification
- **Issue:** ActionMenu.tsx used DropdownMenu without importing it
- **Fix:** Added DropdownMenu to import statement
- **Files modified:** apps/web/src/components/datagrid/ActionMenu.tsx

**3. [Task 00] TypeScript errors in DataGridRow.tsx**
- **Found during:** Build verification
- **Issue:** Generic types not properly defined for React.memo with Row<T>
- **Fix:** Refactored to proper generic function with explicit typing
- **Files modified:** apps/web/src/components/datagrid/DataGridRow.tsx

**4. [Task 00] CommandPalette.tsx using non-existent vin property**
- **Found during:** Build verification
- **Issue:** CommandPalette filtered vehicles by `vin` property that doesn't exist on Vehicle type
- **Fix:** Changed to filter by `make` and `model` instead
- **Files modified:** apps/web/src/components/layout/CommandPalette.tsx

**5. [Task 00] cmdk API changed (Command.Dialog → CommandDialog)**
- **Found during:** Build verification
- **Issue:** cmdk library now uses named exports instead of Command namespace
- **Fix:** Updated imports to use CommandDialog, CommandInput, etc.
- **Files modified:** apps/web/src/components/layout/CommandPalette.tsx

**6. [Task 00] uploadToCloud return type mismatch**
- **Found during:** Build verification
- **Issue:** Function returned string but typed as Promise<void>
- **Fix:** Removed return value, kept void return type
- **Files modified:** apps/web/src/lib/api/images.ts

**7. [Task 00] middleware.ts type assertion error**
- **Found during:** Build verification
- **Issue:** roleHome variable had incorrect type assertion
- **Fix:** Split into roleHomes object and roleHome variable
- **Files modified:** apps/web/src/middleware.ts

**8. [Task 00] tests/setup.tsx data-testid type error**
- **Found during:** Build verification
- **Issue:** React.cloneElement with data-testid not recognized
- **Fix:** Added `as unknown` type cast
- **Files modified:** apps/web/tests/setup.tsx

**9. [Task 00] vitest.config.ts coverage thresholds**
- **Found during:** Build verification
- **Issue:** Coverage thresholds at wrong level in config
- **Fix:** Moved to `thresholds` property
- **Files modified:** apps/web/vitest.config.ts

**10. [Tasks 01-03] Missing 'use client' directive**
- **Found during:** Pre-commit GGA review
- **Issue:** useLocalStorageSchema.ts and useOAuthPreload.ts missing 'use client' directive
- **Fix:** Added directive (useOAuthPreload had it after JSDoc, moved to top)
- **Files modified:** apps/web/src/hooks/useLocalStorageSchema.ts, apps/web/src/hooks/useOAuthPreload.ts

**11. [Tasks 01-03] console.* usage instead of logger**
- **Found during:** Pre-commit GGA review
- **Issue:** Direct console.warn/console.error/console.info usage
- **Fix:** Replaced with logger.warn/logger.error/logger.info
- **Files modified:** apps/web/src/hooks/useLocalStorageSchema.ts, apps/web/src/hooks/useOAuthPreload.ts

**12. [Test fixes] DataGridRow test using wrong export**
- **Found during:** Test execution
- **Issue:** Test imported DataGridRow but component exports MemoizedDataGridRow
- **Fix:** Updated all test references to use MemoizedDataGridRow
- **Files modified:** apps/web/tests/unit/components/datagrid/DataGridRow.test.tsx

**13. [Test fixes] Missing cmdk mocks**
- **Found during:** Test execution
- **Issue:** tests/setup.tsx didn't mock cmdk components
- **Fix:** Added CommandDialog, CommandInput, CommandList, etc. mocks
- **Files modified:** apps/web/tests/setup.tsx

**14. [Test fixes] CommandPalette test using old cmdk API**
- **Found during:** Test execution
- **Issue:** Test mocked Command.Dialog instead of CommandDialog
- **Fix:** Updated mock to use named exports
- **Files modified:** apps/web/tests/unit/components/layout/CommandPalette.test.tsx

**15. [Test fixes] 'any' types in test mocks**
- **Found during:** Pre-commit GGA review
- **Issue:** Mock components used 'any' type
- **Fix:** Replaced with 'unknown' for type safety
- **Files modified:** apps/web/tests/setup.tsx

## Key Decisions

### React Compiler Enablement
- **Decision:** Use Next.js 16 built-in React Compiler (`reactCompiler: true` in next.config.ts)
- **Rationale:** Next.js 16 has native support, no babel plugin needed
- **Impact:** Automatic optimization of function stability and re-renders

### useCallback Removal
- **Decision:** Remove all useCallback usage from hooks
- **Rationale:** React Compiler automatically handles function memoization
- **Impact:** Cleaner code, fewer dependency arrays to maintain

### Toast Notifications
- **Decision:** Use sonner for all error toasts
- **Rationale:** Sonner already installed and used in vehicles.ts
- **Impact:** Consistent error reporting across forms

## Metrics

### Test Coverage
- **Before:** 476/476 tests passing (100%)
- **After:** 476/476 tests passing (100%)
- **Status:** ✅ All tests passing

### Build Status
- **Before:** Build failing (9 pre-existing errors)
- **After:** Build passing (29.6s compile)
- **Status:** ✅ Production-ready

### Code Quality
- **Pre-commit GGA:** All checks passed
- **Linters:** No errors or warnings
- **TypeScript:** Strict mode passing

## Files Modified

### Core Changes (Plan Tasks)
- `apps/web/next.config.ts` - Enabled reactCompiler
- `apps/web/src/hooks/useLocalStorageSchema.ts` - Removed useCallback
- `apps/web/src/hooks/useOAuthPreload.ts` - Removed useCallback
- `apps/web/src/lib/hooks/useVehicleFilters.ts` - Removed useCallback
- `apps/web/src/components/forms/TeamForm.tsx` - Added toast.error
- `apps/web/src/components/forms/MemberForm.tsx` - Added toast.error
- `apps/web/src/components/forms/OrganizationForm.tsx` - Added toast.error

### Bug Fixes (Rule 1 Deviations)
- `apps/web/src/app/(seller)/catalog/create/page.tsx` - Fixed use-toast import
- `apps/web/src/components/datagrid/ActionMenu.tsx` - Added DropdownMenu import
- `apps/web/src/components/datagrid/DataGridRow.tsx` - Fixed generic types
- `apps/web/src/components/layout/CommandPalette.tsx` - Fixed vin property, updated cmdk imports
- `apps/web/src/lib/api/images.ts` - Fixed return type
- `apps/web/src/middleware.ts` - Fixed type assertion
- `apps/web/tests/setup.tsx` - Fixed data-testid type, added cmdk mocks, replaced any with unknown
- `apps/web/vitest.config.ts` - Fixed coverage thresholds

### Test Fixes
- `apps/web/tests/unit/components/datagrid/DataGridRow.test.tsx` - Updated to MemoizedDataGridRow
- `apps/web/tests/unit/components/layout/CommandPalette.test.tsx` - Updated cmdk mock

## Commits

1. `68557bc` - feat(09-00): enable React Compiler and fix pre-existing build errors
2. `3fb4aad` - refactor(09-01/02/03): remove useCallback from hooks (React Compiler)
3. `26dcd57` - refactor(09-04/05/06): replace console.error with toast in forms
4. `043af3e` - test(09): fix tests after refactoring changes

## Next Steps

Phase 09 complete. Recommended next actions:

1. **Continue to Phase 2** - Catalog & Roles implementation
2. **Production deployment** - Phase 8 is production-ready with 100% tests
3. **Address technical debt** - tenant_id=None for OAuth users, auth rate limiting, SendGrid wiring

## Success Criteria

- ✅ React Compiler enabled and verified in build logs
- ✅ No useCallback imports in hooks (after Compiler enabled)
- ✅ No console.error in form components
- ✅ All tests passing (476/476)
- ✅ GGA review passed
- ✅ Build passing (29.6s compile)

## Self-Check: PASSED

- ✅ All commits exist in git log
- ✅ All files modified are tracked
- ✅ Tests passing (476/476)
- ✅ Build passing
- ✅ Pre-commit hooks passing
