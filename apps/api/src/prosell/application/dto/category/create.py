"""Category creation DTO."""

import re
from typing import Any, cast
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

_SLUG_RE = re.compile(r"^[a-z0-9]+(?:[_-][a-z0-9]+)*$")


class CreateCategoryRequest(BaseModel):
    """DTO for category creation request."""

    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=255)

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, v: str) -> str:
        """Validate slug format: lowercase letters, numbers, hyphens, underscores only."""
        normalized = v.lower().strip()
        if not _SLUG_RE.match(normalized):
            raise ValueError(
                "slug must contain only lowercase letters, numbers, hyphens and underscores"
            )
        return normalized

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
