"""Repository interface for marketplace access grants."""

from abc import ABC, abstractmethod
from uuid import UUID

from prosell.domain.entities.marketplace_access import MarketplaceAccessGrant


class AbstractMarketplaceAccessRepository(ABC):
    """Repository for marketplace access grants."""

    @abstractmethod
    async def get_by_id(self, grant_id: UUID) -> MarketplaceAccessGrant | None:
        """Get grant by ID."""
        ...

    @abstractmethod
    async def get_by_orgs(
        self, inventory_owner_id: UUID, operator_id: UUID
    ) -> MarketplaceAccessGrant | None:
        """Get grant by owner and operator."""
        ...

    @abstractmethod
    async def create(self, grant: MarketplaceAccessGrant) -> MarketplaceAccessGrant:
        """Create a new grant."""
        ...

    @abstractmethod
    async def update(self, grant: MarketplaceAccessGrant) -> MarketplaceAccessGrant:
        """Update existing grant."""
        ...

    @abstractmethod
    async def list_by_inventory_owner(
        self, inventory_owner_id: UUID
    ) -> list[MarketplaceAccessGrant]:
        """List grants where org is inventory owner."""
        ...

    @abstractmethod
    async def list_by_operator(self, operator_id: UUID) -> list[MarketplaceAccessGrant]:
        """List grants where org is operator."""
        ...
