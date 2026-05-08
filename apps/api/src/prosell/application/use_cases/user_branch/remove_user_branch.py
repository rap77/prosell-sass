"""RemoveUserBranchUseCase - Remove a user-branch assignment."""

from uuid import UUID

from prosell.domain.repositories.user_branch_repository import (
    AbstractUserBranchRepository,
)


class RemoveUserBranchUseCase:
    """Remove a user-branch assignment."""

    def __init__(
        self,
        user_branch_repository: AbstractUserBranchRepository,
    ) -> None:
        self.user_branch_repository = user_branch_repository

    async def execute(
        self,
        user_id: UUID,
        branch_id: UUID,
        tenant_id: UUID,
    ) -> None:
        """
        Remove user-branch assignment.

        Args:
            user_id: User UUID
            branch_id: Branch UUID
            tenant_id: Tenant UUID for isolation

        Returns:
            None (204 No Content in API)
        """
        await self.user_branch_repository.remove(
            user_id=user_id,
            branch_id=branch_id,
            tenant_id=tenant_id,
        )
