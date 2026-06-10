"""Category response DTOs."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel

from prosell.domain.entities.category import Category


class CategoryResponse(BaseModel):
    """DTO for category responses."""

    id: UUID
    # Nullable: GLOBAL category templates (root verticals shared across orgs,
    # Plan 2) have tenant_id=NULL. Tenant-scoped categories carry their id.
    tenant_id: UUID | None = None
    name: str
    slug: str
    parent_id: UUID | None = None
    level: int
    icon: str | None = None
    description: str | None = None
    image_url: str | None = None
    sort_order: int
    is_active: bool
    field_config: list[dict[str, object]] = []
    attribute_schema: dict[str, Any] = {}
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_entity(cls, category: Category) -> "CategoryResponse":
        """Build response from domain entity."""
        return cls(
            id=category.id,
            tenant_id=category.tenant_id,
            name=category.name,
            slug=category.slug,
            parent_id=category.parent_id,
            level=category.level,
            icon=category.icon,
            description=category.description,
            image_url=category.image_url,
            sort_order=category.sort_order,
            is_active=category.is_active,
            field_config=category.field_config,
            attribute_schema=category.attribute_schema or {},
            created_at=category.created_at,
            updated_at=category.updated_at,
        )


class CategoryListResponse(BaseModel):
    """DTO for paginated category list."""

    categories: list[CategoryResponse]
    total: int
    skip: int
    limit: int
