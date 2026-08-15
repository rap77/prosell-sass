"""Reject marketplace access use case."""

from uuid import UUID

from prosell.domain.entities.marketplace_access import MarketplaceAccessGrant
from prosell.domain.repositories.marketplace_access_repository import (
    AbstractMarketplaceAccessRepository,
)


class RejectMarketplaceAccessUseCase:
    """Reject a pending marketplace access request."""

    def __init__(self, repository: AbstractMarketplaceAccessRepository):
        self.repository = repository

    async def execute(
        self, grant_id: UUID, rejected_by_user_id: UUID, reason: str
    ) -> MarketplaceAccessGrant:
        """Reject pending request with reason."""
        grant = await self.repository.get_by_id(grant_id)

        if not grant:
            raise ValueError("Grant not found")

        # Use domain method to reject (validates status)
        grant.reject(rejected_by_user_id, reason)

        return await self.repository.update(grant)
