# Build Instructions — Export Cross-Org Permission

Intent: `260910-export-cross-org` (scope: bugfix, zero-Unit — backend only, no build step beyond dependency install and type/lint checks)

## Dependency Installation

No new dependencies were added. Existing environment:

```bash
cd apps/api && uv venv && source .venv/bin/activate && uv pip install -e ".[dev]"
```

## Environment Setup

- **Test database**: a CI-matching Postgres 17 instance is required (per `project.md` learning 260830-ci-seed-data):

```bash
docker run -d --name prosell-test-pg -e POSTGRES_USER=prosell -e POSTGRES_PASSWORD=prosell_test_password -e POSTGRES_DB=prosell_test -p 5433:5432 postgres:17
# wait for health:
docker exec prosell-test-pg pg_isready -U prosell
cd apps/api && uv run python scripts/create_test_schema.py
```

- No new environment variables or config files needed — the change is purely application logic in an existing router.

## Build Commands

This is a Python/FastAPI backend with no compile/bundle step. "Build verification" is lint + type-check:

```bash
cd apps/api
uv run ruff check src/prosell/infrastructure/api/routers/product_router.py tests/integration/api/routers/test_product_router_export_client_format.py
uv run pyright src/prosell/infrastructure/api/routers/product_router.py tests/integration/api/routers/test_product_router_export_client_format.py
```

## Build Verification Steps

1. Ruff reports "All checks passed!" with 0 findings.
2. Pyright reports 0 errors, 0 warnings.
3. The FastAPI app imports cleanly (verified implicitly by the test suite's `ASGITransport(app=app)` startup in Step 10).

## Troubleshooting Common Build Issues

- **`docker: connection refused` / no Postgres**: start the temporary container above before running any test command; the app has no fallback to SQLite for integration tests.
- **Stale schema**: if `create_test_schema.py` was run against an older code state, re-run it — it's idempotent (`Base.metadata.create_all()`).
- **`ModuleNotFoundError`**: confirm the `uv venv`/`uv pip install -e ".[dev]"` step ran inside `apps/api` (not the repo root).
