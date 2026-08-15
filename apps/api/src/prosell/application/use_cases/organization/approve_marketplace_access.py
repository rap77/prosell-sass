"""Approve marketplace access use case."""

from uuid import UUID

from prosell.domain.entities.marketplace_access import MarketplaceAccessGrant
from prosell.domain.repositories.marketplace_access_repository import (
    AbstractMarketplaceAccessRepository,
)


class ApproveMarketplaceAccessUseCase:
    """Approve a pending marketplace access request."""

    def __init__(self, repository: AbstractMarketplaceAccessRepository):
        self.repository = repository

    async def execute(self, grant_id: UUID, approved_by_user_id: UUID) -> MarketplaceAccessGrant:
        """Approve pending request - transition to active."""
        grant = await self.repository.get_by_id(grant_id)

        if not grant:
            raise ValueError("Grant not found")

        # Use domain method to approve (validates status)
        grant.approve(approved_by_user_id)

        return await self.repository.update(grant)
