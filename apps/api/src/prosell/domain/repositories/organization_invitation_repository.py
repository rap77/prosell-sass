"""Organization invitation repository interface."""

from abc import ABC, abstractmethod
from uuid import UUID

from prosell.domain.entities.organization_invitation import OrganizationInvitation


class AbstractOrganizationInvitationRepository(ABC):
    """Repository interface for OrganizationInvitation entities."""

    @abstractmethod
    async def create(self, invitation: OrganizationInvitation) -> OrganizationInvitation:
        """Create a new organization invitation."""

    @abstractmethod
    async def get_by_id(
        self, invitation_id: UUID, tenant_id: UUID
    ) -> OrganizationInvitation | None:
        """Get invitation by ID (with tenant isolation)."""

    @abstractmethod
    async def get_by_token(self, token: str, tenant_id: UUID) -> OrganizationInvitation | None:
        """Get invitation by token (with tenant isolation)."""

    @abstractmethod
    async def get_by_token_unscoped(self, token: str) -> OrganizationInvitation | None:
        """Get invitation by token with NO tenant filter.

        Used only by the public accept-invitation flow (Task 10), where the
        caller does not yet know which tenant the token belongs to — that's
        precisely what this lookup determines, before any tenant-scoped
        work can happen.
        """

    @abstractmethod
    async def get_pending_by_org_and_email(
        self, organization_id: UUID, email: str, tenant_id: UUID
    ) -> OrganizationInvitation | None:
        """Get the pending invitation for an org+email pair, if any."""

    @abstractmethod
    async def update(self, invitation: OrganizationInvitation) -> OrganizationInvitation:
        """Update an existing invitation."""

    @abstractmethod
    async def count(self, tenant_id: UUID | None = None) -> int:
        """Count total invitations."""
