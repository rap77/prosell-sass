"""UserDealer repository interfaces."""

from abc import ABC, abstractmethod
from uuid import UUID

from prosell.domain.entities.user_dealer import UserDealer


class AbstractUserDealerRepository(ABC):
    """Repository interface for UserDealer M:N relationship."""

    @abstractmethod
    async def assign(
        self,
        user_id: UUID,
        dealer_id: UUID,
        tenant_id: UUID,
        assigned_by: UUID | None = None,
    ) -> UserDealer:
        """Create a new user-dealer assignment."""
        pass

    @abstractmethod
    async def remove(
        self,
        user_id: UUID,
        dealer_id: UUID,
        tenant_id: UUID,
    ) -> bool:
        """Remove a user-dealer assignment."""
        pass

    @abstractmethod
    async def get_user_dealer_ids(
        self,
        user_id: UUID,
        tenant_id: UUID,
    ) -> list[UUID]:
        """Get all dealer IDs for a user."""
        pass

    @abstractmethod
    async def get_dealer_users(
        self,
        dealer_id: UUID,
        tenant_id: UUID,
    ) -> list[UUID]:
        """Get all user IDs for a dealer (reverse lookup)."""
        pass

    @abstractmethod
    async def exists(
        self,
        user_id: UUID,
        dealer_id: UUID,
        tenant_id: UUID,
    ) -> bool:
        """Check if assignment exists."""
        pass

    @abstractmethod
    async def get_assignment(
        self,
        user_id: UUID,
        dealer_id: UUID,
        tenant_id: UUID,
    ) -> UserDealer | None:
        """Get specific assignment record."""
        pass
