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
    """

    url: str  # Presigned URL of the optimized image (1h expiry, do not persist)
    key: str  # Raw storage path; persist this into product.image_urls
