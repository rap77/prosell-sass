"""
List Branchs Use Case.

Retrieves paginated list of branches for a tenant.
"""

import uuid

from prosell.application.dto.branch import BranchListResponse, BranchResponse
from prosell.domain.repositories.branch_repository import AbstractBranchRepository


class ListBranchesUseCase:
    """Use case for listing branches with pagination."""

    def __init__(self, branch_repository: AbstractBranchRepository):
        """Initialize use case with branch repository."""
        self._branch_repository = branch_repository

    async def execute(
        self,
        tenant_id: uuid.UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> BranchListResponse:
        """
        Execute branch list retrieval.

        Args:
            tenant_id: Tenant UUID for multi-tenancy
            limit: Maximum number of results (default 50)
            offset: Number of results to skip (default 0)

        Returns:
            BranchListResponse with paginated branch list
        """
        # Validate pagination params
        if limit < 1:
            limit = 50
        if limit > 100:
            limit = 100
        if offset < 0:
            offset = 0

        # Fetch branches
        branches_list, total = await self._branch_repository.list_by_tenant(
            tenant_id=tenant_id,
            limit=limit,
            offset=offset,
        )
        branches = branches_list

        # Map to DTOs
        items = [BranchResponse.from_entity(branch) for branch in branches]

        return BranchListResponse(
            items=items,
            total=total,
            limit=limit,
            offset=offset,
        )
