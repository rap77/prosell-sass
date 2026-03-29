---
phase: 02
slug: catalog-roles
status: partial
nyquist_compliant: false
wave_0_complete: true
validated: 2026-03-29
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 8.x (backend) + vitest 2.x (frontend) |
| **Config file** | apps/web/vitest.config.ts, apps/api/pyproject.toml |
| **Quick run command** | `cd apps/api && uv run pytest -xvs -k "test_dealer_or_test_user_dealer"` |
| **Full suite command** | `pnpm test` (from root) |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/api && uv run pytest -xvs -k "test_dealer_or_test_user_dealer"`
- **After every plan wave:** Run `pnpm test` (full suite)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | CATALOG-01 | unit | `pytest tests/unit/domain/test_dealer_entity.py -v` | ✅ | ✅ green (12 tests) |
| 02-01-02 | 01 | 1 | CATALOG-01 | unit | `pytest tests/unit/domain/test_dealer_entity.py::test_dealer_slug_generation_from_name -v` | ✅ | ✅ green |
| 02-02-01 | 02 | 1 | CATALOG-02 | unit | `pytest tests/unit/domain/test_user_dealer_entity.py -v` | ✅ | ✅ green (1 test) |
| 02-02-02 | 02 | 1 | CATALOG-02 | integration | `pytest tests/integration/repositories/test_dealer_repository.py -v` | ✅ | ✅ green (3 tests) |
| 02-03-01 | 03 | 2 | CATALOG-03 | unit | N/A (use case covered by repo tests) | — | ✅ covered |
| 02-03-02 | 03 | 2 | CATALOG-03 | integration | BLOCKED by dealer_router.py bug | ⚠️ | 🔴 blocked (see Manual-Only) |
| 02-04-01 | 04 | 2 | CATALOG-04 | unit | `vitest tests/unit/hooks/useDealerFilters.test.ts` | ⚠️ | 🟡 manual-only (no impl) |
| 02-04-02 | 04 | 2 | CATALOG-04 | component | `vitest tests/components/DealerForm.test.tsx` | ⚠️ | 🟡 manual-only (no impl) |
| 02-05-01 | 05 | 2 | CATALOG-05 | unit | `pytest tests/unit/application/test_assign_user_dealer_usecase.py -v` | ✅ | ✅ green (1 test) |
| 02-05-02 | 05 | 2 | CATALOG-05 | integration | BLOCKED by dealer_router.py bug | ⚠️ | 🔴 blocked (see Manual-Only) |
| 02-06-01 | 06 | 3 | CATALOG-06 | integration | BLOCKED by dealer_router.py bug | ⚠️ | 🔴 blocked (see Manual-Only) |
| 02-06-02 | 06 | 3 | CATALOG-06 | integration | BLOCKED by dealer_router.py bug | ⚠️ | 🔴 blocked (see Manual-Only) |
| 02-07-01 | 07 | 3 | CATALOG-07 | integration | `pytest tests/integration/api/test_dynamic_filters.py -v` | ✅ | ✅ green (4 tests) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/tests/unit/domain/test_dealer.py` — Dealer entity stubs
- [ ] `apps/api/tests/unit/domain/test_user_dealer.py` — UserDealer value object stubs
- [ ] `apps/api/tests/integration/repositories/test_dealer_repository.py` — Dealer repository stubs
- [ ] `apps/api/tests/integration/repositories/test_user_dealer_repository.py` — UserDealer repository stubs
- [ ] `apps/web/tests/unit/hooks/useDealerFilters.test.ts` — Dealer filters hook stubs
- [ ] `apps/web/tests/components/DealerForm.test.tsx` — Dealer form component stubs
- [ ] `apps/web/tests/components/UserDealerAssignment.test.tsx` — User dealer assignment stubs
- [ ] `apps/api/tests/integration/api/test_vehicle_filtering.py` — Vehicle filtering by role stubs
- [ ] `apps/api/tests/integration/api/test_vehicle_pagination.py` — Cursor pagination stubs
- [ ] `apps/api/tests/integration/api/test_dynamic_filters.py` — Dynamic filters stubs
- [ ] `apps/api/tests/conftest.py` — Shared fixtures (already exists)
- [ ] `apps/web/tests/setup.tsx` — Test setup (already exists)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| **Dealer CRUD endpoints** | CATALOG-03 | BLOCKED by dealer_router.py typo | **FIX REQUIRED:** Change line 106 from `except DealerNotFound` to `except DealerNotFoundError`. After fix: 1. `pytest tests/integration/api/test_dealer_endpoints.py -v` |
| **UserDealer API role checks** | CATALOG-05 | BLOCKED by dealer_router.py typo | Same fix as above. After fix: 1. Test admin/manager-only endpoints return 403 for sellers |
| **Vehicle filtering integration** | CATALOG-06 | BLOCKED by dealer_router.py typo | Same fix as above. After fix: 1. Test admin sees all, dealer sees own, seller sees assigned |
| **Cursor pagination** | CATALOG-06 | Requires DB fixtures | 1. Create 100+ vehicles. 2. Paginate with cursor. 3. Verify no duplicates, consistent ordering |
| **Frontend dealer filters** | CATALOG-04 | No frontend impl yet | Skip until Phase 4 frontend implementation |
| **Frontend DealerForm** | CATALOG-04 | No frontend impl yet | Skip until Phase 4 frontend implementation |
| **Frontend UserDealerAssignment** | CATALOG-05 | No frontend impl yet | Skip until Phase 4 frontend implementation |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** partial (1 bug blocking 5 tasks)

---

## Validation Audit 2026-03-29

| Metric | Count |
|--------|-------|
| Total tasks | 13 |
| Covered (green) | 7 |
| Blocked (implementation bug) | 5 |
| Manual-only (no frontend) | 3 |

### Critical Blocker

**File:** `apps/api/src/prosell/infrastructure/api/routers/dealer_router.py`
**Line:** 106
**Bug:** Uses `DealerNotFound` instead of `DealerNotFoundError`
**Impact:** Prevents FastAPI app from loading, blocking ALL integration tests
**Fix:** 1-character typo change

### Tests Created This Session

| File | Type | Status |
|------|------|--------|
| `tests/unit/application/test_assign_user_dealer_usecase.py` | unit | ✅ green |

### Tasks Blocked

- 02-03-02: Dealer CRUD integration tests (3 tests implemented, can't run)
- 02-05-02: UserDealer API role checks (5 tests implemented, can't run)
- 02-06-01: Vehicle filtering integration (needs implementation)
- 02-06-02: Cursor pagination (needs DB fixtures)

### Next Steps

1. Fix `dealer_router.py` typo (line 106)
2. Re-run validation: `/gsd:validate-phase 02`
3. Implement remaining integration tests
4. Achieve Nyquist compliance
