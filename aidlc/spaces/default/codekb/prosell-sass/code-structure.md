# Code Structure

## Repository Layout

```text
apps/
  api/                         FastAPI service
    src/prosell/
      domain/                  entities, value objects, ports
      application/             use cases and DTOs
      infrastructure/          routers, models, storage, tasks
    tests/                     unit, integration, contract tests
  web/                         Next.js App Router application
    src/app/                   pages and BFF routes
    src/components/            catalog, form, admin, UI components
    src/lib/api/               schemas, API clients, query hooks
    tests/                     app, component, unit, E2E tests
.github/workflows/             CI, deployment, E2E, recovery workflows
```

## Image-Path Modules

- `apps/web/src/app/(seller)/catalog/page.tsx` — loads and displays paginated catalog inventory.
- `apps/web/src/lib/api/productImageUrlsBatch.ts` — consolidates image fetching above cards but still creates one query/request per visible product.
- `apps/web/src/components/catalog/ProductCard.tsx` — displays the first returned URL and sets `next/image` to `unoptimized` for signed storage URLs.
- `apps/api/src/prosell/infrastructure/api/routers/product_router.py` — authorizes product access, validates image object keys, and signs gallery URLs.
- `apps/api/src/prosell/infrastructure/api/routers/image_router.py` — provides image upload endpoints and creates current derivatives.
- `apps/api/src/prosell/infrastructure/services/do_spaces_service.py` — S3-compatible upload and signing implementation.
- `apps/api/src/prosell/domain/entities/product_image.py` — legacy image entity with a `thumbnail_url` capability not used by the current product-image response flow.
- `apps/api/src/prosell/core/config.py` — holds the unused `do_cdn_endpoint` configuration.

## Code Patterns

- Python uses strict typing, async database access, ports/adapters, and dependency injection.
- TypeScript uses Zod validation at API boundaries, React Query for server state, and typed components.
- BFF routes forward authenticated browser calls to FastAPI.
- Tests are organized by behavior and boundary: pytest for API/domain/storage paths, Vitest/Testing Library for frontend behavior, and Playwright for browser flows.

## Relevant File Classification

| Area              | Classification                | Concern                                                |
| ----------------- | ----------------------------- | ------------------------------------------------------ |
| Product router    | Infrastructure HTTP adapter   | Access control and signed URL response contract        |
| Image router      | Infrastructure HTTP adapter   | Upload validation and derivative lifecycle             |
| DO Spaces service | Infrastructure adapter        | Object upload metadata and presigned URLs              |
| Batch hook        | Frontend server-state adapter | Request fan-out for visible catalog products           |
| Product card      | Presentation component        | Cover-only rendering and image optimization constraint |
