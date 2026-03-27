---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Completed Phase 08 Plan 00 - Wave 0 test stubs created
last_updated: "2026-03-27T11:18:54.711Z"
last_activity: 2026-03-15 — Plan 01-07 complete (PublishModal, PublishForm, catalog/page, HeroShotSelector, PublicationStatus, publisherApi, publisherStore)
progress:
  total_phases: 7
  completed_phases: 1
  total_plans: 8
  completed_plans: 8
  percent: 88
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-15)

**Core value:** El vendedor de ProSell puede publicar cualquier vehículo en Facebook Marketplace desde la app, capturar el lead interesado, y confirmar la cita con el dealer — todo sin salir del panel interno.
**Current focus:** Phase 1 — Hybrid Publisher

## Current Position

Phase: 1 of 7 (Hybrid Publisher)
Plan: 8 of 8 in current phase (01-00 through 01-07 complete — final plan 01-08 pending or phase complete)
Status: In progress
Last activity: 2026-03-15 — Plan 01-07 complete (PublishModal, PublishForm, catalog/page, HeroShotSelector, PublicationStatus, publisherApi, publisherStore)

Progress: [█████████░] 88%

## Performance Metrics

**Velocity:**
- Total plans completed: 1
- Average duration: 23 min
- Total execution time: 0.4 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-hybrid-publisher | 1/8 | 23min | 23min |

**Recent Trend:**
- Last 5 plans: 01-01 (23min)
- Trend: baseline

*Updated after each plan completion*
| Phase 08 P00 | 5min | 7 tasks | 17 files |

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

Last session: 2026-03-27T11:18:54.709Z
Stopped at: Completed Phase 08 Plan 00 - Wave 0 test stubs created
Resume file: None
