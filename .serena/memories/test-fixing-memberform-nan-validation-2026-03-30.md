# Test Fixing: MemberForm NaN Validation Issue

**Date**: 2026-03-30
**Type**: bugfix
**Context**: Fixed 2 failing tests in MemberForm.test.tsx with timeout issues

---

## Problem

2 tests failing with timeout in `waitFor`:
1. "calls addTeamMember with form data on submit"
2. "calls toast.error when addTeamMember throws"

**Symptoms**:
- `waitFor` timing out after 1000ms
- Mock spy never called (0 calls)
- Form validation failing before submission

---

## Root Causes

### Issue 1: Mock Name Mismatch
- **Problem**: Test mocked `addTeamMember` but component calls `addMember`
- **Why**: Store method was renamed but tests not updated
- **Impact**: Mock never triggered, form submission silently failed

### Issue 2: NaN Validation Error
- **Problem**: Empty `commission_rate` field became `NaN`, causing validation to fail
- **Why**: React Hook Form's `valueAsNumber: true` converts empty strings to `NaN`
- **Impact**: Zod's `.optional()` doesn't accept `NaN` as valid value, blocking form submission

---

## Solutions

### Fix 1: Update Mock Names
```typescript
// Before
const mockAddTeamMember = vi.fn();
vi.mock("@/stores", () => ({
  useTeamStore: vi.fn(() => ({
    addTeamMember: mockAddTeamMember,
    // ...
  })),
}));

// After
const mockAddMember = vi.fn();
vi.mock("@/stores", () => ({
  useTeamStore: vi.fn(() => ({
    addMember: mockAddMember,
    // ...
  })),
}));
```

### Fix 2: Handle NaN in Zod Schema
```typescript
// Before
commission_rate: z
  .number()
  .min(0, "Commission must be 0 or greater")
  .max(100, "Commission cannot exceed 100%")
  .optional(),

// After
commission_rate: z.preprocess(
  (val) => (Number.isNaN(val) ? undefined : val),
  z
    .number()
    .min(0, "Commission must be 0 or greater")
    .max(100, "Commission cannot exceed 100%")
    .optional()
),
```

---

## Key Learnings

### React Hook Form + Zod Pattern
When using `valueAsNumber: true` with optional number fields:
1. Empty strings → `NaN`
2. `NaN` is not a valid Zod number
3. Use `z.preprocess` to convert `NaN` to `undefined`

### Mock Hygiene
- Always verify mock names match actual implementation
- Check store methods when refactoring
- Run tests immediately after renaming methods

---

## Test Results

**Before**: 508 passed, 2 failed (timeout)
**After**: 510 passed, 0 failed

---

## Files Changed

- `apps/web/src/components/forms/MemberForm.tsx` - Added `z.preprocess` for NaN handling
- `apps/web/tests/components/forms/MemberForm.test.tsx` - Updated mock names

---

## Related Patterns

From `test-fixing-patterns-prosell-saas-2026-03-28`:
- Pattern 1: API/Method name mismatches
- Pattern 6: Hook not mocked correctly

---

## Anti-Patterns to Avoid

❌ Don't use `valueAsNumber: true` without handling `NaN`
❌ Don't rename store methods without updating tests
❌ Don't assume `.optional()` handles `NaN`

---

## Handoff

When fixing React Hook Form + Zod validation issues:
1. Check if `valueAsNumber` is used with optional fields
2. Verify mock names match implementation
3. Use `z.preprocess` for edge cases like `NaN`, `null`, `undefined`
