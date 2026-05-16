"""Team invitation repository interface."""

from abc import ABC, abstractmethod
from uuid import UUID

from prosell.domain.entities.team_invitation import TeamInvitation


class AbstractTeamInvitationRepository(ABC):
    """Repository interface for TeamInvitation entities."""

    @abstractmethod
    async def create(self, invitation: TeamInvitation) -> TeamInvitation:
        """Create a new team invitation."""
        pass

    @abstractmethod
    async def get_by_id(self, invitation_id: UUID, tenant_id: UUID) -> TeamInvitation | None:
        """Get invitation by ID (with tenant isolation)."""
        pass

    @abstractmethod
    async def get_by_token(self, token: str, tenant_id: UUID) -> TeamInvitation | None:
        """Get invitation by token (with tenant isolation)."""
        pass

    @abstractmethod
    async def get_by_team(
        self,
        team_id: UUID,
        tenant_id: UUID,
        skip: int = 0,
        limit: int = 100,
    ) -> list[TeamInvitation]:
        """Get all invitations for a team."""
        pass

    @abstractmethod
    async def get_by_email(
        self,
        email: str,
        tenant_id: UUID,
        skip: int = 0,
        limit: int = 100,
    ) -> list[TeamInvitation]:
        """Get all invitations for an email address."""
        pass

    @abstractmethod
    async def get_pending_by_team_and_email(
        self,
        team_id: UUID,
        email: str,
        tenant_id: UUID,
    ) -> TeamInvitation | None:
        """Get pending invitation for team and email."""
        pass

    @abstractmethod
    async def update(self, invitation: TeamInvitation) -> TeamInvitation:
        """Update an existing invitation."""
        pass

    @abstractmethod
    async def delete(self, invitation_id: UUID, tenant_id: UUID) -> bool:
        """Delete an invitation."""
        pass

    @abstractmethod
    async def count(self, tenant_id: UUID | None = None) -> int:
        """Count total invitations."""
        pass
