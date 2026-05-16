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
    """Response for direct image upload with optimization."""

    url: str  # Public URL of the optimized image

