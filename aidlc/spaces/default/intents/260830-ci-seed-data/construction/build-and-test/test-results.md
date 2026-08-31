# Test Results — fix-prosell-ci-seed-data

## Build Status

✅ **Success** — no compile/bundle step applies (backend Python, no frontend files touched).

```bash
$ uv run ruff check .
All checks passed!

$ uv run ruff format --check .
809 files already formatted

$ uv run pyright
0 errors, 0 warnings, 0 informations
```

## Unit Tests (per `unit-test-instructions.md`, module-scoped)

Ran during Code Generation, re-verified here:

```bash
cd apps/api && uv run pytest tests/integration/database/test_seed_categories.py tests/integration/database/test_seed_car_attributes.py tests/integration/api/routers/test_fb_sync_router.py tests/integration/bulk_upload/ tests/integration/use_cases/test_batch_approve_products.py tests/integration/use_cases/test_batch_submit_products.py -v
```

Result: **54 passed, 3 failed** — the 3 failures are the already-documented, out-of-scope `bulk_upload` "Unknown organization codes: DJ, RM" bug (hallazgo #23), unrelated to this intent's FRs, confirmed pre-existing.

## Full Backend Suite (per NFR1.2, human-approved during Requirements Analysis)

```bash
cd apps/api && uv run pytest --cov=prosell --cov-report=xml
```

| Run                                        | Failed | Passed | Errors | Total |
| ------------------------------------------ | ------ | ------ | ------ | ----- |
| **Baseline** (unmodified, via `git stash`) | 21     | 1931   | 12     | 1964  |
| **With FR1–FR4 fixes applied**             | 8      | 1945   | 12     | 1965  |

**13 tests fixed, matching exactly the FR1/FR3/FR4 target set** (FR2's new regression test adds to the total; hence 1965 vs 1964):

| Fixed test                                                                                     | Requirement            |
| ---------------------------------------------------------------------------------------------- | ---------------------- |
| `test_seed_categories.py::test_seed_creates_level_3_leaf_with_correct_hierarchy`               | FR1.1                  |
| `test_seed_car_attributes.py::test_car_leaf_has_attribute_schema_and_presentation`             | FR1.2                  |
| `test_seed_car_attributes.py::test_create_product_under_car_leaf_validates_and_composes_title` | FR1.3                  |
| `test_seed_car_attributes.py::test_create_product_under_car_leaf_rejects_missing_required`     | FR1.4                  |
| `test_fb_sync_router.py::test_completed_callback_updates_all_publication_records_idempotently` | FR3.4                  |
| `test_fb_sync_router.py::test_failed_callback_keeps_request_queued_with_capped_attempt_count`  | FR3 (same fixture fix) |
| `test_batch_approve_products.py::test_batch_approve_multiple_pending_products`                 | FR4.1                  |
| `test_batch_approve_products.py::test_batch_approve_partial_success`                           | FR4.1                  |
| `test_batch_approve_products.py::test_batch_approve_deduplicates_ids`                          | FR4.1                  |
| `test_batch_submit_products.py::test_batch_submit_multiple_draft_products`                     | FR4.1                  |
| `test_batch_submit_products.py::test_batch_submit_rejected_products`                           | FR4.1                  |
| `test_batch_submit_products.py::test_batch_submit_partial_success`                             | FR4.1                  |
| `test_batch_submit_products.py::test_batch_submit_deduplicates_ids`                            | FR4.1                  |

**Zero regressions**: the baseline run and the fixed-tree run were compared via `git stash`/`pop` (per the already-learned project convention of never trusting "pre-existing" without independent re-verification). Every one of the remaining 8 failed + 12 errors in the fixed-tree run is byte-for-byte the same test name as in the baseline run — none are new.

### Remaining failures (pre-existing, out of scope — verified identical in both runs)

| Test                                                                                | Cause                                               | Status                       |
| ----------------------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------- |
| `test_admin_organizations_router.py::test_admin_patch_persists_contact_name`        | Unrelated, pre-existing                             | Out of scope                 |
| `test_batch_review_api.py::test_batch_approve_success`                              | Unrelated, pre-existing                             | Out of scope                 |
| `test_batch_review_api.py::test_batch_reject_success`                               | Unrelated, pre-existing                             | Out of scope                 |
| `test_batch_review_api.py::test_batch_approve_partial_failure`                      | Unrelated, pre-existing                             | Out of scope                 |
| `test_org_verticals.py::test_list_org_verticals_cross_org_returns_403`              | Unrelated, pre-existing                             | Out of scope                 |
| `test_bulk_upload_preview.py::test_preview_summary_counts`                          | Hallazgo #23 (`Unknown organization codes: DJ, RM`) | Explicitly out of scope (C3) |
| `test_bulk_upload_with_images.py::test_endpoint_returns_correct_response_structure` | Hallazgo #23                                        | Explicitly out of scope (C3) |
| `test_bulk_upload_with_images.py::test_endpoint_requires_organization_id`           | Hallazgo #23                                        | Explicitly out of scope (C3) |
| 12x `test_fb_credential_migration_router.py::*` (ERROR)                             | Unrelated, pre-existing (identical in both runs)    | Out of scope                 |

## Coverage Report

Coverage report generated (`--cov-report=xml`) per NFR1.2/NFR1.3. No new coverage floor introduced — the backend has no enforced `--cov-fail-under` (asymmetry already accepted by the team, `project.md` Q3); this intent does not change that.

## Integration / Performance / Security Test Instructions

**Not generated** — Test Strategy is Minimal, and per the already-learned project convention ("no generar integration/performance/security-test-instructions.md salvo que un cambio realmente lo amerite"): this intent has no NFR performance/security requirements in `requirements.md`, and the fixes are entirely covered by the existing integration-level tests already run above. No cross-unit boundary or new external dependency is introduced.
