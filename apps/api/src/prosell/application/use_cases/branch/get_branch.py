"""
Get Branch Use Case.

Retrieves a single branch by ID with tenant isolation.
"""

import uuid

from prosell.application.dto.branch import BranchResponse
from prosell.domain.exceptions.branch_exceptions import BranchNotFoundError
from prosell.domain.repositories.branch_repository import AbstractBranchRepository


class GetBranchUseCase:
    """Use case for retrieving a branch by ID."""

    def __init__(self, branch_repository: AbstractBranchRepository):
        """Initialize use case with branch repository."""
        self._branch_repository = branch_repository

    async def execute(self, branch_id: uuid.UUID, tenant_id: uuid.UUID) -> BranchResponse:
        """
        Execute branch retrieval.

        Args:
            branch_id: Branch UUID to retrieve
            tenant_id: Tenant UUID for multi-tenancy

        Returns:
            BranchResponse with branch data

        Raises:
            BranchNotFound: If branch doesn't exist or belongs to different tenant
        """
        branch = await self._branch_repository.get_by_id(branch_id, tenant_id)

        if branch is None:
            raise BranchNotFoundError(branch_id=branch_id)

        return BranchResponse.from_entity(branch)
