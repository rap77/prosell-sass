# Build Instructions — Catalog Image Load Optimization

## Dependency installation

Backend (`apps/api`):

```bash
cd apps/api
uv sync
```

Frontend (`apps/web`):

```bash
cd apps/web
pnpm install --frozen-lockfile
```

No new third-party dependencies were introduced by this intent — the CDN
invalidation adapter uses `httpx`, already a backend dependency; the batch
frontend hook uses TanStack Query and Zod, both already dependencies.

## Environment setup

Backend settings touched by this intent (`apps/api/src/prosell/core/config.py`):

- `do_cdn_endpoint` — already required by the pre-existing signed-download
  path; this intent does not add a new required variable.
- `do_spaces_cdn_purge_url` / `do_spaces_cdn_purge_token` — new, optional
  (empty defaults in dev). Only required in an environment that exercises
  real CDN purge (staging/production), not for the unit-test suite, which
  mocks `ICdnInvalidator`.

No new env vars are required to run the unit test suite locally — every
external dependency (`IDOSpacesService`, `ICdnInvalidator`, Taskiq broker,
product/organization repositories) is faked or mocked per
`unit-test-instructions.md` § "Mocks and test data".

## Build commands

Backend has no separate build/compile step (interpreted Python, `uv run`
executes directly against source).

Frontend:

```bash
cd apps/web
pnpm typecheck   # tsc --noEmit
```

Per this project's established convention, a production `next build` is not
run as part of Build and Test verification — `pnpm typecheck` + `pnpm lint`
(ESLint, `--max-warnings=0`) are the verification surface; CI runs the full
build separately.

## Build verification

- `pnpm typecheck` must report zero errors.
- `pnpm exec eslint --max-warnings=0` on touched files must report zero
  errors/warnings.
- Backend has no build artifact to verify; `uv run pyright` is the
  equivalent static-verification step (see `test-results.md` for the
  actual run).

## Troubleshooting

- **`pnpm test --run <path>` fails with `Unknown option: 'run'`.** `pnpm test`
  maps to the bare `vitest` script (see `apps/web/package.json`); `pnpm`
  itself swallows `--run` instead of forwarding it to the script. Use
  `pnpm exec vitest run <path>` instead, or `pnpm test -- --run <path>`
  (the `--` separator forwards correctly). `unit-test-instructions.md`
  documents the broken form — flagged by the Code Generation reviewer
  (finding R-03, accepted as risk at that gate) and corrected here for
  Build and Test's own execution.
- **Backend tests hang on a CDN-signer call.** If a pre-existing test's
  `_make_spaces()` fixture does not mock `generate_cdn_download_url`, an
  `AsyncMock` boundary is missing — see `code-summary.md` § "Files Modified
  → Backend tests (modified)" for the two files already fixed for this in
  this intent.
