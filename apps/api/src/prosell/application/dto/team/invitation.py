"""Team invitation DTOs."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

if TYPE_CHECKING:
    from prosell.domain.entities.team_invitation import TeamInvitation


class CreateTeamInvitationRequest(BaseModel):
    """Request DTO for creating a team invitation."""

    email: EmailStr = Field(..., description="Email address of the invitee")
    role: str = Field(default="vendor", description="Role to assign (vendor or manager)")
    expires_in_days: int = Field(default=7, ge=1, le=30, description="Days until expiration")


class TeamInvitationResponse(BaseModel):
    """Response DTO for team invitation."""

    id: UUID
    team_id: UUID
    email: str
    role: str
    expires_at: datetime
    status: str
    created_at: datetime
    days_until_expiration: int

    @classmethod
    def from_entity(cls, invitation: TeamInvitation) -> TeamInvitationResponse:
        """Create response from TeamInvitation entity."""
        return cls(
            id=invitation.id,
            team_id=invitation.team_id,
            email=invitation.email,
            role=invitation.role,
            expires_at=invitation.expires_at,
            status=invitation.status.value,
            created_at=invitation.created_at,
            days_until_expiration=invitation.days_until_expiration,
        )


class AcceptTeamInvitationRequest(BaseModel):
    """Request DTO for accepting a team invitation."""

    token: str = Field(
        ..., min_length=64, max_length=64, description="Invitation token (SHA256 hash)"
    )
