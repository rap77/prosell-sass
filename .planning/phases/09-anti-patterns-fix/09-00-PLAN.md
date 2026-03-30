---
phase: 09-anti-patterns-fix
plan: 00
subsystem: code-quality
tags: [react-19, anti-patterns, refactoring, toast-notifications]
---

# Phase 09 - Anti-Patterns Fix - PLAN

**Goal**: Remove anti-patterns from codebase to align with Phase 8 standards

**Scope**: Fix useCallback usage and console.error in forms

---

## Tasks

### Task 01: Remove useCallback from useLocalStorage.ts
**File**: `apps/web/src/hooks/useLocalStorage.ts`
**Change**: Remove useCallback import and usage
**Reason**: React 19 Compiler handles optimization

### Task 02: Remove useCallback from useOAuthPreload.ts
**File**: `apps/web/src/hooks/useOAuthPreload.ts`
**Change**: Remove useCallback from handleMouseEnter
**Reason**: React 19 Compiler handles optimization

### Task 03: Remove useCallback from useVehicleFilters.ts
**File**: `apps/web/src/lib/hooks/useVehicleFilters.ts`
**Change**: Remove useCallback from setFilter and clearAllFilters
**Reason**: React 19 Compiler handles optimization

### Task 04: Replace console.error with toast in TeamForm.tsx
**File**: `apps/web/src/components/forms/TeamForm.tsx`
**Change**: Replace console.error with toast notification
**Reason**: Production code should not use console.error

### Task 05: Replace console.error with toast in MemberForm.tsx
**File**: `apps/web/src/components/forms/MemberForm.tsx`
**Change**: Replace console.error with toast notification
**Reason**: Production code should not use console.error

### Task 06: Replace console.error with toast in OrganizationForm.tsx
**File**: `apps/web/src/components/forms/OrganizationForm.tsx`
**Change**: Replace console.error with toast notification
**Reason**: Production code should not use console.error

---

## Success Criteria

- [ ] No useCallback imports in hooks
- [ ] No console.error in form components
- [ ] All tests passing (476/476)
- [ ] GGA review passed

---

## Estimated Time

- Tasks 01-03: ~10 minutes (remove useCallback)
- Tasks 04-06: ~15 minutes (add toast notifications)
- **Total**: ~25 minutes

---

## Dependencies

None - this is standalone refactoring
