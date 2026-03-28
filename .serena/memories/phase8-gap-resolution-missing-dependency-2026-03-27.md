# Phase 8 Gap Resolution Pattern: Missing Dependency Detection

**Date**: 2026-03-27
**Pattern**: Verification phase catches execution gaps
**Severity**: Critical (build/runtime failure)

---

## The Gap

**What**: ImageDropzone.tsx imports `react-dropzone` but package.json didn't declare it

**Discovery Method**: 08-VERIFICATION.md — agent checked if imported packages exist in package.json

**Impact**: Image upload feature completely broken (build would fail, runtime would crash)

**Root Cause**: Plan 08-04 Task 1 summary claimed "install react-dropzone" happened, but package.json wasn't actually updated. Commit `edae480` said "install react-dropzone" but the package wasn't in that commit either.

---

## The Fix

**Time to fix**: 2 minutes
```bash
cd apps/web
pnpm add react-dropzone@^15.0.0
git add package.json pnpm-lock.yaml
git commit -m "fix(phase-08): add missing react-dropzone dependency"
```

**Commits**:
- 86829bb: fix(phase-08): add missing react-dropzone dependency
- 9873772: docs(phase-08): update VERIFICATION.md - gap resolved

---

## The Pattern

### Why This Happens

1. **Agent claims vs reality**: Execution agent reports "installed dependency" but doesn't verify package.json actually changed
2. **Pre-commit doesn't catch**: Linters check code quality, not dependency integrity
3. **No build step**: Without `pnpm build`, the missing import isn't caught

### Prevention

**Verification phase is MANDATORY**:
- After every plan execution, run verification agent
- Check that imported packages exist in package.json
- Check that files created actually exist on disk
- Don't trust agent summaries — verify actual artifacts

**Verification checklist**:
- [ ] All imports resolve (check package.json for new dependencies)
- [ ] All files created exist on disk (`ls` check)
- [ ] Build succeeds (`pnpm build` or equivalent)
- [ ] Tests can run (even if they're stubs)

---

## Lesson

**Verification > Claims**

Agent summaries are optimistic. Verification phases are pessimistic (by design). This tension is valuable — it catches gaps before they reach production.

**The cost**:
- Fix time: 2 minutes
- Discovery time: 5 minutes (verification phase)
- Total: 7 minutes

**vs. production failure**:
- Discovery time: Days/weeks (when users report broken feature)
- Fix time: Emergency hotfix + deployment
- Reputation cost: High

---

## Related Patterns

See also: `completion-gates-pattern-2026-03-06.md` — Verification gates prevent incomplete work from being considered "done."

---

**Takeaway**: Always verify. Agent summaries are progress reports, not completion certificates.
