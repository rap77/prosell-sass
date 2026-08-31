# Build Instructions — fix-prosell-ci-seed-data

This is a zero-Unit bugfix confined to `apps/api/tests/` — no new dependencies, no build/bundle step beyond the existing project tooling. This file documents how to reproduce the environment and verification used during Code Generation and this stage.

## Dependency Installation

```bash
cd apps/api && uv sync --all-extras
```

No new dependencies were introduced by this intent.

## Environment Setup

Backend integration tests require a Postgres instance matching CI's `test-python` service exactly (see `apps/api/tests/integration/_constants.py::TEST_DB_URL`):

- User: `prosell`
- Password: `prosell_test_password`
- Database: `prosell_test`
- Port: `5433`

**Local reproduction** (this session used a temporary Docker container, matching CI's `postgres:17` service):

```bash
docker run -d --name prosell-test-pg --rm \
  -e POSTGRES_USER=prosell -e POSTGRES_PASSWORD=prosell_test_password -e POSTGRES_DB=prosell_test \
  -p 5433:5432 postgres:17
```

Then bootstrap the schema (via `Base.metadata.create_all()`, not Alembic — see `code-quality-assessment.md` finding #20 for why):

```bash
cd apps/api && uv run python scripts/create_test_schema.py
```

`tests/integration/conftest.py::pytest_collection_modifyitems` auto-skips every integration test when `localhost:5433` is unreachable — no manual skip markers needed.

## Build Commands

Backend (Python) has no compile/bundle step — `ruff`/`pyright` are the verification gates, run in Code Generation and re-verified here:

```bash
cd apps/api && uv run ruff check . && uv run ruff format --check .
cd apps/api && uv run pyright
```

## Build Verification

No frontend build applies (this intent touches zero files under `apps/web/`). Backend "build" verification is: lint clean, type-check clean, full test suite green (see `test-results.md`).

## Troubleshooting

- **`localhost:5433` unreachable**: integration tests silently skip (not fail) — check `docker ps` for the test Postgres container.
- **Schema drift**: if a model changes without re-running `create_test_schema.py`, tests fail with missing-column/table errors. Re-run the bootstrap script (it's idempotent — `DROP TYPE ... CASCADE` + `create_all`).
- **`Base.metadata.create_all()` vs. Alembic**: the test schema bootstrap intentionally bypasses the real (drifted) Alembic migration chain — this is documented, deliberate behavior (see `apps/api/scripts/create_test_schema.py` docstring), not a bug to fix in this intent.
