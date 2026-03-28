# BRAIN-FEED.md — ProSell SaaS Project Memory for Brains

**Last updated:** 2026-03-28 (Phase 8 complete)

> This file accumulates implemented patterns, architectural decisions, and codebase reality across phases. It is what makes Brain queries progressively better — each phase teaches the brains something new.

---

## Tech Stack (Current)

| Layer | Technology | Version | Notes |
|-------|------------|---------|-------|
| Backend | Python | 3.13+ | Free-threading enabled |
| Backend | FastAPI | 0.115+ | Async first |
| Backend | SQLAlchemy | 2.0.36+ | Async with `Mapped[]`, `mapped_column` |
| Backend | Pydantic | 2.12+ | All DTOs and settings |
| Database | PostgreSQL | 17 | Primary database |
| Cache | Redis | 7.4+ | Task queue, caching |
| Scraping | Playwright | async | Primary publisher |
| Frontend | Next.js | 16.1+ | App Router, Turbopack |
| Frontend | React | 19.2 | Server Components default |
| Frontend | TypeScript | 5.5+ | Strict mode |
| Styling | TailwindCSS | 4.0 | New engine |
| State | Zustand | 5.x | Client state only |
| Data Fetching | TanStack Query | v5 | 1min staleTime |
| Testing | Vitest | Frontend | Testing Library |
| Testing | Pytest | Backend | pytest-asyncio |
| UI Components | Shadcn UI + Radix | - | Premium components |

---

## Implemented Features

| Feature | Location | Notes |
|---------|----------|-------|
| Auth System | `apps/api/src/prosell/infrastructure/auth/` | JWT + OAuth2 + TOTP, httpOnly cookies |
| Organizations | `apps/api/src/prosell/domain/organizations/` | Multi-tenant with tenant_id |
| Hybrid Publisher | `apps/api/src/prosell/application/publish/` | Playwright (primary) + Graph API (secondary) |
| Auto-republish | `apps/api/src/prosell/application/tasks/` | Scheduler for 7-day expiry |
| Task Queue | Taskiq + Redis | ListQueueBroker (not PubSub) |
| Layout Shell | `apps/web/src/app/(role)/layout.tsx` | 4 route groups, middleware guards |
| Sidebar | `apps/web/src/components/layout/Sidebar.tsx` | Collapsible, Zustand persist |
| DataGrid | `apps/web/src/components/datagrid/DataGrid.tsx` | TanStack Virtual, 60fps, 1000+ rows |
| Search Filters | `apps/web/src/components/filters/` | Hybrid client/server, Cmd+K |
| Image Upload | `apps/web/src/components/upload/` | Presigned URLs, parallel uploads |

---

## Architecture Patterns

### Clean Architecture (Domain → Application → Infrastructure)
- **Domain layer** has ZERO external dependencies — only Python pure
- **Application layer** orchestrates use cases, depends on Domain
- **Infrastructure layer** implements interfaces (FastAPI, SQLAlchemy, scrapers)
- **Dependency Rule**: Infrastructure → Application → Domain (never reverse)

### Multi-Tenancy
- All aggregates include `tenant_id` — no exceptions
- OAuth users currently have `tenant_id=None` — fix scoped to Phase 2
- Middleware validates tenant access at edge

### Server Components (Next.js 16 + React 19)
- All layouts are Server Components by default
- Minimize client JS — only 'use client' when necessary
- Route groups `(admin)`, `(seller)`, `(dealer)`, `(manager)` — organizational, not URL-based

### State Management (Zustand)
- **SC-01 Anti-Pattern**: Persist only preferences, NOT auth/transient data
- `layoutStore.ts`: Sidebar collapsed state (persisted)
- `uploadStore.ts`: Upload progress 0-100% (NOT persisted — transient)
- High-frequency updates (progress) → Zustand, not TanStack Query

### Test Infrastructure (Vitest)
- **Global mocks in `setup.tsx`** — runs before all test imports
- **Mock order matters**: `vi.mock()` before `import` (hoisting)
- **asChild pattern**: Radix UI uses `asChild` to merge trigger with child
- **Structural tests**: When behavior tests too complex, test props/types/imports
- **Pragmatism**: 100% stable tests > 100% fragile tests

---

## Phase 8 — Layout Shell + Vehicle Management

**Key discoveries:**

### TanStack Virtual for 60fps DataGrid
- Only ~40 rows in DOM (20 visible + 10 buffer top + 10 buffer bottom)
- Fixed row height: 60px, overscan: 10
- Development warning: If >100 rows in DOM, virtualization is broken
- `memo()` on DataGridRow prevents re-renders unless row data changes

### Hybrid Search Architecture
- **Client-side instant (0ms)**: `useDeferredValue` + `useMemo` for title/ID/make/model
- **Server-side deep**: Full-text search for complex queries
- URL state sync: `useSearchParams` + `useRouter` for shareable filtered links

### Command Palette (Cmd+K)
- cmdk library (lightweight ~5KB, used by Vercel/Raycast/Linear)
- Fuzzy search across vehicles
- Keyboard navigation (arrow keys, Enter to select)
- Actions section for quick actions (publish, create)

### FilterSidebar + FilterPills
- Collapsible faceted navigation (64px collapsed ↔ 256px expanded)
- Multi-select filters (Brand, Status) with comma-separated values
- Slider controls (Price $0-$100k, Year 2010-2026)
- FilterPills for visual feedback of active filters

### Image Upload System
- **Presigned URLs**: Browser → cloud (parallel) → backend (async processing)
- **Parallel uploads**: 3-4 concurrent (browser limit)
- **Blob URL previews**: `URL.createObjectURL` for 0ms delay
- **Progress tracking**: Zustand store (0-100% per file)
- **Background processing**: Thumbnails, WebP compression, EXIF stripping

### Layout Shell Patterns
- **Sidebar terminology**: Use Inventario/Ventas/Configuración (user language) NOT Operations/Growth/System
- **Middleware role guards**: Validate at edge before Server Components render (Zero Trust)
- **Mobile nav**: 4 critical icons following Thumb Zone pattern (44x44px touch targets)
- **Smart redirects**: `/dashboard` redirects to role-specific home page

### Anti-patterns Found
- **useCallback in React 19**: Compiler handles optimization — don't use useCallback
- **FormData uploads**: Use presigned URLs instead for better performance
- **Sequential uploads**: Use parallel chunk strategy (3-4 concurrent)
- **localStorage for previews**: Use memory-only blob URLs
- **console.error in production**: Use toast notifications
- **window.location.href**: Use Next.js `router.push()`

---

## Active Constraints

- **Multi-tenant**: All data must have `tenant_id` — hard constraint
- **Clean Architecture**: Domain layer cannot have external dependencies
- **Server Components**: Default to Server Components, only 'use client' when necessary
- **SC-01**: Zustand persist only preferences, NOT auth/transient data
- **Zustand for high-frequency state**: TanStack Query not suited for progress tracking
- **Zero Trust**: Middleware validates auth/role/tenant at edge
- **React 19 patterns**: No useCallback, no useMemo (Compiler handles it)

---

## Anti-Patterns (Don't Do This)

| Anti-Pattern | Why It Fails | What To Use Instead |
|--------------|--------------|---------------------|
| Persist auth tokens in Zustand | Security violation, SC-01 anti-pattern | httpOnly cookies |
| FormData uploads | Slow, blocks browser, no progress | Presigned URLs |
| Sequential uploads | Slow, poor UX | Parallel (3-4 concurrent) |
| localStorage for previews | Memory leak, slow | Blob URLs (memory-only) |
| useCallback in React 19 | Unnecessary, Compiler handles it | Remove, let Compiler optimize |
| console.error in production | Poor UX, not actionable | Toast notifications |
| window.location.href | Breaks Next.js routing | router.push() |
| next/image for blob URLs | Doesn't work with createObjectURL | Regular <img> with comment |
| Testing implementation details | Fragile, breaks on refactor | Structural tests (props/types) |
| Mocks after imports | Hoisting issues | Global mocks in setup.tsx |

---

## Key Files Reference

| File | Purpose | Pattern |
|------|---------|---------|
| `apps/web/tests/setup.tsx` | Global mocks for all tests | Radix UI mocks, browser APIs |
| `apps/web/vitest.config.ts` | Vitest configuration | setupFiles, globals: true |
| `apps/web/src/lib/stores/layoutStore.ts` | Sidebar state persistence | Zustand + persist middleware |
| `apps/web/src/lib/stores/uploadStore.ts` | Upload progress tracking | Zustand, NO persistence |
| `apps/web/src/middleware.ts` | Auth + role + tenant guards | Zero Trust at edge |
| `apps/web/src/components/datagrid/DataGrid.tsx` | High-performance table | TanStack Virtual, memo() |
| `apps/web/src/lib/hooks/useVehicleFilters.ts` | Filter state with URL sync | useSearchParams, useRouter |

---

## Next Phase Considerations

### Phase 2 (Catalog & Roles) — What to Know
- Role-based catalog filtering: Use middleware role, not client-side auth checks
- Real data fetching: Replace mock data in `/catalog` with TanStack Query
- tenant_id fix: OAuth users need organization assignment

### Technical Debt to Address
- tenant_id=None for OAuth users — before Phase 2
- Auth rate limiting — before Phase 5
- SendGrid wiring — before Phase 4
- Header placeholder data — auth context integration

---

*This file is updated after each phase completion. Read before querying brains.*
