"""
List Dealers Use Case.

Retrieves paginated list of dealers for a tenant.
"""

import uuid

from prosell.application.dto.dealer import DealerListResponse, DealerResponse
from prosell.domain.repositories.dealer_repository import AbstractDealerRepository


class ListDealersUseCase:
    """Use case for listing dealers with pagination."""

    def __init__(self, dealer_repository: AbstractDealerRepository):
        """Initialize use case with dealer repository."""
        self._dealer_repository = dealer_repository

    async def execute(
        self,
        tenant_id: uuid.UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> DealerListResponse:
        """
        Execute dealer list retrieval.

        Args:
            tenant_id: Tenant UUID for multi-tenancy
            limit: Maximum number of results (default 50)
            offset: Number of results to skip (default 0)

        Returns:
            DealerListResponse with paginated dealer list
        """
        # Validate pagination params
        if limit < 1:
            limit = 50
        if limit > 100:
            limit = 100
        if offset < 0:
            offset = 0

        # Fetch dealers
        dealers, total = await self._dealer_repository.list_by_tenant(
            tenant_id=tenant_id,
            limit=limit,
            offset=offset,
        )

        # Map to DTOs
        items = [DealerResponse.from_entity(dealer) for dealer in dealers]

        return DealerListResponse(
            items=items,
            total=total,
            limit=limit,
            offset=offset,
        )
