# Handoff — product-image-association-bug

## Current objective

- `product-image-association-bug` — P0 production incident on prosellweb.com
- Active since 2026-06-03
- Priority: critical (blocks user-visible functionality in production)
- **Status (2026-06-03, end of session 2)**: T1, T2, T3 done. T4 next.

## Why this is now active (instead of a11y-hardening)

- A P0 production bug was discovered on 2026-06-03: products created via drag-and-drop in `/catalog/create` show a placeholder image instead of the actual uploaded photos
- `a11y-hardening` is **paused** (not cancelled) — was active, now demoted to `paused` while the incident is open
- Once the image bug is shipped to prod, `a11y-hardening` resumes (estimated 2-4 hours of work remaining)

## Decisions already made

- Single source of truth: `products.image_urls` top-level JSONB column
- Legacy `product_images` table will be dropped (verified 0 rows in prod, 0 references outside the model)
- Workflow: mm-flow scaffolding for tracking/deploy + TDD (RED → GREEN → REFACTOR) as engineering technique
- Deploy sequence: local (tests green) → staging (manual smoke test) → prod (maintenance window with `alembic upgrade head`)
- No patches, no `--no-verify` commits, no AI attribution
- **Tests live in `tests/unit/application/use_cases/product/`, not `tests/integration/`** — local DB on `localhost:5433` is not running, conftest auto-skips integration tests. Unit tests of use cases give the same RED signal and actually run.

## Blockers / risks

- None blocking — prod has the bug but data is recoverable via Alembic backfill migration
- Production maintenance window needs to be scheduled with user (P10 in the task list)
- T8 (bulk upload fix) will also need to address a secondary bug in `CSVImageMapper` — see "Discoveries" below

## Discoveries

- **Secondary bug in `CSVImageMapper`**: at `apps/api/src/prosell/domain/services/csv_image_mapper.py:132` the mapper does `csv_path = row.get("path", "")`, but `MappedCSVRow` produces `image_path` (renamed in `csv_field_mapper.py:355`). The mapper therefore NEVER matches ZIP folders to CSV rows in production. The bulk-upload RED test mocks the mapper to inject a pre-built mapping so the use-case bug is isolated. Fix in T8 must address BOTH the TODO at `bulk_upload_vehicles.py:286` AND the key mismatch in the mapper. Engram topic key: `discovery-csv-image-mapper-key-mismatch`.

## Context (for the next session)

- Three inconsistent image storage locations exist (see `.mm-flow/planning/changes/product-image-association-bug/requirements.md`)
- The frontend `create/page.tsx:59` is the bug site for the WRITE (sends `image_urls` nested in `attributes`)
- The use cases `create_product.py` and `bulk_upload_vehicles.py:286` are the bug sites for the READ coordination
- DO Spaces config is correct; `remotePatterns` in `next.config.ts` is correct; `useProductImageUrls` hook is correct
- Production state verified 2026-06-03: alembic head `xyzabc123456`, column exists, env vars correct, `product_images` table empty
- engram topic key `prod-image-bug-t3-red-tests`: T3 RED tests status (3 unit tests, all RED for right reason)

## T3 done — RED phase complete (2026-06-03)

Three failing tests at the use case layer, each RED for "feature missing" (not typo):

1. `apps/api/tests/unit/application/use_cases/product/test_create_product_persists_image_urls.py`
   - Asserts entity passed to `repo.create()` has `image_urls == [urls]` (NOT in `attributes`)
   - RED: use case doesn't forward `image_urls` to `Product.create(...)`
   - Uses `CreateProductRequest.model_construct(...)` to bypass DTO validation (DTO lacks the field until T4)

2. `apps/api/tests/unit/application/use_cases/product/test_get_product_image_urls_returns_signed.py`
   - Bug-scenario test: create product with images, then build the GET /image-urls response
   - RED: same upstream bug; response has 0 signed URLs because `image_urls` is empty

3. `apps/api/tests/unit/application/use_cases/product/test_bulk_upload_persists_image_urls.py`
   - Mocks `csv_image_mapper` to inject a pre-built `ImageMappingResult` (bypassing the secondary bug)
   - Asserts the persisted product has `image_urls` populated with DO Spaces keys for that VIN
   - RED: use case has TODO at line 286, never writes images to product

## Exact next recommended task

- **T4 + T5** (GREEN phase, batch): add `image_urls: list[str] = []` to `CreateProductRequest` DTO and forward it from `create_product.py:71`
- This makes tests 1 and 2 GREEN; the use case fix is the actual TDD target
- Command: `/mm:complete-task T4 --brief` then `/mm:complete-task T5 --brief`
- After T4+T5, proceed to T6+T7 (Update DTO + product_router update) and T8 (bulk upload + mapper fix)

## Validation commands

- `cd apps/api && uv run pytest tests/unit/application/use_cases/product/test_create_product_persists_image_urls.py tests/unit/application/use_cases/product/test_get_product_image_urls_returns_signed.py tests/unit/application/use_cases/product/test_bulk_upload_persists_image_urls.py -v` (currently 3 failed, should pass after T4-T8)
- `cd apps/api && uv run pytest` (full suite, 1124 tests should pass)
- `cd apps/web && pnpm test` (full suite, 840 tests should pass)
- Manual: drag-and-drop test in `https://staging.prosell.saas/catalog/create` (after staging deploy)

## Paused objectives (work in progress, not cancelled)

- `a11y-hardening` — 3 issues pending (sidebar contrast 2.4:1, h3 without h2, two `<aside>` without aria-label). Resume after image-bug is shipped.
