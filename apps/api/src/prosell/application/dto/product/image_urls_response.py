"""Product image URLs response DTOs."""

from uuid import UUID

from pydantic import BaseModel


class ProductImageUrlResponse(BaseModel):
    """A single signed image URL."""

    key: str  # relative path like orgs/tenant/products/uuid/img1.jpg
    url: str  # signed URL
    expires_in: int = 3600


class ProductImageUrlsResponse(BaseModel):
    """Response with signed URLs for all product images."""

    product_id: UUID
    images: list[ProductImageUrlResponse]
    cover_image_key: str | None = None  # ponytail: for edit mode cover restoration
