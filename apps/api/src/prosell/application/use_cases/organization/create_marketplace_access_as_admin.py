"""Create marketplace access as admin use case."""

from uuid import UUID, uuid4

from prosell.domain.entities.marketplace_access import MarketplaceAccessGrant
from prosell.domain.repositories.marketplace_access_repository import (
    AbstractMarketplaceAccessRepository,
)


class CreateMarketplaceAccessAsAdminUseCase:
    """Create marketplace access grant as admin (bypass REQUEST flow)."""

    def __init__(self, repository: AbstractMarketplaceAccessRepository) -> None:
        self.repository = repository

    async def execute(
        self,
        inventory_owner_organization_id: UUID,
        operator_organization_id: UUID,
        requested_by_user_id: UUID,
        can_publish_marketplace: bool,
        can_manage_inventory: bool,
        initial_status: str = "pending",
    ) -> MarketplaceAccessGrant:
        """Create grant as admin - can be pending or active directly."""
        # Validate initial_status
        if initial_status not in ["pending", "active"]:
            raise ValueError("initial_status must be 'pending' or 'active'")

        # Check if grant already exists
        existing = await self.repository.get_by_orgs(
            inventory_owner_organization_id, operator_organization_id
        )
        if existing:
            raise ValueError(f"Grant already exists with status: {existing.status.value}")

        # Create grant entity
        grant = MarketplaceAccessGrant.create(
            id=uuid4(),
            inventory_owner_organization_id=inventory_owner_organization_id,
            operator_organization_id=operator_organization_id,
            requested_by_user_id=requested_by_user_id,
            can_publish_marketplace=can_publish_marketplace,
            can_manage_inventory=can_manage_inventory,
        )

        # If initial_status is active, approve it immediately
        if initial_status == "active":
            grant.approve(approver_id=requested_by_user_id)

        return await self.repository.create(grant)
