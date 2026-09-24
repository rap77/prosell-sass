# Build and Test Summary — Catalog Image Load Optimization

## Overall build status and prerequisites

Build-ready. No new third-party dependencies. No build/compile step for the
backend (interpreted Python); the frontend's `next build` is intentionally
not run per this project's convention (typecheck + lint substitute — see
`build-instructions.md`).

## Test type inventory

Test Strategy is **Minimal** (bugfix scope). Per the stage definition,
Minimal generates no additional test instruction files beyond what
Code Generation already produced per-unit/stage-level — `unit-test-instructions.md`
already covers this intent's testable surface (backend + frontend unit
tests, no integration/performance/security instruction files generated).
This matches the project's own recorded convention: no
`integration-test-instructions.md` / `performance-test-instructions.md` /
`security-test-instructions.md` under Minimal strategy when the touched
NFRs already have dedicated unit-level coverage from Code Generation.

No `nfr-requirements/` or `nfr-design/` artifacts exist for this zero-Unit
bugfix run (those stages are out of scope) — the target inventory below is
sourced from `code-generation-plan.md`'s Testing Contract and the scope's
testing-posture floor, per Step 1's literal sourcing.

## Coverage expectations

- Backend: 11 scoped test files (6 new/modified for this intent's surface,
  5 pre-existing baseline files verified unbroken), 80 tests.
- Frontend: 1 scoped test file, 5 tests.
- Existing suite (scope-floor obligation "keep the existing suite green"):
  full backend unit directory (1410 tests) and full frontend vitest suite
  (1356 tests across 169 files) both re-run in this stage, not merely
  trusted from Code Generation's report.

## Target Verification Matrix

| Target ID       | Source                                                                                                                                          | Expected                                                                            | Actual                                                                                                                                                     | Evidence                                                                        | Owning Stage   | Verdict    |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------- | ---------- |
| TC-1            | Testing Contract `scope_floor[0]` (targeted regression for the bug)                                                                             | A test reproduces the N+1 fan-out fix at its narrowest boundary                     | `test_fires_a_single_POST_for_all_visible_product_IDs` asserts exactly one fetch for 2 visible product IDs                                                 | `apps/web/src/lib/api/productImageUrlsBatch.test.ts` (this run)                 | build-and-test | Met        |
| TC-2            | Testing Contract `scope_floor[1]` (keep existing suite green) — backend                                                                         | Full backend unit suite passes unmodified                                           | 1410 passed, 0 failed                                                                                                                                      | this run (`uv run pytest tests/unit/ -q`)                                       | build-and-test | Met        |
| TC-3            | Testing Contract `scope_floor[1]` (keep existing suite green) — frontend                                                                        | Full frontend vitest suite passes unmodified                                        | 1356 passed / 169 files, 0 failed                                                                                                                          | this run (`pnpm exec vitest run`)                                               | build-and-test | Met        |
| TC-4            | `unit-test-instructions.md` § Required coverage matrix — Persistence/migration, Pipeline, Configuration/URLs, Batch API, Invalidation, Frontend | One verifiable test per requirement at the narrowest effective level, per component | 80 scoped backend + 5 scoped frontend tests, all pass, mapped to FR/NFR IDs in `traceability.json`                                                         | scoped test run (this stage) + `construction/code-generation/traceability.json` | build-and-test | Met        |
| TC-5            | Backend static verification (Ruff, Pyright)                                                                                                     | Zero lint/type errors on touched code                                               | Ruff: all checks passed. Pyright: 0 errors, 0 warnings                                                                                                     | this run                                                                        | build-and-test | Met        |
| TC-6            | Frontend static verification (`tsc --noEmit`, ESLint `--max-warnings=0`)                                                                        | Zero type/lint errors on touched code                                               | `pnpm typecheck`: clean. `eslint --max-warnings=0` on the 3 touched files: clean                                                                           | this run                                                                        | build-and-test | Met        |
| NFR1.2 / NFR1.3 | `requirements.md` (p95 latency targets)                                                                                                         | Measured p95 against a real CDN endpoint                                            | Not measurable from unit tests (no real CDN in the suite); `performance-validation` (Stage 4.6) is **not scheduled** in this bugfix scope's execution plan | — no owning stage in this run's plan —                                          | build-and-test | Unverified |

TC-1 through TC-6 are `Met`. NFR1.2/NFR1.3 are the one exception: the
Code Generation plan and `unit-test-instructions.md` both correctly note
these require measured evidence against a real CDN, and `traceability.json`
marks them `Deferred` targeting `performance-validation` — but the bugfix
scope's execution plan does not include stage 4.6 (`Next Stage` after this
one is `Deployment Pipeline`). Per this stage's own rule ("a check may be
deferred only when... the current execution plan contains a later validation
stage that explicitly owns that check... If no later owning stage is
scheduled, the target is `Unverified`, not deferred successfully"), these
two remain `Unverified` here rather than inheriting Code Generation's
`Deferred` status.

## Known limitations / outstanding items (carried from Code Generation's

accepted-risk review)

The Code Generation stage's advisory reviewer (`aidlc-architecture-reviewer-agent`)
returned NOT-READY with 5 findings; the human explicitly chose **Approve**
at that gate, which maps every finding to Accepted risk per protocol. These
are not re-litigated here, but are restated for visibility since they bear
on the FR/NFR coverage check in `cross-unit-traceability.md`:

- **R-01 (Critical)** — FR4.1 (cache invalidation on image _replace_) is
  wired only from the new DELETE endpoint; `update_product` (the actual
  replace path) does not purge the superseded key.
- **R-02 (Critical)** — FR3.3 (CDN routing for both thumbnail and gallery)
  is only implemented for the thumbnail/batch surface; the existing gallery
  endpoint (`get_product_image_urls`) still signs via the non-CDN signer.
- **R-03 (Major)** — the documented frontend test command in
  `unit-test-instructions.md` (`pnpm test --run ...`) does not run as
  written; this stage used the corrected form
  (`pnpm exec vitest run ...`, see `build-instructions.md` §
  Troubleshooting).
- **R-04 (Major)** — NFR4.3 (CDN cache hit/miss metrics) has no real
  hit/miss signal implemented; only purge-outcome logging exists.
- **R-05 (Minor)** — `traceability.json`'s FR2.4 evidence cites a raw
  storage-key field rather than the actual signed-URL surface
  (`covers[].url`); a citation-only issue, not a code gap.

## Readiness assessment

- **Build-ready**: yes.
- **Test-ready**: yes for the scoped and full-suite unit coverage (all
  green); NFR1.2/NFR1.3 remain genuinely unverified in this scope, not a
  test failure but an untested performance claim.
- **Deployment-ready**: conditional — see Step 10 (`cross-unit-traceability.md`)
  for the FR/NFR-level coverage verdict, and the outstanding items above
  (R-01/R-02 are real behavioral gaps the human already chose to accept for
  this bugfix; they are not blocking per that decision, but they should be
  tracked as follow-up work).
