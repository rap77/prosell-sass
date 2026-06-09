# Objective Dependency Graph — ProSell SaaS

## Edges

```
"Production Deploy" → None (root node)
"A11y Hardening" → None (root node, parallel to Production Deploy)
"Phase 3: Scraping" → "Phase 2: Catalog & Roles" (completed)
"Phase 3: Scraping" → "Phase 1: Hybrid Publisher" (completed)
"Phase 4: Leads & Appointments" → "Phase 1: Hybrid Publisher" (completed)
"Phase 5: Dashboards" → "Phase 4: Leads & Appointments"
"Phase 6: Market Intelligence" → "Phase 3: Scraping"
"Phase 7: Visibility" → "Phase 2: Catalog & Roles" (completed)
"Facebook OAuth + Graph API" → "Phase 1: Hybrid Publisher" (completed)
"Facebook OAuth + Graph API" → "Meta App Review" (external dependency)
"AI Assistant" → "Phase 6: Market Intelligence"
"AI Assistant" → "Claude API key" (external dependency)
```

## Graph Visualization

```
                    ┌─────────────────────────────────────────────────────────────────┐
                    │                                                                 │
                    ▼                                                                 │
          ┌─────────────────┐                                                         │
          │ Production Deploy│ ◄── CRITICAL PATH (no deps)                            │
          └────────┬────────┘                                                         │
                   │                                                                   │
                   ▼                                                                   │
          ┌─────────────────┐                                                         │
          │ A11y Hardening  │ ◄── Parallel track (WCAG AA fixes)                      │
          └────────┬────────┘                                                         │
                   │                                                                   │
         ┌────────┴────────┐                                                        │
         ▼                 ▼                                                        │
┌─────────────────┐ ┌─────────────────┐                                              │
│ Phase 3: Scraping│ │ Facebook OAuth  │                                              │
│ (needs Phase 1+2)│ │ + Graph API    │                                              │
└────────┬────────┘ └────────┬────────┘                                              │
         │                    │                                                       │
         │         ┌──────────┴──────────┐                                          │
         │         │                     │                                           │
         ▼         ▼                     ▼                                           │
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐                          │
│Phase 6: Market  │ │ Phase 7:        │ │  AI Assistant   │                          │
│Intelligence     │ │ Visibility      │ │  (needs Phase 6) │                          │
└────────┬────────┘ └────────┬────────┘ └─────────────────┘                          │
         │                    │                                                       │
         │                    │                                                       │
         └────────┬───────────┘                                                       │
                  ▼                                                                   │
         ┌─────────────────┐                                                           │
         │Phase 5: Dashboards│ ◄── needs Leads + Market Intelligence                  │
         └─────────────────┘                                                           │
                  │                                                                     │
                  ▼                                                                     │
         ┌─────────────────┐                                                           │
         │Phase 4: Leads & │                                                            │
         │Appointments     │                                                            │
         └────────┬────────┘                                                            │
                  │                                                                     │
                  ▼                                                                     │
         ┌─────────────────┐                                                           │
         │ Phase 1: Hybrid │ (COMPLETED 2026-03-15)                                    │
         │ Publisher       │                                                           │
         └────────┬────────┘                                                            │
                  │                                                                     │
                  ▼                                                                     │
         ┌─────────────────┐                                                           │
         │ Phase 2: Catalog│ (COMPLETED 2026-03-30)                                   │
         │ & Roles         │                                                           │
         └─────────────────┘                                                           │
```

## Completed Nodes (No pending edges)

- Phase 1: Hybrid Publisher ✅
- Phase 2: Catalog & Roles ✅
- Phase 8: Layout Shell + Vehicle Management ✅
- Phase 9: Anti-patterns Fix ✅
- Phase 10: Contract Testing Skill ✅
- Phase 11: DB Migration — C3 Schema ✅
- Phase 12: Backend API — Categories/Products/Vehicles ✅
- Phase 13: Frontend — Vehicle Form, DataGrid, CSV Upload ✅
- Milestone C: UX Completion ✅
- Auth System ✅
- Organizations & Teams ✅
- E2E Verification ✅

## External Dependencies (not in this graph)

| Dependency       | Type     | Status                                      |
| ---------------- | -------- | ------------------------------------------- |
| Meta App Review  | External | Pending — required for Graph API publishing |
| Claude API Key   | External | Not yet acquired — needed for AI Assistant  |
| Stripe Account   | External | Not yet configured — needed for v1 wallet   |
| SendGrid API Key | External | Partially configured in staging             |

## Recommended next active objective

**`A11y Hardening`** — No dependencies, clear scope, can start immediately.

**`Production Deploy`** — The MVP is 100% verified and ready. The single remaining critical action is to run `alembic upgrade head` on production and launch.
