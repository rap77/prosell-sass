"""DTOs for the batch product cover-URL endpoint.

The catalog grid previously fetched one signed cover URL per visible product
via GET /api/v1/products/{id}/image-urls, signing the whole gallery even
though the card only consumes a single URL. This batch endpoint collapses
those round trips into one request and signs ONLY the selected cover
(thumbnail derivative when present, gallery-cover fallback otherwise).

Contract:
- POST /api/v1/products/image-urls:batch
- Request body: {"product_ids": [<UUID>, ...], max 100 (OQ3 hard cap).
- Response: {"covers": [{"product_id": ..., "key": ..., "url": ..., "expires_in": ...}, ...]}
- One entry per input product; products that cannot be resolved or whose
  tenant prefix fails validation are omitted (not echoed).

The signed URL uses the CDN endpoint (FR3.1, FR5.1) so the browser fetches
through the CDN and the CDN caches the response on miss.
"""

from uuid import UUID

from pydantic import BaseModel, Field

# OQ3 — explicit batch cap. Sized for typical catalog pages (≤50 per A4);
# 100 leaves headroom for filter views without enabling unbounded fan-out.
BATCH_COVER_URLS_MAX_PRODUCTS: int = 100


class BatchProductCoverUrlsRequest(BaseModel):
    """Request body for POST /api/v1/products/image-urls:batch."""

    # OQ3 — bounded list, server-side validated against the cap so a
    # caller that bypasses the schema check still gets the same error.
    product_ids: list[UUID] = Field(
        ...,
        min_length=1,
        max_length=BATCH_COVER_URLS_MAX_PRODUCTS,
        description=(
            f"Product IDs to sign cover URLs for (max {BATCH_COVER_URLS_MAX_PRODUCTS} per request)."
        ),
    )


class BatchProductCoverUrlItem(BaseModel):
    """Single signed cover URL in the batch response.

    `key` is the bare storage key the URL was signed against (NOT the
    signed URL — the URL embeds an expiring query string and must never
    be persisted). `url` is the time-limited signed CDN URL.
    """

    product_id: UUID
    key: str  # bare storage key (e.g. orgs/<tenant>/products/<id>-thumb.webp)
    url: str  # signed CDN URL
    expires_in: int  # seconds, mirrors the signed URL's expiration window


class BatchProductCoverUrlsResponse(BaseModel):
    """Response body for POST /api/v1/products/image-urls:batch.

    `covers` is the order-preserving list of products the backend
    successfully resolved AND signed. Products that were not found or
    whose tenant prefix failed validation are omitted (a 200 with a
    smaller list is friendlier to the catalog grid than a 4xx that
    requires partial-failure handling on the frontend).
    """

    covers: list[BatchProductCoverUrlItem]
    batch_size: int  # echoes the requested list size (NFR4.1)
