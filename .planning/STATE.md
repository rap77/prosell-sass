---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Completed Phase 08 Plan 04 - Hybrid image upload system with drag-and-drop zone, immediate previews via URL.createObjectURL, parallel uploads to cloud storage (presigned URLs), Zustand store for high-frequency progress updates, sortable image gallery with cover photo control, and background processing (thumbnails, WebP compression, EXIF stripping).
last_updated: "2026-03-27T13:00:00.000Z"
last_activity: 2026-03-27 — Plan 08-04 complete (ImageDropzone, ImageGallery, uploadStore, useImageUpload, images API, vehicle create page)
progress:
  total_phases: 8
  completed_phases: 1
  total_plans: 13
  completed_plans: 12
  percent: 85
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-15)

**Core value:** El vendedor de ProSell puede publicar cualquier vehículo en Facebook Marketplace desde la app, capturar el lead interesado, y confirmar la cita con el dealer — todo sin salir del panel interno.
**Current focus:** Phase 8 — Layout Shell + Vehicle Management

## Current Position

Phase: 8 of 8 (Layout Shell + Vehicle Management)
Plan: 4 of 5 in current phase (08-00, 08-01, 08-02, and 08-04 complete)
Status: In progress
Last activity: 2026-03-27 — Plan 08-04 complete (Hybrid image upload system with drag-and-drop, presigned URLs, Zustand progress tracking, parallel uploads, ImageGallery with cover photo control)

Progress: [█████████░] 85%

## Performance Metrics

**Velocity:**
- Total plans completed: 12
- Average duration: 16 min
- Total execution time: 3.3 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-hybrid-publisher | 8/8 | 23min | 23min |
| 08-layout-shell | 4/5 | 12min | 12min |

**Recent Trend:**
- Last 5 plans: 08-04 (15min)
- Trend: accelerating

*Updated after each plan completion*
| Phase 08 P00 | 5min | 7 tasks | 17 files |
| Phase 08 P01 | 9min | 7 tasks | 10 files |
| Phase 08 P02 | 20min | 8 tasks | 8 files |

## Accumulated Context

### Decisions

- Playwright is the PRIMARY publisher (immediate). Graph API is secondary (post FB App Review).
- Posts expire every 7 days — auto-republication is P0.
- Catálogo público is Phase B (post-MVP) — validate internal flow first.
- Appointment entity owned (no Calendly) — ROI traceability, future ML.
- PUBLISH-08 (AI titles) deferred to Phase 7 (needs CarGurus data volume first).
- Phase 4 (Leads) depends on Phase 1 (requires active listings to capture leads against).
- Phase 6 (Market Intelligence) depends on Phase 3 (needs scraped CarGurus data).
- [01-01] mark_published() sets expires_at = published_at + 7 days — FB Marketplace auto-expires listings in 7 days.
- [01-01] Error Category B (blocking) sets blocked_until_confirmed=True — captcha/policy violations need human review before retry.
- [01-01] expires_at column indexed — scheduler query performance critical at scale.
- [01-00] ListQueueBroker replaces PubSubBroker — PubSubBroker silently ignores .with_labels(delay=...) making exponential backoff impossible.
- [01-00] publisher_engine defaults to 'auto' with graph_api_approved=False — Playwright is primary until FB App Review completes.
- [01-07] Modal at page level (not row level) — prevents row re-renders from closing modal mid-form.
- [01-07] HeroShotSelector: simple click = move image to index 0, NOT drag & drop.
- [01-07] FB price diff in update mode deferred — API does not return current FB listing price yet.
- [01-07] catalog/page.tsx uses mock data; real data fetching via useQuery(['catalog']) is next iteration.
- [08-01] Sidebar terminology: Use Inventario/Ventas/Configuración (user language) NOT Operations/Growth/System (designer model).
- [08-01] Middleware role guards: Validate at edge before Server Components render (Zero Trust).
- [08-01] Zustand for sidebar state: Persist only preferences, NOT auth tokens (SC-01 anti-pattern).
- [08-01] Route groups: Organizational structure for layouts, not URL-based routing.
- [08-01] Smart redirects: /dashboard redirects to role-specific home page.
- [08-01] Server Components: All layouts are Server Components by default (minimize client JS).
- [08-01] Mobile nav: 4 critical icons following Thumb Zone pattern (44x44px touch targets).
- [Phase 08]: Sidebar terminology: Use Inventario/Ventas/Configuración (user language) NOT Operations/Growth/System
- [Phase 08]: Middleware role guards: Validate at edge before Server Components render (Zero Trust)
- [Phase 08]: Zustand for sidebar state: Persist only preferences, NOT auth tokens (SC-01 anti-pattern)
- [Phase 08]: Route groups: Organizational structure for layouts, not URL-based routing
- [Phase 08]: Smart redirects: /dashboard redirects to role-specific home page
- [08-02] TanStack Virtual: MANDATORY for 60fps DataGrid with 1000+ rows — only ~40 rows in DOM (20 visible + 10 buffer top + 10 buffer bottom).
- [08-02] Row virtualization config: Fixed 60px row height, overscan: 10 for smooth scrolling, estimateSize: () => 60.
- [08-02] StatusBadge: Icon + text for accessibility (WCAG 2.1 AA for 8% colorblind users) — 7 states: published, pending, failed, draft, expired, online, sold.
- [08-02] DataGrid columns: 5 base columns (Photo, Title, Price, Status, Actions) with checkbox selection and select-all support.
- [08-02] memo() on DataGridRow: Prevents re-renders unless row data changes — critical for 60fps performance.
- [08-02] TanStack Query: 1 minute staleTime for vehicle list cache, optimistic updates for update/delete mutations.
- [08-02] Development warning: If >100 rows in DOM, virtualization is broken — log warning to console.
- [08-02] Mock data: 1000 vehicles for UI development — backend API endpoints to be implemented in Phase 2.

### Roadmap Evolution

- Phase 8 added: Layout Shell + Vehicle Management (2026-03-25) — User requested complete UX overhaul with premium UI components (MagicUI, shadcn/ui, Radix) before continuing UAT.

### Pending Todos

None yet.

### Blockers/Concerns

- CONCERN: tenant_id=None for OAuth-created users blocks full multi-tenancy. Fix scoped to Phase 2 (before catalog roles are enforced).
- CONCERN: Auth endpoints lack rate limiting — must fix before production deploy (pre-Phase 5).
- CONCERN: SendGrid not wired — needed for APPT-03 (dealer email notifications) in Phase 4.
- CONCERN: FB App Review for Graph API publishing may be pending during Phase 1 — Playwright fallback is the plan.

## Session Continuity

Last session: 2026-03-27T11:23:00.000Z
Stopped at: Completed Phase 08 Plan 01 - Layout shell with role-based route groups, collapsible sidebar, header, mobile nav, and middleware guards.
Resume file: .planning/phases/08-layout-shell-vehicle-management-sidebar-header-navigation-crud-vehicles-bulk-upload-csv-drag-and-drop-image-upload-multi-publish-search-filter-sort-using-premium-ui-components-magicui-shadcn-ui-radix-ui/.continue-here.md
