---
phase: 02
slug: catalog-roles
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
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
| 02-01-01 | 01 | 1 | CATALOG-01 | unit | `pytest tests/unit/domain/test_dealer.py` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | CATALOG-01 | unit | `pytest tests/unit/domain/test_dealer.py::test_slug_validation` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | CATALOG-02 | unit | `pytest tests/unit/domain/test_user_dealer.py` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 1 | CATALOG-02 | integration | `pytest tests/intrastructure/repositories/test_user_dealer_repository.py` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 2 | CATALOG-03 | unit | `pytest tests/unit/application/test_create_dealer_usecase.py` | ❌ W0 | ⬜ pending |
| 02-03-02 | 03 | 2 | CATALOG-03 | integration | `pytest tests/integration/api/test_dealer_endpoints.py` | ❌ W0 | ⬜ pending |
| 02-04-01 | 04 | 2 | CATALOG-04 | unit | `vitest tests/unit/hooks/useDealerFilters.test.ts` | ❌ W0 | ⬜ pending |
| 02-04-02 | 04 | 2 | CATALOG-04 | component | `vitest tests/components/DealerForm.test.tsx` | ❌ W0 | ⬜ pending |
| 02-05-01 | 05 | 2 | CATALOG-05 | unit | `pytest tests/unit/application/test_assign_user_dealer_usecase.py` | ❌ W0 | ⬜ pending |
| 02-05-02 | 05 | 2 | CATALOG-05 | component | `vitest tests/components/UserDealerAssignment.test.tsx` | ❌ W0 | ⬜ pending |
| 02-06-01 | 06 | 3 | CATALOG-06 | integration | `pytest tests/integration/api/test_vehicle_filtering.py` | ❌ W0 | ⬜ pending |
| 02-06-02 | 06 | 3 | CATALOG-06 | integration | `pytest tests/integration/api/test_vehicle_pagination.py` | ❌ W0 | ⬜ pending |
| 02-07-01 | 07 | 3 | CATALOG-07 | integration | `pytest tests/integration/api/test_dynamic_filters.py` | ❌ W0 | ⬜ pending |

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
| Admin override behavior | CATALOG-06 | Requires role switching | 1. Login as admin, verify all vehicles visible. 2. Login as dealer, verify only own vehicles visible. |
| UI dropdown assignment UX | CATALOG-05 | Visual interaction | 1. Open Dealer settings. 2. Verify multi-select dropdown works. 3. Assign multiple sellers. |
| Slug auto-generation uniqueness | CATALOG-01 | Requires DB constraint | 1. Create "Test Dealer". 2. Create another "Test Dealer" → should get "test-dealer-2". |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
