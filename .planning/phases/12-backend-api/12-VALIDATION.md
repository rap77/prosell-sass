---
phase: 12
slug: backend-api
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-10
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 8.x + pytest-asyncio |
| **Config file** | `apps/api/pyproject.toml` |
| **Quick run command** | `cd apps/api && uv run pytest tests/ -x -q --tb=short` |
| **Full suite command** | `cd apps/api && uv run pytest --cov=prosell --cov-report=term-missing` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/api && uv run pytest tests/ -x -q --tb=short`
- **After every plan wave:** Run `cd apps/api && uv run pytest --cov=prosell --cov-report=term-missing`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | CTGY-01 | unit | `cd apps/api && uv run pytest tests/unit/test_category_validation.py -x -q` | ❌ W0 | ⬜ pending |
| 12-01-02 | 01 | 1 | CTGY-02 | integration | `cd apps/api && uv run pytest tests/integration/api/test_category_api.py::test_create_category_with_attribute_schema -x -q` | ❌ W0 | ⬜ pending |
| 12-01-03 | 01 | 1 | CTGY-03 | integration | `cd apps/api && uv run pytest tests/integration/api/test_category_api.py::test_admin_sees_inactive_categories -x -q` | ❌ W0 | ⬜ pending |
| 12-01-04 | 01 | 1 | CTGY-04 | integration | `cd apps/api && uv run pytest tests/integration/api/test_category_api.py::test_update_attribute_schema -x -q` | ❌ W0 | ⬜ pending |
| 12-02-01 | 02 | 1 | PROD-01 | integration | `cd apps/api && uv run pytest tests/integration/api/test_product_c3.py::test_create_product_validates_attributes -x -q` | ❌ W0 | ⬜ pending |
| 12-02-02 | 02 | 1 | PROD-02 | integration | `cd apps/api && uv run pytest tests/integration/api/test_product_c3.py::test_list_products_by_organization -x -q` | ❌ W0 | ⬜ pending |
| 12-03-01 | 03 | 2 | VEH-01 | integration | `cd apps/api && uv run pytest tests/integration/api/test_vehicle_api.py::test_create_vehicle_typed_response -x -q` | ❌ W0 | ⬜ pending |
| 12-03-02 | 03 | 2 | PROD-05 | integration | `cd apps/api && uv run pytest tests/integration/api/test_vehicle_api.py::test_delete_product_cascades_to_vehicle -x -q` | ❌ W0 | ⬜ pending |
| 12-04-01 | 04 | 2 | API-01..04 | integration | `cd apps/api && uv run pytest tests/integration/api/test_category_api.py tests/integration/api/test_product_c3.py -q` | ❌ W0 | ⬜ pending |
| 12-05-01 | 05 | 3 | API-05 | coverage | `cd apps/api && uv run pytest --cov=prosell --cov-fail-under=80` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/tests/integration/api/test_category_api.py` — stubs for CTGY-01, CTGY-02, CTGY-03, CTGY-04
- [ ] `apps/api/tests/integration/api/test_product_c3.py` — stubs for PROD-01 through PROD-04
- [ ] `apps/api/tests/integration/api/test_vehicle_api.py` — stubs for VEH-01 through VEH-04, PROD-05
- [ ] `apps/api/tests/unit/test_category_validation.py` — stubs for Category.validate_attributes() unit tests
- [ ] `apps/api/tests/conftest.py` — verify admin_user and seller_user fixtures exist

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| ON DELETE CASCADE in live DB | VEH-04 | Requires live DB connection | Run: `SELECT constraint_name FROM information_schema.table_constraints WHERE table_name='vehicles' AND constraint_type='FOREIGN KEY'` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
