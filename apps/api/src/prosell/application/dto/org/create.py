"""Organization creation DTO."""

from pydantic import BaseModel, Field


class CreateOrganizationRequest(BaseModel):
    """DTO for organization creation request.

    tenant_id is intentionally absent — it must come from the
    authenticated session in the route layer, never from the client.
    """

    name: str = Field(..., min_length=1, max_length=255)
    code: str | None = Field(default=None, max_length=5)
    color: str | None = Field(default=None, max_length=7)
    description: str | None = None
    website: str | None = None
    phone: str | None = None
