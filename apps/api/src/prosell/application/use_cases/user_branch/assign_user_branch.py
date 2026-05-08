"""AssignUserBranch use case - Assign a branch to a user with audit trail."""

from uuid import UUID

from prosell.application.dto.user_branch import (
    AssignBranchRequest,
    UserBranchResponse,
)
from prosell.domain.entities.user_branch import UserBranch
from prosell.domain.exceptions.branch_exceptions import BranchNotFoundError
from prosell.domain.repositories.branch_repository import AbstractBranchRepository
from prosell.domain.repositories.user_branch_repository import (
    AbstractUserBranchRepository,
)


class AssignUserBranchUseCase:
    """Assign a branch to a user with audit trail."""

    def __init__(
        self,
        user_branch_repository: AbstractUserBranchRepository,
        branch_repository: AbstractBranchRepository,
    ) -> None:
        self.user_branch_repository = user_branch_repository
        self.branch_repository = branch_repository

    async def execute(
        self,
        user_id: UUID,
        request: AssignBranchRequest,
        tenant_id: UUID,
        assigned_by: UUID,
    ) -> UserBranchResponse:
        """
        Execute user-branch assignment.

        Args:
            user_id: User UUID to assign branch to
            request: AssignBranchRequest with branch_id
            tenant_id: Tenant UUID for isolation
            assigned_by: UUID of user making the assignment (audit trail)

        Returns:
            UserBranchResponse DTO

        Raises:
            BranchNotFoundError: If branch does not exist
        """
        # 1. Validate branch exists
        branch = await self.branch_repository.get_by_id(
            branch_id=request.branch_id,
            tenant_id=tenant_id,
        )
        if not branch:
            raise BranchNotFoundError(branch_id=request.branch_id)

        # 2. Check for duplicate assignment
        exists = await self.user_branch_repository.exists(
            user_id=user_id,
            branch_id=request.branch_id,
            tenant_id=tenant_id,
        )
        if exists:
            from prosell.domain.exceptions.user_branch_exceptions import (
                UserBranchAlreadyAssignedError,
            )

            raise UserBranchAlreadyAssignedError(
                user_id=user_id,
                branch_id=request.branch_id,
            )

        # 3. Create assignment via entity factory
        user_branch = UserBranch.assign(
            user_id=user_id,
            branch_id=request.branch_id,
            tenant_id=tenant_id,
            assigned_by=assigned_by,
        )

        # 4. Persist assignment
        user_branch = await self.user_branch_repository.assign(
            user_id=user_branch.user_id,
            branch_id=user_branch.branch_id,
            tenant_id=user_branch.tenant_id,
            assigned_by=user_branch.assigned_by,
        )

        # 5. Map to response DTO
        return UserBranchResponse(
            id=user_branch.id,
            user_id=user_branch.user_id,
            branch_id=user_branch.branch_id,
            tenant_id=user_branch.tenant_id,
            assigned_at=user_branch.assigned_at,
            assigned_by=user_branch.assigned_by,
        )
