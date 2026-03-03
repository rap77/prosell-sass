"""Organization update DTO."""

from pydantic import BaseModel, Field


class UpdateOrganizationRequest(BaseModel):
    """DTO for organization update request (all fields optional)."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    website: str | None = None
    phone: str | None = None
    logo_url: str | None = None
    banner_url: str | None = None
    settings: dict[str, object] | None = None
