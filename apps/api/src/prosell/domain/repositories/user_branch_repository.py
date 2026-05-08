"""UserBranch repository interfaces."""

from abc import ABC, abstractmethod
from uuid import UUID

from prosell.domain.entities.user_branch import UserBranch


class AbstractUserBranchRepository(ABC):
    """Repository interface for UserBranch M:N relationship."""

    @abstractmethod
    async def assign(
        self,
        user_id: UUID,
        branch_id: UUID,
        tenant_id: UUID,
        assigned_by: UUID | None = None,
    ) -> UserBranch:
        """Create a new user-branch assignment."""
        pass

    @abstractmethod
    async def remove(
        self,
        user_id: UUID,
        branch_id: UUID,
        tenant_id: UUID,
    ) -> bool:
        """Remove a user-branch assignment."""
        pass

    @abstractmethod
    async def get_user_branch_ids(
        self,
        user_id: UUID,
        tenant_id: UUID,
    ) -> list[UUID]:
        """Get all branch IDs for a user."""
        pass

    @abstractmethod
    async def get_branch_users(
        self,
        branch_id: UUID,
        tenant_id: UUID,
    ) -> list[UUID]:
        """Get all user IDs for a branch (reverse lookup)."""
        pass

    @abstractmethod
    async def exists(
        self,
        user_id: UUID,
        branch_id: UUID,
        tenant_id: UUID,
    ) -> bool:
        """Check if assignment exists."""
        pass

    @abstractmethod
    async def get_assignment(
        self,
        user_id: UUID,
        branch_id: UUID,
        tenant_id: UUID,
    ) -> UserBranch | None:
        """Get specific assignment record."""
        pass
