# Brain #7 Validation Result

**Verdict:** APPROVED_WITH_CONDITIONS (75/100)
**Date:** 2026-04-26T01:45:00Z
**Iteration:** 1

---

## Conditions Summary

| # | Plan | Task | Condition | Status | Action |
|---|------|------|-----------|--------|--------|
| 1 | 13-02 | Task 3 | Scope attribute rendering (hardcoded vs FormBuilder) | ✅ ALREADY ADDRESSED | Plan already says "hardcoded conditional rendering" |
| 2 | 13-03 | Task 1 | Add rollback strategy for orphaned products | ✅ ALREADY ADDRESSED | Backend Phase 12 has CASCADE delete |
| 3 | 13-03 | Task 2 | Add explicit field mapping table | 🔴 MUST FIX | Add mapping to PLAN.md |
| 4 | 13-03 | AC | Change AC to be automatable | 🔴 MUST FIX | Update wording in PLAN.md |
| 5 | 13-06 | Task 1 | Tag existing tests vs separate smoke file | 🔴 MUST FIX | Change approach in PLAN.md |
| 6 | 13-02 | Task 2 | VIN decode waits for categories | 🟡 SHOULD FIX | Add to PLAN.md |
| 7 | 13-04 | Task 1 | Add virtualization AC | 🟡 SHOULD FIX | Add to PLAN.md |
| 8 | ALL | - | Verify API clients include credentials | 🔴 MUST FIX | Add `credentials: 'include'` to all fetch calls |
| 9 | 13-06 | Task 2 | Add specific title assertions | 🟡 SHOULD FIX | Add to PLAN.md |
| 10 | 13-05 | AC | Add vehicle_ids to response | 🟢 NICE TO HAVE | Deferred |

---

## Critical Conditions (Must Fix)

### ✅ Condition #1: Attribute Schema Scope
**Status**: ALREADY ADDRESSED — Plan 13-02 already specifies "hardcoded conditional rendering"

**Plan says**: "Attribute schema rendering (Decision #4): Hardcoded conditional render now, FormBuilder deferred"

**Verification**: ✅ Correct - no gap

---

### ✅ Condition #2: Rollback Strategy
**Status**: ALREADY ADDRESSED — Backend Phase 12 implemented CASCADE delete

**Evidence**: Phase 12-05-SUMMARY.md shows CASCADE test: "create product → create vehicle → DELETE product → GET vehicle → assert 404"

**Action**: Document existing backend behavior in Plan 13-03

---

### 🔴 Condition #3: Field Mapping Table
**Status**: MUST FIX — Plan 13-03 Task 2 needs explicit mapping

**Gap**: VehicleForm has 40+ fields but mapping to `CreateProductRequest.attributes` is not specified

**Fix**: Add to Plan 13-03:
```markdown
| VehicleForm Field | CreateProductRequest Mapping |
|-------------------|------------------------------|
| vin | attributes.vin (REQUIRED - triggers auto-vehicle creation) |
| year | attributes.year |
| make | attributes.make |
| model | attributes.model |
| trim | attributes.trim |
| price | price_cents (× 100, NOT in attributes) |
| category_id | category_id (top-level, NOT in attributes) |
| body_type | attributes.body_type |
| mileage | attributes.mileage |
| exterior_color | attributes.exterior_color |
| interior_color | attributes.interior_color |
| ... | ... |
```

---

### 🔴 Condition #4: Acceptance Criteria Verification
**Status**: MUST FIX — AC requires DB access

**Change**:
- OLD: "Product and vehicle records created in DB"
- NEW: "API response includes `has_vehicle: true` and `vehicle_id` populated"

---

### 🔴 Condition #5: Smoke Tests Approach
**Status**: MUST FIX — Separate file = duplication

**Change**:
- OLD: "Create tests/e2e/smoke.spec.ts with 20 tests"
- NEW: "Tag 20 existing tests as @smoke, run via `pnpm test --grep @smoke`"

---

### 🔴 Condition #8: Auth Cookies
**Status**: MUST FIX — categories.ts and products.ts missing credentials

**Evidence**: teamApi.ts uses `credentials: 'include'` but categories.ts/products.ts don't

**Fix**: Update all fetch calls:
```typescript
const res = await fetch("/api/v1/categories", {
  credentials: "include", // httpOnly auth cookies
});
```

---

## Medium Conditions (Should Fix)

### 🟡 Condition #6: VIN Decode Execution Order
**Status**: SHOULD FIX — Race condition possible

**Add to Plan 13-02 Task 2**: "VIN decode hook waits for categories to load before auto-selecting category"

---

### 🟡 Condition #7: Virtualization Acceptance Criteria
**Status**: SHOULD FIX — Need explicit verification

**Add to Plan 13-04**: "Virtualization maintains ~40 rows in DOM (verified via Chrome DevTools Elements tab)"

---

### 🟡 Condition #9: Specific Test Assertions
**Status**: SHOULD FIX — Prevent false positives

**Add to Plan 13-06 Task 2**: "DataGrid tests assert on specific title values (e.g., '2017 Toyota Camry'), not just existence"

---

## Execution Proceeds With

**Updated Plans**:
- Plan 13-01: ✅ SKIP (already complete)
- Plan 13-02: Execute with Condition #6 added
- Plan 13-03: Execute with Conditions #3, #4, #8 added
- Plan 13-04: Execute with Conditions #7, #8 added
- Plan 13-05: Execute with Condition #8 added
- Plan 13-06: Execute with Conditions #5, #8, #9 added

---

## Next Steps

1. ✅ Plans are APPROVED_WITH_CONDITIONS
2. ✅ Conditions are documented and actionable
3. ✅ Can proceed to GSD execution
4. ✅ No second Brain #7 iteration needed (gaps are fixable)

**Delegating to GSD for execution.**
