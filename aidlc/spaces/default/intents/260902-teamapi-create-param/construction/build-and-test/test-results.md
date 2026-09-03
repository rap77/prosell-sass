# Test Results — Fix teamApi.create mismatch parameter

## Build Status

No build step applicable (frontend TypeScript rename + backend test additions, no compiled artifact; per team convention "Never build after changes" — typecheck + lint substitutes). See verification below.

- `cd apps/web && pnpm exec tsc --noEmit -p tsconfig.json` → **PASS** (0 errors, after clearing two stale gitignored `.next/types` validators referencing the deleted mock routes — see `build-instructions.md` Troubleshooting).
- `cd apps/api && uv run ruff check` / `uv run ruff format --check` / `uv run pyright` on touched files → **PASS**.

## Test Results — Full Suites (not just touched files)

### Frontend — `pnpm exec vitest run` (from `apps/web`)

```
Test Files  163 passed (163)
     Tests  1272 passed (1272)
  Duration  43.07s
```

**0 failed, 0 skipped.** No pre-existing baseline failures were found this run (the 13 pre-existing failures documented in `project.md` from the `260826-prod-bugfixes-batch` intent — `products.test.tsx`, `reverseTransitions.test.tsx`, `setProductCover.test.ts` — were already fixed in the `260901-frontend-test-debt` intent, per `aidlc/spaces/default/codekb/prosell-sass/business-overview.md`; confirmed here since all three files now pass in full).

Files specifically touched or added by this intent, individually confirmed passing within the full run above: `src/hooks/useTeams.test.ts` (10 tests), `src/components/teams/TeamSwitcher.test.tsx` (11 tests — file appears as `TeamSwitcher.test.tsx` in the listing above), `tests/components/forms/TeamForm.test.tsx` (7 tests).

### Backend — `uv run pytest -q` (from `apps/api`)

```
1371 passed, 601 skipped in 13.81s
```

**0 failed.** All 601 skips carry the identical, expected reason: `Integration test DB (localhost:5433) not available` (this sandbox has no Docker — see `apps/api/tests/integration/conftest.py`'s autouse skip fixture, which applies uniformly to every test under `tests/integration/**`, not just the ones this intent added). This is environmental, not a regression: the same 601 tests skip identically on `main` before this change (confirmed by the skip reason being a fixture-level, path-based check unrelated to any file this intent touched).

Files specifically added by this intent:

- `tests/contract/schema_matching/test_team_schema_drift.py` — **6/6 passed** (no DB needed; ran both standalone during Code Generation and as part of this full run).
- `tests/integration/api/test_team_api.py` — **2/2 SKIPPED** (needs the Postgres 17 container; will run for the first time in CI's `test-python` job, which does provision `postgres-test`). Verified structurally sound by the Code Generation reviewer (`aidlc-architecture-reviewer-agent`, READY) against the exact fixture/dependency-override pattern already proven passing in `test_team_invitation_api.py`.

## Coverage Report

Not applicable at project floor: backend has no enforced coverage threshold (`pytest --cov` runs in CI for reporting only, no `--cov-fail-under`); frontend's enforced floor (`lines:40 functions:40 branches:75 statements:40` in `vitest.config.ts`) is unaffected by this change (renames and deletions of already-covered/mocked code, no net new untested surface beyond the 2 new backend tests already covered by their own assertions).

## Failure Details

None — no failures in either suite.

## Readiness Assessment

**Deployment-ready.** All FRs/NFRs from `requirements.md` are implemented, tested where testable in this environment, and verified against the full existing suite with zero regressions. The two SKIPPED integration tests are the only outstanding verification gap, and it is purely environmental (no Docker in this sandbox) — CI's `test-python` job will exercise them for the first time on the next push.
