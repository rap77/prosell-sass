## Developer Code Scan Results

### Scan Coverage

- **Analyzed deeply**: `./` — full tracked repository scan: 818 TypeScript/Python implementation files, 258 test files, build/deployment configuration, and the catalog-image request, upload, storage, and rendering paths.
- **Skimmed only**: generated or machine-local directories (`node_modules/`, `.venv/`, caches, `.git/`, worktrees, screenshots, and historical framework artifacts not on the active execution path).

### Packages Found

- `apps/api` — service — Python — FastAPI API implementing the Clean Architecture domain, application, and infrastructure layers.
- `apps/web` — web application — TypeScript — Next.js App Router client for catalog, administration, and public product flows.
- `tests` — end-to-end/contract support — TypeScript/Python — shared Playwright and validation tooling.

### Build System

- **Type**: pnpm workspace/Turborepo for frontend orchestration; `uv` and Hatchling for the API.
- **Config Files**: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `apps/web/package.json`, `apps/web/next.config.ts`, `apps/api/pyproject.toml`, `docker/docker-compose.yml`, `.github/workflows/*.yml`, `.pre-commit-config.yaml`.
- **Build Dependencies**: the Next.js BFF routes proxy browser requests to FastAPI; FastAPI persists to PostgreSQL and uses Redis/Taskiq; image bytes are stored through the S3-compatible `IDOSpacesService` implementation (MinIO locally, DigitalOcean Spaces in deployment).

### APIs Discovered

- FastAPI REST API — `apps/api/src/prosell/infrastructure/api/routers/` — 30 router modules, including catalog/product, image upload, public-product, category, publication, identity, and organization boundaries.
- Catalog image signing API — `apps/api/src/prosell/infrastructure/api/routers/product_router.py` — `GET /api/v1/products/{product_id}/image-urls` authorizes the product access, validates each key's tenant namespace, and creates one signed URL per image.
- Image upload API — `apps/api/src/prosell/infrastructure/api/routers/image_router.py` — presigned-upload/status legacy endpoints plus optimized `POST /api/v1/images/upload`.
- Next.js BFF — `apps/web/src/app/api/` and `apps/web/next.config.ts` — forwards authenticated frontend traffic to the API.

### Frameworks & Libraries

- FastAPI `0.128.0` — asynchronous HTTP API and dependency injection.
- SQLAlchemy `>=2.0.36` with `asyncpg` — async PostgreSQL persistence.
- Next.js `^16.3.3`, React `^19.2.8`, TypeScript `^5.5.0` — frontend and App Router.
- TanStack Query `^5.0.0` and Zustand `^5.0.11` — server-cache and client-state management.
- Pillow `>=12.0.0` and `browser-image-compression` `^2.0.2` — server-side and browser-side image processing.
- MinIO/DigitalOcean Spaces via `boto3` — S3-compatible object storage and signed URLs.

### Test Coverage

- **Test Directories**: `apps/api/tests/{unit,integration,contract}/`, `apps/api/src/prosell/tests/`, `apps/web/tests/{app,components,unit,e2e}/`, and `tests/{e2e,integration}/`.
- **Test Frameworks**: pytest/pytest-asyncio/pytest-cov, Vitest/Testing Library, and Playwright.
- **Coverage Config**: present — backend CI runs `pytest --cov=prosell --cov-report=xml`; frontend CI runs Vitest coverage.
- **Executed evidence**: targeted catalog/upload suites passed: 55 Vitest assertions across `CatalogPage`, `ProductCard`, and `useImageUploadOptimized`; 35 pytest assertions across product image signing, image optimization, and cross-organization upload tests.

### Code Quality Indicators

- **Linting**: Ruff and Pyright configured in `apps/api/pyproject.toml`; ESLint/Prettier and TypeScript configured in `apps/web`; GGA, secret scanning, Tailwind validation, and React Doctor run through `.pre-commit-config.yaml`.
- **CI/CD**: `ci.yml`, `deploy.yml`, `e2e.yml`, `promote-prod.yml`, `recover-prod.yml`, `graphify.yml`, and `react-doctor.yml` exist under `.github/workflows/`.
- **Documentation**: architecture and workflow material are extensive, but root `README.md` still describes the retired MasterMind/MM-Flow workflow rather than the active AI-DLC process.

### Technical Debt Signals

- `apps/web/src/lib/api/productImageUrlsBatch.ts:19-51` is a container-level consolidation only: it calls `useQueries` once per visible product and each query requests `GET /api/v1/products/{id}/image-urls`. It therefore retains N network calls and N signing operations for a catalog page, despite removing fetching from `ProductCard`.
- `apps/api/src/prosell/infrastructure/api/routers/product_router.py:1158-1241` signs every gallery image for the selected product although the catalog card consumes only `images[0].url`. This performs unnecessary storage signing work and returns unused URLs.
- `apps/api/src/prosell/infrastructure/api/routers/image_router.py:321-360` creates a full-size WebP plus a public Open Graph JPEG, but no catalog-thumbnail derivative. `ProductImage.thumbnail_url` exists in the legacy image entity/model, yet the current `Product.image_urls`/image-URL response flow does not expose or use it for cards.
- `apps/web/src/components/catalog/ProductCard.tsx:122-151` deliberately sets `next/image` to `unoptimized` for signed object URLs because the Next server cannot reach the browser-facing MinIO host. This preserves correctness but bypasses Next image optimization for every private catalog image.
- `apps/api/src/prosell/core/config.py:278-281` defines `do_cdn_endpoint`, but no production source reads it; `DOSpacesService.upload_file()` also sends no object cache-control metadata. CDN/cache behavior is consequently not implemented or verifiable from the application path.
- Private-object authorization is intentionally defense-in-depth: image signing validates tenant-prefixed keys (`product_router.py:1214-1235` and `image_router.py:67-89`). Any batch or CDN design must retain this fail-closed tenant check and must not turn product originals public; only derived Open Graph images currently use `public-read`.

## Handoff Summary

- **Intent-relevant finding**: The active catalog currently has a two-sided N+1 path: `CatalogPage` expands visible product IDs into one React Query request each (`productImageUrlsBatch.ts:23-42`), and each API request signs every gallery key although `ProductCard` renders only the first URL (`product_router.py:1212-1235`; `ProductCard.tsx:122-151`). A batch cover-image contract should avoid both fan-outs while preserving product authorization and tenant-prefix validation.
- **Risks / follow-up**: A thumbnail solution cannot reuse the existing Open Graph JPEG indiscriminately because it is public for social crawlers. Define a private, catalog-sized derivative and an authenticated/batched signing path; verify expiry, cache headers, cache invalidation after replacement/deletion, cross-organization administrator access, legacy `attributes.image_urls` fallback, and MinIO public-versus-internal endpoint behavior. The configured `do_cdn_endpoint` is unused, so CDN behavior needs an explicit contract and executable tests rather than a configuration-only change.
