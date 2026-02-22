"""Team repository interfaces."""

from abc import ABC, abstractmethod
from uuid import UUID

from prosell.domain.entities.team import Team, TeamMember


class AbstractTeamRepository(ABC):
    """Repository interface for Team entities."""

    @abstractmethod
    async def create(self, team: Team) -> Team:
        """Create a new team."""
        pass

    @abstractmethod
    async def get_by_id(self, team_id: UUID, tenant_id: UUID) -> Team | None:
        """Get team by ID (with tenant isolation)."""
        pass

    @abstractmethod
    async def get_by_org(
        self,
        org_id: UUID,
        tenant_id: UUID,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Team]:
        """Get all teams for an organization."""
        pass

    @abstractmethod
    async def get_all(
        self,
        tenant_id: UUID | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Team]:
        """Get all teams (with optional tenant filtering)."""
        pass

    @abstractmethod
    async def update(self, team: Team) -> Team:
        """Update an existing team."""
        pass

    @abstractmethod
    async def delete(self, team_id: UUID, tenant_id: UUID) -> bool:
        """Delete a team."""
        pass

    @abstractmethod
    async def exists_by_name(self, name: str, org_id: UUID, tenant_id: UUID) -> bool:
        """Check if team with given name exists in org."""
        pass

    @abstractmethod
    async def count(self, tenant_id: UUID | None = None) -> int:
        """Count total teams."""
        pass


class AbstractTeamMemberRepository(ABC):
    """Repository interface for TeamMember entities."""

    @abstractmethod
    async def create(self, member: TeamMember) -> TeamMember:
        """Create a new team member."""
        pass

    @abstractmethod
    async def get_by_id(self, member_id: UUID, tenant_id: UUID) -> TeamMember | None:
        """Get team member by ID (with tenant isolation)."""
        pass

    @abstractmethod
    async def get_by_team(
        self,
        team_id: UUID,
        tenant_id: UUID,
        skip: int = 0,
        limit: int = 100,
    ) -> list[TeamMember]:
        """Get all members for a team."""
        pass

    @abstractmethod
    async def get_by_user(
        self,
        user_id: UUID,
        tenant_id: UUID,
    ) -> list[TeamMember]:
        """Get all team memberships for a user."""
        pass

    @abstractmethod
    async def update(self, member: TeamMember) -> TeamMember:
        """Update an existing team member."""
        pass

    @abstractmethod
    async def delete(self, member_id: UUID, tenant_id: UUID) -> bool:
        """Delete a team member."""
        pass

    @abstractmethod
    async def remove_from_team(self, team_id: UUID, user_id: UUID, tenant_id: UUID) -> bool:
        """Remove a user from a team."""
        pass

    @abstractmethod
    async def count(self, tenant_id: UUID | None = None) -> int:
        """Count total team members."""
        pass
