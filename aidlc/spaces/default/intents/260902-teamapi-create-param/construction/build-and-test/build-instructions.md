# Build Instructions — Fix teamApi.create mismatch parameter

## Dependency Installation

No new dependencies were added by this fix (no `package.json`/`pyproject.toml` changes). Existing dependencies already installed:

```bash
pnpm install --frozen-lockfile   # from repo root, if not already installed
cd apps/api && uv sync --all-extras   # if not already installed
```

## Environment Setup

No new environment variables or config files required. Frontend tests run against mocked `fetch`/store actions (no live backend needed). The two new backend integration tests (`test_team_api.py`) require the project's standard integration-test Postgres 17 container at `localhost:5433` (same as `tests/integration/**` project-wide — see `.github/workflows/ci.yml` `test-python` job service config: `POSTGRES_USER=prosell`, `POSTGRES_PASSWORD=prosell_test_password`, `POSTGRES_DB=prosell_test`).

## Build Commands

No build step is required to verify this fix — it is a frontend TypeScript rename plus backend test additions, verified via typecheck/lint/test, not a compiled artifact. For completeness, the project's standard build commands still apply and were not run as part of this stage (per team convention "Never build after changes" — typecheck + lint is the verification):

```bash
# Frontend (not run — typecheck substitutes)
cd apps/web && pnpm build

# Backend has no build step (interpreted Python)
```

## Build Verification Steps

Instead of a full build, this stage verifies via:

1. `tsc --noEmit` (frontend type check)
2. `ruff check` + `ruff format --check` + `pyright` (backend lint/type check)
3. Full test suites (see `test-results.md`)

## Troubleshooting

- **`.next/types` stale-reference errors after deleting the mock routes**: `.next/` is a gitignored build cache. If `tsc` reports `Cannot find module '.../app/api/v1/teams/.../route.js'`, delete `.next/types` and `.next/dev/types` (safe — regenerates on next `next dev`/`next build`). This is expected local staleness, not a real type error, and does not affect CI (which builds fresh).
- **`tests/integration/**` tests SKIPPED with "Integration test DB (localhost:5433) not available"**: expected in any environment without Docker (or without the temporary Postgres 17 container started per the project's established convention). Not a failure — see `apps/api/tests/integration/conftest.py`'s autouse skip fixture.
