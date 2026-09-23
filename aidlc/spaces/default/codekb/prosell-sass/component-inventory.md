# Component Inventory

## Backend

### ProductImageSigningEndpoint

`apps/api/src/prosell/infrastructure/api/routers/product_router.py`

Authorizes product access, validates tenant-scoped image keys, and creates signed URLs. Depends on request identity, product access rules, and `IDOSpacesService`.

### ImageUploadEndpoint

`apps/api/src/prosell/infrastructure/api/routers/image_router.py`

Accepts image uploads, coordinates optimization, and persists derivatives. Depends on image validation/optimization and object storage.

### IDOSpacesService

`apps/api/src/prosell/infrastructure/services/do_spaces_service.py`

Implements S3-compatible storage access, upload, and presigned URLs for MinIO/DigitalOcean Spaces.

### ProductImage

`apps/api/src/prosell/domain/entities/product_image.py`

Legacy image model that includes `thumbnail_url`; its thumbnail capability is not integrated with the active `Product.image_urls` cover-card flow.

## Frontend

### CatalogPage

`apps/web/src/app/(seller)/catalog/page.tsx`

Owns catalog-page composition and visible product data. Depends on catalog API/query hooks and `ProductCard` rendering.

### ProductImageUrlsBatch

`apps/web/src/lib/api/productImageUrlsBatch.ts`

Maps visible products to React Query calls for image URLs. It centralizes card data loading but does not batch network requests.

### ProductCard

`apps/web/src/components/catalog/ProductCard.tsx`

Renders catalog inventory including the first image URL. Uses `next/image` in `unoptimized` mode for browser-reachable signed object URLs.

## Supporting Infrastructure

### ObjectStorage

MinIO in local environments and DigitalOcean Spaces in deployment hold private product originals and public OG derivatives.

### CDNConfiguration

`do_cdn_endpoint` is configured in backend settings but is not consumed by the production upload/signing path.
