# Build and Test Summary — fix-prosell-ci-seed-data

## Overall Status: ✅ Build-ready, Test-ready, Deployment-ready (per this intent's scope)

## Prerequisites

- `apps/api`: `uv sync --all-extras` (no new dependencies)
- A Postgres 17 instance matching CI's `test-python` service on `localhost:5433` (see `build-instructions.md`)
- Schema bootstrapped via `apps/api/scripts/create_test_schema.py`

## Test Type Inventory

| Type                               | Generated?                                | Rationale                                                                                                                                    |
| ---------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit/Integration tests             | Already covered per-FR by Code Generation | Test Strategy Minimal — requirement-driven regressions, all backend integration-level (matching the existing suite's own level in this area) |
| `integration-test-instructions.md` | **Not generated**                         | Minimal strategy; no cross-unit boundary or new external dependency introduced                                                               |
| `performance-test-instructions.md` | **Not generated**                         | No NFR performance requirement in `requirements.md`                                                                                          |
| `security-test-instructions.md`    | **Not generated**                         | No NFR security requirement in `requirements.md`                                                                                             |

## Coverage Expectations

No new coverage floor. Backend coverage remains ungated (`--cov-fail-under` not set) — asymmetry already accepted by the team (`team.md` Q3). Coverage report generated per NFR1.2/NFR1.3 (`--cov-report=xml`) but not gated.

## Readiness Assessment

- **Build-ready**: ✅ `ruff check`, `ruff format --check`, `pyright` all clean across the full `apps/api` codebase.
- **Test-ready**: ✅ 13 target tests fixed (FR1, FR2 new, FR3, FR4), zero regressions confirmed via `git stash`/`pop` baseline comparison against the full 1964-test backend suite.
- **Deployment-ready**: ✅ per this intent's scope — Deployment Pipeline (3.7 CI Pipeline, 4.x Operation stages) are explicitly SKIP for this bugfix's execution plan (`Stages to Execute: 0.1, 0.2, 0.3, 2.1, 2.3, 3.5, 3.6`). Once this change merges to `main` via the existing pipeline (per `deploy.yml`, triggered by `workflow_run` post-CI), the real GitHub Actions `test-python` job — which uses the exact same `postgres-test` service config this stage reproduced locally — should go from `21 failed, 1931 passed, 12 errors` to `8 failed, 1945 passed, 12 errors`, resolving this intent's original motivation (CI red blocking observability/deployment work).

## Known Limitations / Outstanding Items (explicitly out of scope, documented for future intents)

1. **8 pre-existing test failures** (`test_admin_organizations_router.py`, `test_batch_review_api.py` x3, `test_org_verticals.py`, `bulk_upload` x3) + **12 pre-existing errors** (`test_fb_credential_migration_router.py`) remain — confirmed identical in the baseline and fixed-tree runs, unrelated to seed data/schema. Not addressed by this intent.
2. **Hallazgo #20** (real Alembic migration chain drift — `create_test_schema.py` bootstraps via `Base.metadata.create_all()` instead) — explicitly excluded from this intent's scope (C2), remains documented in `code-quality-assessment.md`.
3. **Hallazgo #21 audit scope** — the `shared_session`/SAVEPOINT fix pattern was applied only to the 2 files already known to use it (`test_fb_sync_router.py`, `bulk_upload/conftest.py`); the rest of `apps/api/tests/` was not audited for the same pattern (Q3, FR3.3).
4. **Hallazgo #23** (`bulk_upload` "Unknown organization codes: DJ, RM") — confirmed still present, unrelated to seed data, candidate for a separate intent.

## Test Results

See `test-results.md` for the full build + test execution log, per-test breakdown, and the baseline comparison.
