# ProSell SaaS - Memory Index

## Estado (2026-03-28): Phase 8 Complete ✅ — BRAIN-FEED Created — Phase 09 Planned

### Current Branch: main
### Latest Commit: `a149682` - wip: phase-09 anti-patterns fix - plan created

### START HERE para próxima sesión:
- Memory: `session-2026-03-28-phase8-complete-validation-brainfeed-created-09-plan-created` (ACTUAL)
- Handoff: `.planning/phases/09-anti-patterns-fix/.continue-here.md`
- **Estado**: Phase 8 completa (476/476 tests), Phase 09 plan lista (6 tareas ~25min)
- **Next action**: `/clear → /gsd:execute-phase 9`

### Sprint 7 Status
| Phase | Descripción | Estado |
|-------|-------------|--------|
| Phase 1 | Task Queue + i18n | ✅ 100% |
| Phase 2 | Facebook OAuth | ✅ 100% |
| Phase 3 | GraphAPI Integration | ✅ 100% |
| Phase 4 | Scraping Framework | ⏳ 0% |
| Phase 5 | Dashboards | ⏳ 0% |
| Phase 6 | IA Assistant | ⏳ 0% |
| Phase 7 | E2E Testing | ⏳ 0% |

### Phase 1 Status (Hybrid Publisher)
- 01-00 to 01-07: ✅ COMPLETE (todos con SUMMARY.md)
- **UAT Round 2**: Tests 1-7 ✅ | Test 8-10 🚧 (blocked by 401 Unauthorized)

### Sprint 7 Status
| Phase | Descripción | Estado |
|-------|-------------|--------|
| Phase 1 | Task Queue + i18n | ✅ 100% - Mergeado a main |
| **Phase 2** | **Facebook OAuth** | **🟡 90% - Commit pendiente** |
| Phase 3 | GraphAPI Integration | ⏳ 0% - Pending |
| Phase 4 | Scraping Framework | ⏳ 0% - Pending |
| Phase 5 | Dashboards | ⏳ 0% - Pending |
| Phase 6 | IA Assistant | ⏳ 0% - Pending |
| Phase 7 | E2E Testing | ⏳ 0% - Pending |

## Session Handoffs (Most Recent First)

| Memory | Descripción |
|--------|-------------|
| `.planning/phases/01-hybrid-publisher/.continue-here.md` | **START HERE** - Publisher 401 blocked (2026-03-24) |
| `session-2026-03-24-oauth-cookie-path-fix-publisher-401-blocked` | OAuth cookie path fix + 401 investigation |
| `oauth-cookie-path-fix-2026-03-24` | OAuth cookies must use path=/ - lesson learned |
| `oauth-architecture-decision-2026-03-22` | OAuth callbacks `/api/auth/` (sin versión) vs API `/api/v1/auth/` |
| `database-migration-uuid-issue-2026-03-22` | Migraciones con orden incorrecto - UUID después de organizations |
| `handoff-sprint-7-phase2-gga-fixed-2026-03-13` | GGA passed, commit pending |
| `handoff-sprint7-phase2-gga-fixes-2026-03-13` | Previous session GGA issues (now resolved) |

## Test Status (2026-03-13)
- **444 passed, 1 skipped** ✅
- Unit tests: 21/21 Facebook OAuth ✅
- Integration tests: 21/21 ✅
- GGA: PASSED ✅

## Proximos Pasos
1. **COMMIT** (git add -u && git commit) — GGA already passed, tests green
2. After commit → Option A: E2E Tests (Playwright) or Option B: Facebook Spike

## Key Context
- Services: `docker start prosell-db prosell-redis`
- API: `cd apps/api && fastapi dev src/prosell/infrastructure/api/main.py --reload`
- Web: `cd apps/web && pnpm dev`
- Tests: `cd apps/api && uv run pytest tests/unit/ tests/integration/`
- Facebook App ID: 926649056406716 (configured)
- Ngrok in Docker Compose: https://roscoe-unfrothed-alluringly.ngrok-free.dev
