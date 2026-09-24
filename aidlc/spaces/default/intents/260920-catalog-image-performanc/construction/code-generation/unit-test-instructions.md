# Unit Test Instructions — Catalog Image Load Optimization

## Strategy, scope, and runner readiness

The Testing Contract requires `test-after`, `minimal`, and `bugfix` scope obligations: implement each applicable layer, then write and run its test; include one verifiable test per requirement at the narrowest effective level, a happy path for each changed component, one targeted N+1 regression, and keep the existing suite green. No new backend coverage threshold is introduced; the existing frontend coverage floor remains unchanged.

The verified runners are Pytest through `uv run` in `apps/api` and Vitest through the `test` script in `apps/web/package.json`. Before the first new test, run these scoped baselines from their respective package directories:

```bash
uv run pytest tests/unit/infrastructure/images/test_image_optimizer.py tests/unit/api/routers/test_get_product_image_urls.py tests/unit/api/routers/test_product_router_image_signing.py tests/unit/api/routers/test_sign_image_urls_tenant_scope.py tests/unit/api/routers/test_image_router.py
```

```bash
pnpm test --run src/lib/api/productImageUrlsBatch.test.ts
```

After adding the planned tests, replace each list with the actual touched test paths and run them from the same package directory. Never use an unfiltered suite as this stage-level unit command. Unit tests must not execute a real migration, CDN, storage, Redis, or external HTTP call.

## Required coverage matrix

- **Persistence and migration (if created):** nullable approved thumbnail representation, unchanged `cover_image_key`, serialization, selected OQ1 behavior, and reversible upgrade/downgrade.
- **Pipeline:** private 600×600 WebP, centered crop, tenant-scoped key, and no gallery-WebP/Open-Graph-JPEG regression.
- **Configuration and URLs:** missing `do_cdn_endpoint` fails startup; thumbnail and gallery use CDN-hosted signed URLs, selected explicit TTL, and never sign a foreign tenant key.
- **Batch API:** one request for visible products, one cover per product without gallery data, legacy fallback, own/cross-org authorization, cross-tenant rejection, selected OQ3 limit behavior, and structured logs without signed URLs.
- **Invalidation:** replace/delete request CDN and storage purge; a post-upload failure retains the new image, queues an idempotent retry, and records the operational outcome.
- **Frontend:** one batch call for visible IDs, no call for an empty list, malformed/error payload degrades to `null`, `ProductCard` keeps `unoptimized`, and `attributes.image_urls` remains the legacy fallback.

## Mocks and test data

Use `AsyncMock` or fakes for `IDOSpacesService`, product/organization repositories, the CDN invalidation client, and the Taskiq broker; never call real S3, Redis, CDN, or HTTP services. Use fixed UUIDs for own and foreign tenants plus an `ORG_ADMIN_VIEW_ALL` user to prove defense in depth. Build in-memory PNG/JPEG fixtures with center/edge colour markers for crop assertions. In frontend tests, mock `fetch`, use a fresh `QueryClient` per test, and assert request URL/body/count and observable output rather than React Query internals.

## Scoped quality commands

Ejecutar únicamente en los paquetes modificados:

```bash
uv run pyright
```

```bash
uv run ruff check src tests
```

```bash
pnpm typecheck
```

```bash
pnpm lint
```

Run the first two commands from `apps/api` and the final two from `apps/web`. NFR1.2 and NFR1.3 require later measured p95 evidence; unit tests alone cannot prove timings in real CDN infrastructure.
