# Test Results — Catalog Image Load Optimization

## Build status

Success. `pnpm typecheck` (frontend) clean; `uv run pyright` (backend) clean.
No compile/build step failures.

## Test results

### Scoped tests for this intent

| Suite                                            | Command                                                                                                                                                                                                                                                                                                                                                                        | Total | Passed | Failed | Skipped |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- | ------ | ------ | ------- |
| Backend, new/modified for this intent            | `uv run pytest tests/unit/api/routers/test_batch_product_cover_urls.py tests/unit/api/routers/test_delete_product_image.py tests/unit/infrastructure/services/test_cdn_invalidator_do.py tests/unit/application/use_cases/product/test_purge_product_image.py tests/unit/api/routers/test_image_router_signed_url.py tests/unit/api/routers/test_image_upload_cross_org.py -q` | 34    | 34     | 0      | 0       |
| Backend, pre-existing baseline verified unbroken | `uv run pytest tests/unit/infrastructure/images/test_image_optimizer.py tests/unit/api/routers/test_get_product_image_urls.py tests/unit/api/routers/test_product_router_image_signing.py tests/unit/api/routers/test_sign_image_urls_tenant_scope.py tests/unit/api/routers/test_image_router.py -q`                                                                          | 46    | 46     | 0      | 0       |
| Frontend, scoped                                 | `pnpm exec vitest run src/lib/api/productImageUrlsBatch.test.ts`                                                                                                                                                                                                                                                                                                               | 5     | 5      | 0      | 0       |

Note: the documented frontend command in `unit-test-instructions.md`
(`pnpm test --run src/lib/api/productImageUrlsBatch.test.ts`) fails with
`Unknown option: 'run'` — `pnpm` swallows `--run` instead of forwarding it
to the underlying `vitest` script. This run used the corrected form
(`pnpm exec vitest run ...`). See `build-instructions.md` § Troubleshooting.

### Full existing suite (scope-floor regression check)

| Suite                        | Command                        | Total            | Passed | Failed | Skipped |
| ---------------------------- | ------------------------------ | ---------------- | ------ | ------ | ------- |
| Backend, full unit directory | `uv run pytest tests/unit/ -q` | 1410             | 1410   | 0      | 0       |
| Frontend, full vitest suite  | `pnpm exec vitest run`         | 1356 (169 files) | 1356   | 0      | 0       |

No regressions. Full backend integration suite (Postgres-backed) is not
re-run here — the project's own established convention runs it in
pre-push/CI (`project.md` § Mandated: "ALWAYS ejecutar la suite completa
de pytest backend en pre-push y en CI"), and none of this intent's touched
files are integration-test files.

### Static verification

| Tool                                | Scope                    | Result                               |
| ----------------------------------- | ------------------------ | ------------------------------------ |
| `uv run ruff check src tests`       | backend                  | All checks passed                    |
| `uv run pyright`                    | backend                  | 0 errors, 0 warnings, 0 informations |
| `pnpm typecheck`                    | frontend                 | Clean                                |
| `pnpm exec eslint --max-warnings=0` | 3 touched frontend files | Clean (no output)                    |

## Coverage report

Not separately measured (no coverage tool run in this stage); the project's
frontend coverage floor is 40% (asymmetric, already accepted per `project.md`)
and there is no enforced backend floor — neither is gated in Build and Test
per team convention.

## Target Verification Matrix (finalized)

See `build-and-test-summary.md` § Target Verification Matrix for the full
table with sources and evidence. Summary: 6 of 7 targets `Met`; the combined
NFR1.2/NFR1.3 row is `Unverified` — the bugfix scope's execution plan does
not schedule `performance-validation` (Stage 4.6), so the deferral
`unit-test-instructions.md` and `traceability.json` both correctly recorded
at Code Generation has no owning stage left to redeem it within this
workflow.

## Failure classification (Step 9 escalation ladder)

**Rung 1 (in-stage fix, max 2 attempts):** not applicable — measuring
NFR1.2/NFR1.3 requires a real CDN endpoint under load, which does not exist
in this stage's test environment or in any local scaffolding this stage
could fix.

**Rung 2 (classify and estimate impact):** the root cause is neither a
defect in the generated source/test code nor an approach choice at
Code Generation (library, container image, instance type, algorithm, flag)
— it is that the active scope (`bugfix`) does not schedule a later stage
that owns real-environment performance measurement. No identifiable fix
exists in any swappable dimension: this is a scope/process gap, not an
engineering one. Proceeding to Rung 4's no-fix halt-and-ask variant.

## Loop-Back Log

(none — this failure has no identifiable fix to loop back with; see Rung 2
above)
