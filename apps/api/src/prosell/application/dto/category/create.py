"""Category creation DTO."""

from typing import Any, cast
from uuid import UUID

from pydantic import BaseModel, Field


class CreateCategoryRequest(BaseModel):
    """DTO for category creation request."""

    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=255)
    tenant_id: UUID
    parent_id: UUID | None = None
    description: str | None = None
    icon: str | None = None
    image_url: str | None = None
    sort_order: int = Field(default=0, ge=0)
    is_active: bool = Field(default=True)
    field_config: list[dict[str, Any]] = Field(
        default_factory=lambda: cast(list[dict[str, Any]], [])
    )
    attribute_schema: dict[str, Any] = Field(default_factory=dict)
