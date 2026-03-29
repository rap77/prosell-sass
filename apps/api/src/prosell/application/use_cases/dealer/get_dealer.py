"""
Get Dealer Use Case.

Retrieves a single dealer by ID with tenant isolation.
"""

import uuid

from prosell.application.dto.dealer import DealerResponse
from prosell.domain.exceptions.dealer_exceptions import DealerNotFoundError
from prosell.domain.repositories.dealer_repository import AbstractDealerRepository


class GetDealerUseCase:
    """Use case for retrieving a dealer by ID."""

    def __init__(self, dealer_repository: AbstractDealerRepository):
        """Initialize use case with dealer repository."""
        self._dealer_repository = dealer_repository

    async def execute(self, dealer_id: uuid.UUID, tenant_id: uuid.UUID) -> DealerResponse:
        """
        Execute dealer retrieval.

        Args:
            dealer_id: Dealer UUID to retrieve
            tenant_id: Tenant UUID for multi-tenancy

        Returns:
            DealerResponse with dealer data

        Raises:
            DealerNotFound: If dealer doesn't exist or belongs to different tenant
        """
        dealer = await self._dealer_repository.get_by_id(dealer_id)

        if dealer is None or dealer.tenant_id != tenant_id:
            raise DealerNotFoundError(f"Dealer with ID {dealer_id} not found")

        return DealerResponse.from_entity(dealer)
