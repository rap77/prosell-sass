"""DTOs for the publisher flow — PUBLISH-01."""

import typing
from uuid import UUID

from pydantic import Field

from prosell.domain.base import DomainModel


class PublishProductRequest(DomainModel):
    """Input DTO for PublishVehicleUseCase.

    Validates listing content before creating the Publication record.
    Image URLs are stored as source URLs — downloading/processing happens
    in the Taskiq task context (not in the use case).
    """

    model_config: typing.ClassVar[typing.ConfigDict] = {
        "extra": "ignore"
    }  # Ignore extra fields from frontend

    product_id: UUID
    tenant_id: UUID
    facebook_page_id: UUID
    title: str = Field(..., min_length=1, max_length=500)
    description: str | None = None
    price_cents: int = Field(..., gt=0)
    zip_code: str = Field(..., min_length=5, max_length=10)
    image_urls: list[str] = Field(..., min_length=1)  # At least one image required
    hero_shot_index: int = Field(default=0, ge=0)


class PublicationResponse(DomainModel):
    """Response DTO for publication operations (publish, update, delete)."""

    id: UUID
    product_id: UUID
    status: str
    strategy_used: str | None = None
    fb_listing_id: str | None = None
    error_message: str | None = None
    error_category: str | None = None
    blocked_until_confirmed: bool = False
