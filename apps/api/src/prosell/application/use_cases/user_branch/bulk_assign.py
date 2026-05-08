"""BulkAssignUseCase - Assign multiple users to multiple branches."""

from uuid import UUID

from prosell.application.dto.user_branch import BulkAssignRequest
from prosell.domain.exceptions.user_branch_exceptions import (
    UserBranchAlreadyAssignedError,
)
from prosell.domain.repositories.user_branch_repository import (
    AbstractUserBranchRepository,
)


class BulkAssignUseCase:
    """Bulk assign users to branches (Cartesian product)."""

    def __init__(
        self,
        user_branch_repository: AbstractUserBranchRepository,
    ) -> None:
        self.user_branch_repository = user_branch_repository

    async def execute(
        self,
        request: BulkAssignRequest,
        tenant_id: UUID,
        assigned_by: UUID,
    ) -> dict[str, int]:
        """
        Execute bulk assignment (Cartesian product of user_ids x branch_ids).

        Args:
            request: BulkAssignRequest with user_ids and branch_ids lists
            tenant_id: Tenant UUID for isolation
            assigned_by: UUID of user making the assignment

        Returns:
            Dict with "assigned_count" key
        """
        assigned_count = 0

        # Cartesian product: assign each user to each branch
        for user_id in request.user_ids:
            for branch_id in request.branch_ids:
                try:
                    # Check if already exists
                    exists = await self.user_branch_repository.exists(
                        user_id=user_id,
                        branch_id=branch_id,
                        tenant_id=tenant_id,
                    )

                    if not exists:
                        # Create assignment
                        await self.user_branch_repository.assign(
                            user_id=user_id,
                            branch_id=branch_id,
                            tenant_id=tenant_id,
                            assigned_by=assigned_by,
                        )
                        assigned_count += 1
                except UserBranchAlreadyAssignedError:
                    # Skip duplicates (idempotent)
                    pass

        return {"assigned_count": assigned_count}
