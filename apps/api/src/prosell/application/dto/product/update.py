"""Product update DTOs."""

from uuid import UUID

from pydantic import BaseModel, Field

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
