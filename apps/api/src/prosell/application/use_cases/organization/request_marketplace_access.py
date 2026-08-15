"""Request marketplace access use case."""

from uuid import UUID, uuid4

from prosell.domain.entities.marketplace_access import MarketplaceAccessGrant
from prosell.domain.repositories.marketplace_access_repository import (
    AbstractMarketplaceAccessRepository,
)


class RequestMarketplaceAccessUseCase:
    """Request marketplace operator access for inventory."""

    def __init__(self, repository: AbstractMarketplaceAccessRepository):
        self.repository = repository

    async def execute(
        self,
        inventory_owner_organization_id: UUID,
        operator_organization_id: UUID,
        requested_by_user_id: UUID,
        can_publish_marketplace: bool,
        can_manage_inventory: bool = False,
    ) -> MarketplaceAccessGrant:
        """Request access - creates pending grant or returns existing."""
        # ponytail: check if already exists
        existing = await self.repository.get_by_orgs(
            inventory_owner_organization_id, operator_organization_id
        )
        if existing and existing.is_pending:
            return existing

        # ponytail: create new pending grant using domain factory
        grant = MarketplaceAccessGrant.create(
            id=uuid4(),
            inventory_owner_organization_id=inventory_owner_organization_id,
            operator_organization_id=operator_organization_id,
            requested_by_user_id=requested_by_user_id,
            can_publish_marketplace=can_publish_marketplace,
            can_manage_inventory=can_manage_inventory,
        )

        return await self.repository.create(grant)
