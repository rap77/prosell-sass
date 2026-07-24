"""Team creation DTOs."""

from uuid import UUID

from pydantic import BaseModel, Field


class CreateTeamRequest(BaseModel):
    """DTO for team creation request."""

    name: str = Field(..., min_length=1, max_length=255)
    org_id: UUID
    tenant_id: UUID
    description: str | None = None
    parent_team_id: UUID | None = None


class AddTeamMemberRequest(BaseModel):
    """DTO for adding a member to team."""

    team_id: UUID
    user_id: UUID
    tenant_id: UUID | None = None  # Optional - backend derives from current_user if not provided
    role: str = Field(default="vendor", pattern="^(manager|vendor)$")
    commission_rate: float | None = Field(default=None, ge=0, le=100)
