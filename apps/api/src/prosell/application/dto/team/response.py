"""Team response DTOs."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from prosell.domain.entities.team import Team, TeamMember


class TeamMemberResponse(BaseModel):
    """DTO for team member responses."""

    id: UUID
    team_id: UUID
    user_id: UUID
    role: str
    commission_rate: float | None = None
    tenant_id: UUID
    joined_at: datetime
    updated_at: datetime

    @classmethod
    def from_entity(cls, member: TeamMember) -> "TeamMemberResponse":
        """Build response from domain entity."""
        return cls(
            id=member.id,
            team_id=member.team_id,
            user_id=member.user_id,
            role=member.role.value,
            commission_rate=member.commission_rate,
            tenant_id=member.tenant_id,
            joined_at=member.joined_at,
            updated_at=member.updated_at,
        )


class TeamResponse(BaseModel):
    """DTO for team responses."""

    id: UUID
    name: str
    tenant_id: UUID
    org_id: UUID
    description: str | None = None
    parent_team_id: UUID | None = None
    created_at: datetime
    updated_at: datetime
    manager_count: int = 0
    vendor_count: int = 0
    members: list[TeamMemberResponse] = []

    @classmethod
    def from_entity(cls, team: Team) -> "TeamResponse":
        """Build response from domain entity."""
        return cls(
            id=team.id,
            name=team.name,
            tenant_id=team.tenant_id,
            org_id=team.org_id,
            description=team.description,
            parent_team_id=team.parent_team_id,
            created_at=team.created_at,
            updated_at=team.updated_at,
            manager_count=team.manager_count,
            vendor_count=team.vendor_count,
            members=[TeamMemberResponse.from_entity(m) for m in (team.members or [])],
        )


class TeamListResponse(BaseModel):
    """DTO for paginated team list."""

    teams: list[TeamResponse]
    total: int
    skip: int
    limit: int
