"""Image upload DTOs."""

from pydantic import BaseModel


class ImageUploadUrlRequest(BaseModel):
    """Request to generate a presigned URL for image upload."""

    content_type: str = "image/jpeg"
    filename: str | None = None  # Optional original filename for better storage paths


class ImageUploadUrlResponse(BaseModel):
    """Response with presigned URL and metadata."""

    upload_url: str
    public_url: str
    key: str
    file_id: str = ""


class ImageUploadResponse(BaseModel):
    """Response for direct image upload with optimization.

    IMPORTANT: `key` is the raw storage path (e.g.
    `orgs/{tenant_id}/vehicles/{uuid}.jpg`). Callers MUST persist `key`
    into any persistent field that names a storage object (e.g.
    `product.image_urls`). The `url` is a presigned URL that expires in
    1 hour and MUST NOT be stored — it is provided only for the browser
    to preview the just-uploaded object during the current session.

    `thumbnail_key` follows the same rule: persist it into
    `product.thumbnail_image_key` if this image is being associated
    with a product. The thumbnail derivative is a private 600x600
    WebP object (no public-read ACL); the catalog grid signs it on
    demand. `thumbnail_url` is a 1h presigned URL intended only for
    immediate preview, never for persistence.
    """

    url: str  # Presigned URL of the optimized image (1h expiry, do not persist)
    key: str  # Raw storage path; persist this into product.image_urls
    thumbnail_url: str | None = None  # Presigned URL of the 600x600 thumbnail (do not persist)
    thumbnail_key: str | None = None  # Storage path; persist into product.thumbnail_image_key
