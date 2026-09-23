# API Documentation

## External HTTP Boundaries

### Product image URL signing

`GET /api/v1/products/{product_id}/image-urls`

- **Owner:** `product_router.py`.
- **Purpose:** returns signed URLs for a product's image keys.
- **Authorization:** verifies access to the product before signing.
- **Security:** validates every key against the authorized tenant namespace; invalid or cross-tenant keys fail closed.
- **Current performance shape:** one request per visible product from the catalog and one signing operation per image in that product gallery.
- **Current consumer:** `ProductCard` uses only `images[0].url`.

### Image upload

`POST /api/v1/images/upload`

- **Owner:** `image_router.py`.
- **Purpose:** optimized upload path for product images.
- **Current derivatives:** private full-size WebP and public Open Graph JPEG.
- **Gap:** no private catalog-thumbnail derivative is created or returned through the current catalog-cover path.

### Legacy image endpoints

`image_router.py` also contains presigned-upload and status endpoints retained for legacy flows. New cover-image work must account for existing product image metadata and the `attributes.image_urls` fallback.

## Next.js BFF Boundary

Routes under `apps/web/src/app/api/` proxy authenticated browser requests to FastAPI. The BFF is an integration boundary, not an authorization replacement; backend tenant checks remain authoritative.

## Internal Service Boundary

### `IDOSpacesService`

The storage port/implementation provides S3-compatible uploads and signed URL generation. It is backed by MinIO in local environments and DigitalOcean Spaces in deployment. Existing upload behavior does not apply object cache-control metadata.

## Contract Requirements for the Proposed Direction

The current scan does not prescribe a new path or response schema. Any new batch cover-image contract must explicitly define:

- input product identifiers and per-product authorization result;
- absent-cover behavior;
- tenant-key validation before signing;
- signed URL expiry and cache semantics;
- replacement/deletion invalidation;
- legacy image-key fallback;
- cross-organization administrator behavior.
