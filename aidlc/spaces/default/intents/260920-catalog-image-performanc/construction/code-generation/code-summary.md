# Code Summary — Catalog Image Load Optimization

## Intent

`260920-catalog-image-performanc` — eliminate the N+1 cover-URL fan-out in
the catalog grid and serve a private 600×600 thumbnail derivative through
the configured CDN, with synchronous invalidation + Taskiq retry
compensation on the existing image-replacement path.

Scope: `bugfix`, brownfield, `minimal` test strategy, `test-after`
methodology, zero-Unit delivery.

## Files Created

### Backend — application layer

- `apps/api/src/prosell/application/dto/product/batch_cover_urls.py` —
  `BatchProductCoverUrlsRequest`, `BatchProductCoverUrlItem`,
  `BatchProductCoverUrlsResponse`. Pydantic-validated wire shape for
  the new endpoint; `BATCH_COVER_URLS_MAX_PRODUCTS = 100` (OQ3) caps
  both the schema and the handler-level guard.
- `apps/api/src/prosell/application/use_cases/product/purge_product_image.py` —
  `PurgeProductImageUseCase` orchestrates synchronous CDN invalidation
  with a Taskiq retry fallback (`success` / `queued_retry` /
  `failed_no_retry` outcome labels for NFR4.2 audit logs). Storage
  delete is best-effort, runs after the CDN decision, and never
  raises.

### Backend — domain ports

- `apps/api/src/prosell/domain/ports/i_cdn_invalidator.py` —
  `ICdnInvalidator` (`invalidate_key(key)`) and `CdnInvalidationError`.
  Kept deliberately thin — the policy lives in the calling use case.

### Backend — infrastructure

- `apps/api/src/prosell/infrastructure/services/cdn_invalidator_do.py` —
  `DigitalOceanCdnInvalidator` adapter. httpx-based; bearer-token
  optional; raises `CdnInvalidationError` on non-2xx or missing
  purge URL (NFR5.1 fail-fast).
- `apps/api/src/prosell/infrastructure/tasks/use_cases/purge_cdn_cache_task.py` —
  Taskiq worker task that re-runs the same invalidation (idempotent
  at the CDN provider).

### Backend — frontend

- `apps/api/src/prosell/infrastructure/api/routers/product_router.py` —
  Added two endpoints:
  - `POST /api/v1/products/image-urls:batch` — single round-trip
    cover-URL signing (FR1, NFR1.1, NFR4.1). Signs only the
    selected thumbnail (with `cover_image_key` fallback per FR2.5),
    routed through the CDN signer (FR3.1). Structured
    `batch_size` / `user_id` / `tenant_id` log on every request.
    413 over the cap (OQ3). Tenant-prefix check reuses
    `_key_tenant_allowed` (NFR2.2).
  - `DELETE /api/v1/products/{product_id}/images/{image_key}` —
    single-image deletion with the `PurgeProductImageUseCase`
    invoked before the response is built (FR4.3). Removes the key
    from `image_urls` AND clears `cover_image_key` /
    `thumbnail_image_key` if they pointed at the same key
    (defense in depth — never advertise a deleted image).
    `DeleteProductImageResponse` includes `purge_outcome` for the
    client.

### Frontend

- `apps/web/src/lib/api/schemas/batchProductCoverUrls.ts` — Zod schema
  for the batch response wire shape (`z.looseObject()` convention).
- `apps/web/src/lib/api/productImageUrlsBatch.ts` — Replaced the
  per-product `useQueries` fan-out with a single `useQuery` POST
  against `/api/v1/products/image-urls:batch`. Same `Map<productId,
url|null>` shape, so `CatalogPage` wiring stays untouched (FR5.2).
  Empty list = no fetch; 4xx/5xx = degrade every id to `null`
  (spec §8 never-crash contract).

## Files Modified

### Backend

- `apps/api/src/prosell/domain/ports/i_task_dispatcher.py` —
  Added abstract `dispatch_cdn_purge(key)` method.
- `apps/api/src/prosell/domain/ports/__init__.py` — Re-export
  `ICdnInvalidator` and `CdnInvalidationError`.
- `apps/api/src/prosell/infrastructure/tasks/taskiq_task_dispatcher.py` —
  Implements `dispatch_cdn_purge` via `purge_cdn_cache_task.kiq(key=...)`.
- `apps/api/src/prosell/core/config.py` — Added
  `do_spaces_cdn_purge_url` / `do_spaces_cdn_purge_token` settings
  (empty defaults in dev; production sets both).
- `apps/api/src/prosell/infrastructure/api/dependencies.py` —
  Added `get_cdn_invalidator()` factory.

### Backend tests (added)

- `apps/api/tests/unit/api/routers/test_batch_product_cover_urls.py` —
  9 tests pinning FR1, FR2.5, FR6, NFR2.2, NFR4.1, OQ3.
- `apps/api/tests/unit/api/routers/test_delete_product_image.py` —
  5 tests pinning FR4 (success path + queued-retry path + cross-tenant
  rejection + audit-log contract).
- `apps/api/tests/unit/infrastructure/services/test_cdn_invalidator_do.py` —
  6 tests pinning the CDN adapter (happy path / 4xx / 5xx / network /
  missing config / bearer-optional).
- `apps/api/tests/unit/application/use_cases/product/test_purge_product_image.py` —
  6 tests pinning the orchestration (success / queued_retry /
  failed_no_retry / outcome-label stability / idempotency).

### Backend tests (modified — pre-existing mocks updated)

- `apps/api/tests/unit/api/routers/test_image_router_signed_url.py` —
  `_make_spaces()` mock now also exposes
  `spaces.generate_cdn_download_url` (the router switched to the CDN
  signer per FR3.1). Without this fix the test hung on
  `await spaces.generate_cdn_download_url(...)`.
- `apps/api/tests/unit/api/routers/test_image_upload_cross_org.py` —
  Same mock-gap fix for the cross-org upload test.

### Frontend tests (modified)

- `apps/web/src/lib/api/productImageUrlsBatch.test.ts` — Pinned the
  new single-POST contract (FR1.1, NFR1.1, OQ3 413, malformed
  degradation, products omitted by backend, empty list).

## Key Decisions

1. **Thumbnail vs cover separation honored.** The plan's "preserve
   `cover_image_key`" decision translates to a separate
   `thumbnail_image_key` column for the private derivative (not a
   repurposing of the existing gallery-cover selection). Two
   first-class fields, neither mutates the other.
2. **OQ1 — runtime fallback.** Legacy products without a generated
   thumbnail fall back to `cover_image_key` at read time. No backfill
   migration. Stays within `test-after` ordering without an
   additional one-shot job.
3. **OQ2 — TTL = 15 minutes.** Surfaced as
   `DOSpacesService.DEFAULT_SIGNED_URL_EXPIRES_IN`, already aligned
   with the existing single-product `GET /image-urls` endpoint.
   `expires_in` is echoed back in the batch response so the frontend
   knows when to re-sign.
4. **OQ3 — hard cap at 100 with 413.** `BATCH_COVER_URLS_MAX_PRODUCTS`
   is shared by the Pydantic `max_length` and the handler-level
   belt-and-suspenders guard. Sized for typical catalog pages (≤50
   per A4) with headroom for filter views.
5. **CDN purge compensation lives in the use case.** The handler
   invokes `PurgeProductImageUseCase.execute(key)` and propagates
   the outcome label to the response. Synchronous invalidation
   failures dispatch an idempotent Taskiq retry (NFR3.1, NFR3.2).
6. **Defense in depth reused.** Tenant-prefix check
   (`_key_tenant_allowed`) is the same helper used by the single
   product endpoint. New endpoint inherits the ORG_ADMIN_VIEW_ALL
   legacy-key relaxation for free (FR6.2).

## Test Coverage Summary

- Backend scoped pytest: **80 tests** across 11 files, all green.
- Frontend scoped vitest: **5 tests** in `productImageUrlsBatch.test.ts`,
  green.
- Full backend unit suite: **1410 tests**, green.
- Full frontend vitest suite: **1356 tests** across 169 files, green.
- Pyright: 0 errors, 0 warnings.
- Ruff: All checks passed.
- Frontend typecheck: clean.
- Frontend ESLint: clean.

## Deviations from Plan

- **Plan referenced `cover_image_key` as the new derivative storage.**
  Workspace fact at planning time was that `cover_image_key` already
  existed and selected from `image_urls`; the merged
  thumbnail-persistence step renamed the new column to
  `thumbnail_image_key`. The plan's "preserve `cover_image_key`"
  guard rail was honored (no double-render of the existing selection).
- **Pre-existing test mocks updated.** Two test files
  (`test_image_router_signed_url.py`, `test_image_upload_cross_org.py`)
  had mocks that did not cover `generate_cdn_download_url` because
  that method was added by the merged commit before this session.
  Fix: added `AsyncMock(return_value=SIGNED_URL)` /
  `AsyncMock(return_value="https://cdn.example.com/image.webp?signed=cdn")`
  respectively. This is a direct consequence of the merged-commit
  vs. plan mismatch above; both fixes restore green tests without
  changing the production code path.

## Open Items Surfaced

- **NFR1.2 / NFR1.3 (p95 timing) require measured evidence.**
  Unit tests cannot prove timing in real CDN infrastructure. Per
  the unit-test-instructions, p95 verification belongs to
  `performance-validation` (Stage 4.6), not Code Generation. The
  scoped tests assert behavioral correctness; the timing evidence
  must be collected against a staging environment with the
  configured CDN endpoint.
- **OQ1 batch backfill not implemented.** Legacy products still
  rely on the runtime fallback to `cover_image_key`. A5 estimated
  this fraction as small; if observability shows the fallback hits a
  significant number of catalog pages, a one-shot Taskiq job can be
  added in a follow-up intent.

## Next Stage

Build and Test (Stage 3.6) — verify the implementation against the
full integration suite (Postgres-backed), run pre-push pytest
locally, and confirm CI green before deployment.

## Plan Approval Receipt

The plan fingerprint, code-generation-questions binding, and Testing
Contract hash were already recorded in a prior session via a
break-glass override and are intact on disk:

- Plan fingerprint: `sha256:v3:70a1ec4127b48697ee1bd29d1669132ee23ef88615cc3ab6220260dd0d7a77ef`
- Planned source SHA: `9ae5842cf9509a99dbaecd7e3118e1810148a22cbf0372eea4f91f15fb1baca9`
- Testing Contract SHA: `sha256:72f04f9302c3a10f1eb4478a4786530846901b6b7c521671160fb440895e3189`
- Plan answer: `Approve Plan` (verbatim per `code-generation-questions.md`)

Implementation followed the approved plan verbatim, including the
14-step sequence and the OQ1/OQ2/OQ3 stop-and-ask posture (OQ1
resolved to runtime fallback during Step 2, OQ2 resolved to
15-minute TTL via existing constant, OQ3 resolved to 100-cap with
413 before any cap was needed).
