# Code Quality Assessment

## Testing

- Backend tests are organized under `apps/api/tests/unit`, `integration`, and `contract`, plus source-level tests.
- Frontend tests are organized under `apps/web/tests/app`, `components`, `unit`, and `e2e`; shared support exists under `tests/`.
- The scan executed targeted evidence successfully: 55 Vitest assertions for `CatalogPage`, `ProductCard`, and `useImageUploadOptimized`; 35 pytest assertions for image signing, image optimization, and cross-organization uploads.
- CI collects backend coverage with `pytest --cov=prosell --cov-report=xml` and runs frontend Vitest coverage.

## Quality Gates

- Backend: Ruff and Pyright, configured in `apps/api/pyproject.toml`.
- Frontend: ESLint, Prettier, and TypeScript checks.
- Pre-commit: GGA, secret scanning, Tailwind validation, React Doctor, lint-staged, Ruff, and Pyright.
- CI/CD: `ci.yml`, `deploy.yml`, `e2e.yml`, `promote-prod.yml`, `recover-prod.yml`, `graphify.yml`, and `react-doctor.yml`.

## Documentation Quality

Architecture and workflow documentation are extensive. The root `README.md` still describes the retired MasterMind/MM-Flow workflow rather than the active AI-DLC process.

## Technical Debt Signals

1. **Catalog N+1 remains:** `productImageUrlsBatch.ts` uses one React Query request for every visible product instead of a single batch request.
2. **Gallery over-signing:** the signing endpoint produces a URL for every gallery image although `ProductCard` consumes only the first URL.
3. **No private thumbnail path:** upload creates full-size WebP and public OG JPEG, but no private catalog-thumbnail derivative is exposed to cards.
4. **Optimization bypass:** `ProductCard` uses `next/image` with `unoptimized` for signed URLs because Next cannot reach the browser-facing MinIO host.
5. **Cache/CDN implementation gap:** `do_cdn_endpoint` is unused and uploads do not set cache-control metadata.
6. **Security constraint:** tenant-prefixed key validation is intentionally defense in depth. A performance implementation that weakens it is unacceptable.

## Recommended Validation Focus

- Batch authorization and fail-closed tenant validation.
- One cover selection per product rather than complete-gallery signing.
- Private derivative creation, replacement/deletion cleanup, and legacy fallback.
- Signed URL expiry, cache headers, CDN routing, and invalidation.
- Cross-organization administrator access and MinIO internal/public endpoint behavior.
