---
phase: 08-layout-shell-vehicle-management
plan: 01
subsystem: ui-layout
tags: [nextjs-16, react-19, typescript, tailwindcss-4, zustand, shadcn-ui, radix-ui, middleware, route-groups, role-based-access]

# Dependency graph
requires:
  - phase: 01-hybrid-publisher
    provides: auth system, user roles, react query provider, auth provider
provides:
  - Role-based layout shell with 4 route groups (admin, seller, dealer, manager)
  - Collapsible sidebar with corrected user terminology (Inventario/Ventas/Configuración)
  - Header component with search, breadcrumbs, user menu, and org switcher
  - Mobile bottom navigation with Thumb Zone pattern
  - Middleware guards for auth + role validation at edge
affects: [08-02-datagrid-component, 08-03-search-filters, 08-04-bulk-upload, 08-05-image-upload]

# Tech tracking
tech-stack:
  added: [zustand v5.0.11, framer-motion v12.38.0]
  patterns:
    - Compound Components pattern for Sidebar
    - Server Components by default for route groups
    - Zero Trust middleware at edge (stateless JWT validation)
    - Zustand persist middleware for client-side preferences
    - Role-based route groups with middleware guards

key-files:
  created:
    - apps/web/src/lib/stores/layoutStore.ts
    - apps/web/src/components/layout/Sidebar.tsx
    - apps/web/src/components/layout/Header.tsx
    - apps/web/src/components/layout/MobileNav.tsx
    - apps/web/src/app/(seller)/layout.tsx
    - apps/web/src/app/(admin)/layout.tsx
    - apps/web/src/app/(dealer)/layout.tsx
    - apps/web/src/app/(manager)/layout.tsx
  modified:
    - apps/web/src/middleware.ts
    - apps/web/package.json

key-decisions:
  - "Sidebar terminology: Use Inventario/Ventas/Configuración (user language) NOT Operations/Growth/System (designer model)"
  - "Middleware role guards: Validate at edge before Server Components render (Zero Trust)"
  - "Zustand for sidebar state: Persist only preferences, NOT auth tokens (SC-01 anti-pattern)"
  - "Route groups: Organizational structure for layouts, not URL-based routing"
  - "Mobile nav: 4 critical icons following Thumb Zone pattern (44x44px touch targets)"

patterns-established:
  - "Compound Components: Sidebar.Nav, Sidebar.Footer for shared state without prop drilling"
  - "Role-based filtering: groups prop filters navigation items by user role"
  - "Smart redirects: /dashboard redirects to role-specific home page"
  - "Server Components: All layouts are Server Components by default (minimize client JS)"

requirements-completed: [CATALOG-01, CATALOG-02, CATALOG-03, DASH-03, DASH-04]

# Metrics
duration: 9min
completed: 2026-03-27
---

# Phase 08: Plan 01 - Layout Shell Summary

**Role-based layout shell with 4 route groups, collapsible sidebar using corrected user terminology, functional header with breadcrumbs/search/user menu, mobile bottom navigation, and Zero Trust middleware guards for auth/role validation at edge.**

## Performance

- **Duration:** 9 minutes
- **Started:** 2026-03-27T11:13:50Z
- **Completed:** 2026-03-27T11:22:57Z
- **Tasks:** 7 completed
- **Files modified:** 10 files created/modified

## Accomplishments

- **Professional dashboard infrastructure:** Created 4 role-based route groups (admin, seller, dealer, manager) with Server Component layouts
- **Corrected sidebar terminology:** Implemented Inventario/Ventas/Configuración groups (user language) instead of Operations/Growth/System (designer model)
- **Zero Trust security:** Added middleware role guards that validate auth + role at edge before Server Components render
- **Responsive design:** Desktop sidebar with mobile bottom navigation following Thumb Zone pattern (44x44px touch targets)
- **State management:** Zustand store with persist middleware for sidebar collapse state (NOT auth tokens per SC-01)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Zustand and required dependencies** - `b34b650` (chore)
2. **Task 2: Create Zustand layout store with persist** - `06d4a4d` (feat)
3. **Task 3: Build Sidebar component with corrected terminology** - `67fa382` (feat - from plan 08-00)
4. **Task 4: Build Header component with search and user menu** - `25ab7ad` (feat)
5. **Task 5: Build MobileNav bottom navigation component** - `2d656ab` (feat)
6. **Task 6: Create route group layouts for 4 roles** - `1e9340c` (feat)
7. **Task 7: Implement middleware auth + role + tenant guards** - `6533fc5` (feat)

**Plan metadata:** Final commit pending (docs: complete plan)

_Note: Task 3 was already completed in plan 08-00, reused here._

## Files Created/Modified

### Created
- `apps/web/src/lib/stores/layoutStore.ts` - Zustand store with persist middleware for sidebar collapse state
- `apps/web/src/components/layout/Sidebar.tsx` - Collapsible sidebar with Compound Components pattern and role-based filtering
- `apps/web/src/components/layout/Header.tsx` - Header with search, breadcrumbs, user menu, and org switcher placeholder
- `apps/web/src/components/layout/MobileNav.tsx` - Mobile bottom navigation with 4 critical icons following Thumb Zone pattern
- `apps/web/src/app/(seller)/layout.tsx` - Seller layout with Inventario/Ventas groups (NO Configuración)
- `apps/web/src/app/(admin)/layout.tsx` - Admin layout with full access (Inventario/Ventas/Configuración)
- `apps/web/src/app/(dealer)/layout.tsx` - Dealer layout with inventory-only view (Inventario/Configuración, NO Ventas)
- `apps/web/src/app/(manager)/layout.tsx` - Manager layout with team supervision (Inventario/Ventas like seller)

### Modified
- `apps/web/src/middleware.ts` - Added role-based route protection for /admin, /dealer, /manager routes and smart /dashboard redirects
- `apps/web/package.json` - Verified zustand v5.0.11 and framer-motion v12.38.0 dependencies

## Decisions Made

1. **Sidebar terminology:** Use corrected user language (Inventario/Ventas/Configuración) instead of designer mental model (Operations/Growth/System) per CONTEXT.md Brain #2
2. **Middleware role guards:** Validate auth + role at edge before Server Components render (Zero Trust pattern) - stateless JWT validation for zero latency
3. **Zustand persist:** Only persist sidebar collapse state, NOT auth tokens (SC-01 anti-pattern - tokens use httpOnly cookies)
4. **Route groups:** Organizational structure for layouts, not URL-based routing - route groups filter by role but URLs remain clean (/catalog, /leads, etc.)
5. **Smart redirects:** /dashboard redirects to role-specific home page (admin→/admin/dashboard, seller→/catalog, dealer→/dealer/reports, manager→/manager/team)
6. **Server Components:** All layouts are Server Components by default to minimize client JS sent to browser
7. **Mobile nav pattern:** 4 critical icons (Catálogo, Publicar, Leads, Más) following Thumb Zone pattern with 44x44px touch targets per Fitts's Law

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed undefined variable in Sidebar.Nav**
- **Found during:** Task 3 (Sidebar component creation)
- **Issue:** Sidebar.Nav referenced `groups` variable that wasn't in scope (line 142)
- **Fix:** Removed redundant `if (!groups.includes(group as NavGroup))` check since items are already filtered in parent component
- **Files modified:** apps/web/src/components/layout/Sidebar.tsx
- **Verification:** GGA code review passed after fix
- **Committed in:** Plan 08-00 commit `67fa382`

**2. [Rule 2 - Missing Critical] Added explicit HeaderProps interface**
- **Found during:** Task 4 (Header component creation)
- **Issue:** TypeScript rule violation - component missing props interface
- **Fix:** Added `interface HeaderProps` with user and organization properties
- **Files modified:** apps/web/src/components/layout/Header.tsx
- **Verification:** GGA code review passed after fix
- **Committed in:** `25ab7ad`

**3. [Rule 2 - Missing Critical] Replaced hardcoded user/org data with props**
- **Found during:** Task 4 (Header component creation)
- **Issue:** Hardcoded user data (John Doe, JD, john.doe@example.com, Seller) and org name (ProSell Dealership)
- **Fix:** Added props to Header component with default values, added TODO comments for auth context integration
- **Files modified:** apps/web/src/components/layout/Header.tsx
- **Verification:** GGA code review passed after fix
- **Committed in:** `25ab7ad`

**4. [Rule 2 - Missing Critical] Added 'use client' justification comment**
- **Found during:** Task 4 (Header component creation)
- **Issue:** 'use client' directive without explanation
- **Fix:** Added comment explaining why client-side is required (uses useState and usePathname hooks)
- **Files modified:** apps/web/src/components/layout/Header.tsx
- **Verification:** GGA code review passed after fix
- **Committed in:** `25ab7ad`

---

**Total deviations:** 4 auto-fixed (1 bug, 3 missing critical)
**Impact on plan:** All auto-fixes necessary for correctness (bug fix) and code quality (TypeScript compliance, future auth integration). No scope creep.

## Issues Encountered

- **Git lock error during Task 3 commit:** Pre-commit stashing caused HEAD reference mismatch. Resolved by continuing with existing commit from plan 08-00.
- **GGA code review failures:** Multiple rounds of fixes required for Sidebar.tsx (undefined variable) and Header.tsx (missing interface, hardcoded data, missing comment). All issues resolved successfully.

## User Setup Required

None - no external service configuration required. All dependencies were already installed (zustand, framer-motion).

## Verification Results

### Overall Verification Steps

1. **Layout Shell Structure:**
   - ✅ 4 route groups exist: (admin), (seller), (dealer), (manager)
   - ✅ Sidebar.tsx, Header.tsx, MobileNav.tsx exist in components/layout/

2. **Role-Based Access:**
   - ✅ Middleware validates role before rendering layout
   - ✅ Seller cannot access /admin routes (redirects to /dashboard)
   - ✅ Admin can access /admin/settings
   - ✅ Dealer sees inventory-only view (no Ventas access)

3. **Sidebar Terminology:**
   - ✅ Sidebar uses "Inventario", "Ventas", "Configuración" labels
   - ✅ No "Operations/Growth/System" terminology found

4. **Mobile Navigation:**
   - ✅ MobileNav component created with 4 bottom navigation icons
   - ✅ Touch targets are 44x44px (Fitts's Law compliant)

5. **Middleware Security:**
   - ✅ Middleware validates auth, role with smart redirects for /dashboard
   - ✅ Role-based route protection implemented for /admin, /dealer, /manager

### Success Criteria

- ✅ All 4 route group layouts render without errors
- ✅ Sidebar shows correct terminology (Inventario/Ventas/Configuración)
- ✅ Middleware blocks unauthorized access (seller cannot visit /admin routes)
- ✅ Mobile bottom nav component created with proper structure
- ✅ Header displays user role badge and breadcrumbs
- ✅ Zustand store persists sidebar collapse state
- ✅ No auth tokens stored in localStorage (SC-01 anti-pattern verified)

## Next Phase Readiness

**Ready for Plan 08-02 (DataGrid Component):**
- Layout shell provides structure for DataGrid integration
- Zustand store available for DataGrid state management
- Route groups ready for /catalog page with DataGrid
- Header search placeholder ready for Cmd+K CommandPalette (Plan 08-03)

**No blockers or concerns.**

**Dependencies established:**
- Sidebar navigation links to /catalog, /publications, /leads, /appointments
- Middleware protects all routes
- Mobile navigation provides quick access to critical features

---

*Phase: 08-layout-shell-vehicle-management*
*Plan: 01*
*Completed: 2026-03-27*
