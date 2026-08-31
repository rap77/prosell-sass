# Unit Test Instructions — fix-prosell-ci-seed-data

Test strategy: **Minimal** (requirement-driven, ~5-15 tests total) + `bugfix` scope floor (targeted regression per defect, existing suite stays green). Every test here is backend integration (pytest + pytest-asyncio), matching the existing suite's own level for this area — no new test framework/config needed.

## Test Framework Setup

Already configured: `pytest` + `pytest-asyncio` (`apps/api/pyproject.toml`), against the local Postgres test DB at `localhost:5433` (bootstrapped via `apps/api/scripts/create_test_schema.py`, see `apps/api/tests/integration/_constants.py::TEST_DB_URL`). No new fixtures, plugins, or config files required.

## How to Run (exact, unit-scoped commands)

```bash
cd apps/api && uv run pytest tests/integration/database/test_seed_categories.py tests/integration/database/test_seed_car_attributes.py -v
```

```bash
cd apps/api && uv run pytest tests/integration/api/routers/test_fb_sync_router.py -v
```

```bash
cd apps/api && uv run pytest tests/integration/bulk_upload/ -v
```

```bash
cd apps/api && uv run pytest tests/integration/use_cases/test_batch_approve_products.py tests/integration/use_cases/test_batch_submit_products.py -v
```

(Combined, one run: `cd apps/api && uv run pytest tests/integration/database/test_seed_categories.py tests/integration/database/test_seed_car_attributes.py tests/integration/api/routers/test_fb_sync_router.py tests/integration/bulk_upload/ tests/integration/use_cases/test_batch_approve_products.py tests/integration/use_cases/test_batch_submit_products.py -v`)

## Expected Coverage Targets (requirement-driven, one per requirement + happy-path floor)

| Test                                                                                                                                                                      | Requirement | Type                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------- |
| `test_seed_creates_level_3_leaf_with_correct_hierarchy` (corrected)                                                                                                       | FR1.1       | Existing regression, corrected  |
| `test_car_leaf_has_attribute_schema_and_presentation` (corrected)                                                                                                         | FR1.2       | Existing regression, corrected  |
| `test_create_product_under_car_leaf_validates_and_composes_title` (corrected)                                                                                             | FR1.3       | Existing regression, corrected  |
| `test_create_product_under_car_leaf_rejects_missing_required` (corrected)                                                                                                 | FR1.4       | Existing regression, corrected  |
| `test_seed_carros_y_camionetas_is_a_leaf_with_no_removed_child_slugs` (new)                                                                                               | FR2.1       | New regression                  |
| `test_completed_callback_updates_all_publication_records_idempotently` (re-verified, no code change needed in the test itself)                                            | FR3.4       | Existing regression, now passes |
| `test_batch_approve_multiple_pending_products`, `test_batch_approve_partial_success`, `test_batch_approve_deduplicates_ids` (corrected)                                   | FR4.1       | Existing regression, corrected  |
| `test_batch_submit_multiple_draft_products`, `test_batch_submit_rejected_products`, `test_batch_submit_partial_success`, `test_batch_submit_deduplicates_ids` (corrected) | FR4.1       | Existing regression, corrected  |

No new standalone unit tests are added beyond FR2.1 — FR1/FR3/FR4 are fixes to already-existing tests whose assertions/fixtures were wrong, not new test surface. This matches the Minimal strategy's "narrowest effective level" obligation: the narrowest fix is repairing the existing regression, not adding a parallel one.

## Mocking/Stubbing Guidance

None needed — all affected tests already use the real integration test DB (no mocks in this area), consistent with the existing pattern in `apps/api/tests/integration/`.

## Test Data Management

- FR1/FR2: rely on `seed_vehicles_vertical()` (idempotent, already exercised by the existing tests) — no new fixtures.
- FR3: no new test data; the fix is to the fixture's transaction wiring, not the data it creates.
- FR4: reuses the existing `test_category` fixture from `apps/api/tests/integration/conftest.py` (already tenant-scoped to `test_organization`) — no new fixture needed.
