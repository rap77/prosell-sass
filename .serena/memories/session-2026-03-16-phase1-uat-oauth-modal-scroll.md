---
name: session-2026-03-16-phase1-uat-oauth-modal-scroll
description: Phase 1 UAT Round 2 — OAuth fix done, modal scroll issue remains
type: project
---

# Session 2026-03-16: Phase 1 UAT + OAuth Fix + Modal Scroll Issue

## Status
Phase 1 (Hybrid Publisher): UAT Round 2 in progress — OAuth fix complete ✅, modal scroll issue blocks tests 3-10

## Fixes Applied (Round 2)

### 1. OAuth Cookie Fix — COMPLETE ✅
**File:** `apps/api/src/prosell/infrastructure/api/routers/auth_router.py`
- Lines 427, 440: Changed `secure=True` → `secure=settings.environment != "development"`
- Cookies affected: `access_token`, `user_data`
- **Validated:** User can access /dashboard/catalog after OAuth login
- **Container restarted:** API docker container rebuilt

**Root Cause:** Cookies with `secure=True` don't save in localhost HTTP (development). The fix makes cookies respect environment.

### 2. Modal Border-Radius — PARTIAL ⚠️
**File:** `apps/web/src/components/publisher/PublishModal.tsx`
- **Achieved:** 4 rounded corners ✅
- **Remaining:** Scroll vertical doesn't work ❌

**Problem:** PublishForm (520 lines) gets cut off, no scroll appears. Multiple CSS structures attempted:

```tsx
// Attempted structures:
1. flex-1 overflow-y-auto min-h-0 ❌
2. max-h-[60vh] overflow-y-auto ❌
3. h-full overflow-y-auto ❌
4. overflow-hidden wrapper with rounded-b-xl ❌
```

**Current Structure:**
```tsx
<Dialog.Content className="max-h-[90vh] flex flex-col overflow-hidden rounded-xl">
  <div className="flex-shrink-0 bg-white px-6 pt-6 pb-4 border-b">
    {/* Header */}
  </div>
  <div className="flex-1 min-h-0">
    <div className="h-full overflow-y-auto px-6 py-4 pb-8">
      {/* Content */}
    </div>
  </div>
</Dialog.Content>
```

## UAT Round 2 Status

| Test | Result | Notes |
|------|--------|-------|
| 1. Catalog page loads | ✅ Pass | 3 vehicles mock displayed |
| 2. Modal opens w/ sticky X | ⚠️ Partial | Border-radius OK, scroll broken |
| 3-10 | Blocked | Waiting for modal fix |

## Technical Decisions

1. **OAuth fix over bypass:** User chose to fix `secure` flag correctly instead of middleware workaround
2. **SameSite=Lax required:** OAuth callbacks need Lax for cross-site redirects
3. **UI approach:** Used `example-skills:frontend-design` skill but issue persists - likely Radix Dialog specific pattern needed

## Blockers

**Modal scroll doesn't work:** PublishForm content gets cut off despite multiple CSS attempts. Possible causes:
- Radix Dialog requires specific structure for scroll areas
- PublishForm has interfering styles
- TailwindCSS 4 specific behavior
- Height calculation issue in flex container

## Next Session Actions

**Priority 1:** Fix modal scroll
- Option A: Research Radix Dialog scroll patterns
- Option B: Use explicit pixel heights instead of vh
- Option C: Try `max-h-screen` with calc for header
- Option D: Check PublishForm root styles for interference

**Priority 2:** Complete UAT Round 2
- Run tests 3-10 after modal fix
- Update 01-UAT.md with results
- Commit changes (OAuth + Modal fixes)

## Files Modified (Uncommitted)

- `apps/api/src/prosell/infrastructure/api/routers/auth_router.py` — OAuth cookie fix
- `apps/web/src/components/publisher/PublishModal.tsx` — Modal structure (multiple iterations)
- `.planning/phases/01-hybrid-publisher/.continue-here.md` — GSD handoff created

## Resume Command

```bash
/clear → /gsd:resume-work
```

## Commit Reference

WIP commit: `d8243e6` — "wip: 01-hybrid-publisher paused at UAT Round 2 - modal scroll issue"
