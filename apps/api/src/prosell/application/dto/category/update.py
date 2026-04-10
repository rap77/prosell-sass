"""Category update DTOs."""

from typing import Any

from pydantic import BaseModel, Field


class UpdateCategoryRequest(BaseModel):
    """DTO for category update request (all fields optional)."""

    name: str | None = None
    slug: str | None = None
    description: str | None = None
    icon: str | None = None
    image_url: str | None = None
    is_active: bool | None = None
    sort_order: int | None = Field(default=None, ge=0)


class UpdateAttributeSchemaRequest(BaseModel):
    """DTO for replacing a category's attribute_schema."""

    attribute_schema: dict[str, Any]
