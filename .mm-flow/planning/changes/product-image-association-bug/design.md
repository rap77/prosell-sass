# Design — Product Image Association Bug

**Objective slug:** `product-image-association-bug`
**Date:** 2026-06-03
**Status:** design approved (pending user sign-off)

## Architectural decision

**Single source of truth:** `products.image_urls` (top-level JSONB column) is the canonical location for image associations.

**Legacy `product_images` table:** dropped. It has 0 rows in production and is referenced by nothing (only the SQLAlchemy model + the FK from `\d products`).

**Why this design:**
- The signed-URL endpoint `GET /api/v1/products/{id}/image-urls` already reads from `products.image_urls` — that's the contract the frontend depends on
- The legacy table is dead weight (0 rows, no write paths, no read paths)
- Nested JSONB in `attributes` was a temporary escape hatch that became permanent by accident; the right move is to extract it to its proper column

## Data flow (target state)

```
┌─────────────────────────────────────────────────────────────────────┐
│ FRONTEND (create/page.tsx, edit pages)                              │
│ POST/PATCH body: { ..., image_urls: ["url1", "url2"] }  ← top-level│
└──────────────────────┬──────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│ BACKEND DTO (CreateProductRequest, UpdateProductRequest)            │
│   image_urls: list[str] = []   ← accepted at top level              │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│ USE CASE (create_product.py, update_product.py, bulk_upload)        │
│   Pass image_urls to Product.create() / existing.image_urls = ...  │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│ ENTITY (Product)                                                    │
│   image_urls: list[str] = Field(default_factory=list)  ← already    │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│ REPOSITORY / ORM (ProductModel)                                     │
│   image_urls: Mapped[list[str] | None] = mapped_column(JSONB)  ← OK│
└──────────────────────┬──────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│ DB: products.image_urls (JSONB, NOT NULL, DEFAULT '[]'::jsonb)      │
│   Read by: GET /api/v1/products/{id}/image-urls  ✓                  │
└─────────────────────────────────────────────────────────────────────┘
```

## Changes per layer

### Backend

1. **`apps/api/src/prosell/application/dto/product/create.py`**
   - Add `image_urls: list[str] = []` to `CreateProductRequest`

2. **`apps/api/src/prosell/application/dto/product/update.py`**
   - Add `image_urls: list[str] | None = None` to `UpdateProductRequest`

3. **`apps/api/src/prosell/application/use_cases/product/create_product.py`**
   - Pass `image_urls=request.image_urls` to `Product.create(...)`

4. **`apps/api/src/prosell/application/use_cases/product/update_product.py`** (if exists, else check `product_router.py:274`)
   - When `request.image_urls is not None`, assign `existing.image_urls = request.image_urls`

5. **`apps/api/src/prosell/application/use_cases/product/bulk_upload_vehicles.py`**
   - Implement the TODO at line 286: persist images to `image_urls` top-level
   - Drop the references to `product_images` table

### Frontend

6. **`apps/web/src/app/(seller)/catalog/create/page.tsx`**
   - Line 59: move `image_urls: uploadedUrls` from inside `attributes` to top-level of the body

7. **Other product forms** (search with `rg` for `image_urls` in `apps/web/src/`)
   - Apply the same top-level migration

### Migrations (Alembic)

8. **New migration `backfill_product_image_urls.py`**
   ```sql
   UPDATE products
   SET image_urls = COALESCE(attributes->'image_urls', '[]'::jsonb)
   WHERE attributes ? 'image_urls'
     AND (image_urls IS NULL OR image_urls = '[]'::jsonb);
   ```

9. **New migration `drop_product_images_table.py`**
   ```python
   op.drop_table('product_images')
   ```
   - Pre-flight: `rg "product_images|ProductImage" apps/ tests/` must show only the model + FK references
   - If anything else uses it, abort and re-evaluate

## Tests (TDD)

### RED — failing tests first

1. **`tests/integration/test_create_product_image_urls.py`**
   ```python
   async def test_create_product_persists_image_urls_top_level():
       """POST /api/v1/products with image_urls should persist them to the top-level column."""
       response = await client.post("/api/v1/products", json={
           "title": "2017 Camry",
           "price_cents": 1850000,
           "category_id": cat_id,
           "image_urls": ["https://prosell-assets.atl1.digitaloceanspaces.com/orgs/x/products/y/img1.jpg"],
           "attributes": {...}
       })
       assert response.status_code == 201
       # Read back from DB, NOT from response
       product = await repo.get_by_id(response.json()["id"], tenant_id)
       assert product.image_urls == ["https://..."]
       # The bug: this assertion currently FAILS because the column is empty
   ```

2. **`tests/integration/test_get_product_image_urls.py`**
   ```python
   async def test_get_product_image_urls_returns_signed_urls():
       """GET /api/v1/products/{id}/image-urls should return signed URLs for each image."""
       # Seed product with image_urls
       # Call endpoint
       # Assert response has 1+ signed URLs (URLs containing X-Amz-Signature)
   ```

3. **`tests/integration/test_bulk_upload_image_urls.py`**
   ```python
   async def test_bulk_upload_persists_image_urls():
       """CSV + ZIP bulk upload should persist images to product.image_urls top-level."""
       # Run bulk upload
       # Assert product.image_urls is non-empty
       # Assert NOT in attributes
   ```

### GREEN — minimum code to pass

(Changes listed above in "Changes per layer")

### REFACTOR

- Clean up imports
- Ensure consistent error messages
- Add docstrings explaining the data flow

## Deploy sequence

1. **Local:** all tests green, including 3 new ones
2. **Staging:** deploy via `/mm:ship` — manual drag-and-drop smoke test in `/catalog/create`
3. **Prod window:**
   - Pull latest image
   - `docker compose -f docker/docker-compose.prod.yml up -d --force-recreate api web`
   - Run migrations via `docker exec prosell-prod-api alembic upgrade head` (backfill + drop)
   - Verify health: `curl https://api.prosellweb.com/api/v1/health`
   - Manual smoke test on a real product
4. **Archive:** `/mm:archive-objective`

## Risks & mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Frontend has more places sending `image_urls` nested | medium | `rg` sweep before TDD GREEN, update all |
| Bulk upload uses different code path | high | Cover with dedicated test (T3 third test) |
| Data migration fails on a row | low | Wrap in TX, validate row count before/after |
| Drop `product_images` breaks unknown consumer | low | Pre-flight `rg` sweep + check FK references |
| Production deploy timing | medium | Maintenance window agreed with user |

## What is explicitly NOT changing

- `next.config.ts` `remotePatterns` — already correct (`atl1.digitaloceanspaces.com` allowed, matches `DO_REGION=atl1`)
- DO Spaces credentials — already correct in `.env.prod`
- `DOSpacesService` — already supports `generate_download_url` correctly
- `useProductImageUrls` hook — already correct (retry:1, 5min staleTime, dedupes by productId)
- The `attributes` JSONB structure for other fields — only `image_urls` is moving out
