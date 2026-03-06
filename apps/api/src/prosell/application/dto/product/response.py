"""Product response DTOs."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from prosell.domain.entities.product import Product


class ProductResponse(BaseModel):
    """DTO for product responses."""

    id: UUID
    tenant_id: UUID
    organization_id: UUID
    category_id: UUID
    title: str
    slug: str | None = None
    description: str | None = None
    price_cents: int
    currency: str
    condition: str
    status: str
    attributes: dict[str, object] = {}
    location_city: str | None = None
    location_state: str | None = None
    location_zip: str | None = None
    is_featured: bool
    view_count: int
    favorite_count: int
    submitted_for_approval_at: datetime | None = None
    submitted_by: UUID | None = None
    approved_at: datetime | None = None
    approved_by: UUID | None = None
    rejection_reason: str | None = None
    published_at: datetime | None = None
    sold_at: datetime | None = None
    archived_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    @property
    def price_dollars(self) -> float:
        """Get price in dollars."""
        return self.price_cents / 100

    @classmethod
    def from_entity(cls, product: Product) -> "ProductResponse":
        """Build response from domain entity."""
        return cls(
            id=product.id,
            tenant_id=product.tenant_id,
            organization_id=product.organization_id,
            category_id=product.category_id,
            title=product.title,
            slug=product.slug,
            description=product.description,
            price_cents=product.price_cents,
            currency=product.currency,
            condition=product.condition.value,
            status=product.status.value,
            attributes=product.attributes,
            location_city=product.location_city,
            location_state=product.location_state,
            location_zip=product.location_zip,
            is_featured=product.is_featured,
            view_count=product.view_count,
            favorite_count=product.favorite_count,
            submitted_for_approval_at=product.submitted_for_approval_at,
            submitted_by=product.submitted_by,
            approved_at=product.approved_at,
            approved_by=product.approved_by,
            rejection_reason=product.rejection_reason,
            published_at=product.published_at,
            sold_at=product.sold_at,
            archived_at=product.archived_at,
            created_at=product.created_at,
            updated_at=product.updated_at,
        )


class ProductListResponse(BaseModel):
    """DTO for paginated product list."""

    products: list[ProductResponse]
    total: int
    skip: int
    limit: int
