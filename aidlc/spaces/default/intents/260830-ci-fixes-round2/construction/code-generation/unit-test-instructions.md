# Unit Test Instructions — 260830-ci-fixes-round2

Test Strategy: Minimal. All 5 requirements are already covered by EXISTING integration tests that reproduce each defect — this is a bugfix intent, so no new test files are created. Each FR's regression is the existing failing test, made to pass by the corresponding fix (or, for FR5, by correcting the test itself).

## Test framework setup

Already configured: pytest + pytest-asyncio (`asyncio_mode=auto`), httpx `ASGITransport`. No new configuration needed.

## Exact runnable commands (unit-scoped, per FR)

Prerequisite for all commands below: a Postgres 17 container matching CI's `postgres-test` exactly must be running (`postgres:17`, user `prosell`, password `prosell_test_password`, db `prosell_test`, port 5433), with schema bootstrapped via `uv run python apps/api/scripts/create_test_schema.py`. Never run these against `prosell_staging`.

- **FR1**: `cd apps/api && uv run pytest tests/integration/api/test_batch_review_api.py -v`
- **FR2 (2.1+2.2+2.3 combined)**: `cd apps/api && uv run pytest tests/integration/bulk_upload/ -v`
- **FR3**: `cd apps/api && uv run pytest tests/integration/api/test_fb_credential_migration_router.py -v`
- **FR4**: `cd apps/api && uv run pytest tests/integration/api/test_admin_organizations_router.py::test_admin_patch_persists_contact_name -v`
- **FR5**: `cd apps/api && uv run pytest tests/integration/api/test_org_verticals.py -v`
- **NFR1/NFR2 (full regression)**: `cd apps/api && uv run pytest -q`

## Coverage targets

No new coverage floor beyond the team's existing backend posture (no `--cov-fail-under` enforced). Each FR's existing test(s) must go from failing/erroring to passing; the rest of the 1945-test baseline must remain green (NFR2).

## Mocking/stubbing guidance

None needed — all fixes are either fixture data corrections (FR1, FR2.3, FR5) or small, local application-code changes (FR2.1, FR2.2, FR3.1, FR4) exercised by existing integration tests against a real Postgres test database. No new mocks/stubs.

## Test data management

No new fixtures are created. FR2.3 modifies the existing `test_organization` fixture (`tests/integration/conftest.py`); FR1 adds `test_category` as a parameter to 4 existing test functions; FR3.1 modifies the existing `test_db_session` fixture (`tests/conftest.py`); FR5 swaps which existing role fixture one test uses. Verify the exact `cod_organization` value expected by the bulk-upload sample CSVs (Step 3 of the plan) before writing FR2.3's fixture value — do not invent it.
