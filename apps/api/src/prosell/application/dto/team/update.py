"""Team update DTOs."""

from pydantic import BaseModel, Field


class UpdateTeamRequest(BaseModel):
    """DTO for team update request."""

    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None


class UpdateTeamMemberRequest(BaseModel):
    """DTO for updating team member."""

    role: str | None = Field(None, pattern="^(manager|vendor)$")
    commission_rate: float | None = Field(None, ge=0, le=100)
