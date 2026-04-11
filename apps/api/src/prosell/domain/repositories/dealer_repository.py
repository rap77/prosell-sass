"""AbstractDealerRepository interface."""

from abc import ABC, abstractmethod
from uuid import UUID

from prosell.domain.entities.dealer import Dealer


class AbstractDealerRepository(ABC):
    """Repository interface for Dealer entities."""

    @abstractmethod
    async def create(self, dealer: Dealer) -> Dealer:
        """Create a new dealer."""
        pass

    @abstractmethod
    async def get_by_id(self, dealer_id: UUID, tenant_id: UUID | None = None) -> Dealer | None:
        """Get dealer by ID with optional tenant isolation."""
        pass

    @abstractmethod
    async def get_by_slug(self, slug: str, tenant_id: UUID) -> Dealer | None:
        """Get dealer by slug (unique per tenant)."""
        pass

    @abstractmethod
    async def exists_by_slug(self, slug: str, tenant_id: UUID) -> bool:
        """Check if slug exists (for validation)."""
        pass

    @abstractmethod
    async def update(self, dealer: Dealer) -> Dealer:
        """Update an existing dealer."""
        pass

    @abstractmethod
    async def delete(self, dealer_id: UUID, tenant_id: UUID) -> None:
        """Delete a dealer by ID."""
        pass

    @abstractmethod
    async def list_by_tenant(
        self,
        tenant_id: UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Dealer], int]:
        """List dealers for a tenant with pagination. Returns (dealers, total)."""
        pass
