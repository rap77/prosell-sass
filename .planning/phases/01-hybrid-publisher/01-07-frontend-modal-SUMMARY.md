---
phase: 01-hybrid-publisher
plan: "07"
subsystem: ui
tags: [react-19, nextjs-15, radix-ui, react-hook-form, zod, zustand, tanstack-query, tailwind]

requires:
  - phase: 01-hybrid-publisher
    provides: "Publisher API endpoints (POST publish, PATCH update, DELETE delete, POST unlock)"

provides:
  - "PublishModal (Radix Dialog, page-level, dual publish/update mode)"
  - "PublishForm (RHF+Zod, image_urls.min(1), price>0, FB page required)"
  - "HeroShotSelector (click-to-hero with PORTADA badge)"
  - "PublicationStatus badge (pending/publishing/published/failed/expired/sold)"
  - "publisherApi.ts (typed fetch client for all 4 publisher endpoints)"
  - "publisherStore (Zustand: selectedVehicleId, modalMode, engineOverride)"
  - "catalog/page.tsx (vehicle table with per-row publish/update buttons)"

affects:
  - "Phase 2 (SaaS Analytics dashboard) — catalog page is the vendedor's primary workflow entry"
  - "Any future feature that adds a new action to catalog rows"

tech-stack:
  added:
    - "@radix-ui/react-dialog — Radix Dialog for PublishModal"
    - "react-hook-form + @hookform/resolvers + zod — PublishForm validation"
    - "@tanstack/react-query — useMutation for publish/update/delete/unlock"
    - "zustand — publisherStore (already installed)"
    - "next/image — catalog thumbnail with remotePatterns for Unsplash"
  patterns:
    - "Modal at page level (not row level) — prevents row re-render from closing modal"
    - "HeroShotSelector: click = reorder array (hero always index 0), no drag & drop"
    - "Category B error: blocking banner + checkbox recovery → POST /unlock"
    - "Zustand store for modal state shared between page and row components"
    - "TanStack Query invalidateQueries(['catalog']) after each mutation"

key-files:
  created:
    - "apps/web/src/components/publisher/PublishModal.tsx"
    - "apps/web/src/components/publisher/PublishForm.tsx"
    - "apps/web/src/components/publisher/HeroShotSelector.tsx"
    - "apps/web/src/components/publisher/PublicationStatus.tsx"
    - "apps/web/src/lib/api/publisherApi.ts"
    - "apps/web/src/stores/publisherStore.ts"
    - "apps/web/src/app/dashboard/catalog/page.tsx"
  modified:
    - "apps/web/next.config.ts — added images.remotePatterns for Unsplash mock data"

key-decisions:
  - "Modal rendered at page level, not row level — critical for UX: row re-renders must not close modal"
  - "HeroShotSelector: simple click moves image to index 0 (NOT drag & drop) — locked in CONTEXT.md"
  - "Category B recovery: checkbox 'Ya validé mi cuenta de Facebook' → unlock endpoint — human-in-the-loop pattern"
  - "catalog/page.tsx uses MOCK_VEHICLES for now — real data comes via useQuery(['catalog']) once API is ready"
  - "Dead code currentFbPriceCents removed — FB price diff display deferred until API returns current FB price"

patterns-established:
  - "PublishModal receives vehicleId+mode from publisherStore, not from row component props"
  - "publishVehicle/updateListing/deleteListing/unlockCategoryB all use credentials:include for httpOnly cookie auth"
  - "PublishForm schema: price in USD in the form field, converted to cents (×100) on submit"

requirements-completed: [PUBLISH-01, PUBLISH-04, PUBLISH-05, PUBLISH-06, PUBLISH-07, PUBLISH-09, PUBLISH-10]

duration: 45min
completed: 2026-03-15
---

# Phase 1 Plan 07: Frontend Publisher Modal Summary

**Radix Dialog publish flow with RHF+Zod form, page-level modal preventing row re-renders, hero shot click-to-reorder, and Category B error recovery UI wired to `/unlock` endpoint**

## Performance

- **Duration:** ~45 min (continuation from prior session — tasks 07-01 and 07-02 already committed)
- **Started:** 2026-03-15T00:00:00Z (prior session)
- **Completed:** 2026-03-15T18:30:00Z
- **Tasks:** 3 (07-01, 07-02, 07-03)
- **Files created:** 7 + 1 modified

## Accomplishments

- Full publish flow: catalog row button → Radix Dialog overlay → RHF+Zod form → POST /publish → row badge updates
- HeroShotSelector: click any image → moves to index 0 → "PORTADA" badge — simple, no drag & drop
- Category B blocking error: red banner + "Facebook solicita validación de seguridad" + checkbox + POST /unlock
- PublicationStatus badge renders pending/publishing/published/failed/expired/sold states with Tailwind color coding
- catalog/page.tsx: modal at page level (architecture pattern locked in CONTEXT.md)

## Task Commits

1. **Task 07-01: Publisher API client and Zustand store** — `7153ba8` (feat)
2. **Task 07-02: HeroShotSelector + PublicationStatus badge** — `0c63f98` (feat)
3. **Task 07-03: PublishModal + PublishForm + catalog integration** — `f8daf70` (feat)

## Files Created/Modified

- `apps/web/src/lib/api/publisherApi.ts` — typed fetch client: publishVehicle, updateListing, deleteListing, unlockCategoryB
- `apps/web/src/stores/publisherStore.ts` — Zustand: selectedVehicleId, modalMode, engineOverride
- `apps/web/src/components/publisher/HeroShotSelector.tsx` — click-to-hero image grid with PORTADA badge
- `apps/web/src/components/publisher/PublicationStatus.tsx` — catalog row badge with Category B "Atención Requerida" label
- `apps/web/src/components/publisher/PublishForm.tsx` — RHF+Zod form (title, desc, price, ZIP, FB page, hero shot)
- `apps/web/src/components/publisher/PublishModal.tsx` — Radix Dialog, dual mode, CategoryBErrorBanner, mutations
- `apps/web/src/app/dashboard/catalog/page.tsx` — vehicle table, PublishModal at page level
- `apps/web/next.config.ts` — images.remotePatterns for Unsplash (mock data)

## Decisions Made

- Modal at page level is CRITICAL: if rendered inside each row, a row re-render (e.g., from query refetch) closes the modal mid-form
- Hero shot: click = move to index 0. Array reordered, hero_shot_index stays 0. Simple, not drag & drop
- FB price diff in update mode deferred — API does not return current FB listing price yet
- catalog/page.tsx uses mock data; real data fetching via `useQuery({ queryKey: ["catalog"] })` is next session's work

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced `<img>` tag with `next/image` in catalog page**
- **Found during:** Task 07-03 (GGA code review on commit)
- **Issue:** Plain `<img>` tag used for vehicle thumbnail — violates Next.js 15 rules, no optimization
- **Fix:** Replaced with `<Image>` from `next/image` with explicit `width={56} height={40}`; added `images.remotePatterns` for Unsplash in `next.config.ts`
- **Files modified:** `apps/web/src/app/dashboard/catalog/page.tsx`, `apps/web/next.config.ts`
- **Verification:** `pnpm typecheck` passes, GGA code review passed on retry
- **Committed in:** `f8daf70` (Task 07-03 commit)

**2. [Rule 1 - Bug] Removed dead code `currentFbPriceCents` from PublishForm**
- **Found during:** Task 07-03 (GGA code review on commit)
- **Issue:** `const currentFbPriceCents = currentPublication ? null : null` — always null, conditional UI block never rendered
- **Fix:** Removed the variable and the associated price diff UI block
- **Files modified:** `apps/web/src/components/publisher/PublishForm.tsx`
- **Verification:** `pnpm typecheck` passes, no TS errors
- **Committed in:** `f8daf70` (Task 07-03 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - Bug, caught by GGA pre-commit)
**Impact on plan:** Both fixes are correctness/quality issues. No scope creep. GGA caught both on first commit attempt; fixed and re-committed cleanly.

## Issues Encountered

- First commit attempt failed GGA review: plain `<img>` tag and dead code `currentFbPriceCents`
- Fixed both inline, re-staged all files, second commit passed

## User Setup Required

None — no external service configuration required for this plan.

## Next Phase Readiness

- Publisher UI complete — vendedor can open modal from catalog, fill form, submit to backend
- catalog/page.tsx uses mock data; real data fetching needs `useQuery({ queryKey: ["catalog"] })` wired to catalog API endpoint (Phase 2 or next iteration)
- FB Pages dropdown uses mock page data; real FB Pages require Graph API `/me/accounts` integration
- End-to-end flow ready for manual testing once dev server is running

---
*Phase: 01-hybrid-publisher*
*Completed: 2026-03-15*
