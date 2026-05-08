"""Product creation DTOs."""

from uuid import UUID

from pydantic import BaseModel, Field

from prosell.domain.value_objects.product_condition import ProductCondition


class CreateProductRequest(BaseModel):
    """DTO for product creation request."""

    title: str = Field(..., min_length=1, max_length=500)
    price_cents: int = Field(..., ge=0)
    tenant_id: UUID | None = None
    organization_id: UUID | None = None
    category_id: UUID
    slug: str | None = None
    description: str | None = None
    currency: str = Field(default="USD", min_length=3, max_length=3)
    condition: ProductCondition = ProductCondition.USED
    attributes: dict[str, object] = Field(default_factory=dict)
    location_city: str | None = None
    location_state: str | None = None
    location_zip: str | None = None
