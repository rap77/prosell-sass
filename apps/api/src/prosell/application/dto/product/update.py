"""Product update DTOs."""

from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from prosell.application.dto.product.create import _validate_image_urls_format
from prosell.domain.value_objects.product_condition import ProductCondition


class UpdateProductRequest(BaseModel):
    """DTO for product update request."""

    title: str | None = Field(None, min_length=1, max_length=500)
    description: str | None = None
    price_cents: int | None = Field(None, ge=0)
    category_id: UUID | None = None
    condition: ProductCondition | None = None
    attributes: dict[str, object] | None = None
    image_urls: list[str] | None = None
    location_city: str | None = None
    location_state: str | None = None
    location_zip: str | None = None

    # Reuse the format validator from create.py. None means
    # "do not change this field" (PATCH semantics); an empty list means
    # "clear all image_urls".
    _validate_image_urls = field_validator("image_urls")(_validate_image_urls_format)
