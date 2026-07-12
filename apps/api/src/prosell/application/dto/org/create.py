"""Organization creation DTO."""

from uuid import UUID

from pydantic import BaseModel, Field


class CreateOrganizationRequest(BaseModel):
    """DTO for organization creation request."""

    name: str = Field(..., min_length=1, max_length=255)
    code: str | None = Field(default=None, max_length=5)
    tenant_id: UUID
    description: str | None = None
    website: str | None = None
    phone: str | None = None
