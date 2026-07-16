"""Port for the product_ownership M2M bridge.

Supports multi-owner products with percentage shares. Any product type
can have N owners (organizations/brokers). Percentages should sum to 100%.
"""

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import Literal, Protocol
from uuid import UUID

OwnerType = Literal["organization", "user"]


@dataclass(frozen=True)
class ProductOwner:
    """Read model for a product owner."""

    product_id: UUID
    owner_id: UUID
    owner_type: OwnerType
    percentage: Decimal
    created_at: datetime


class AbstractProductOwnershipRepository(Protocol):
    async def add_owner(
        self,
        product_id: UUID,
        owner_id: UUID,
        percentage: Decimal,
        owner_type: OwnerType = "organization",
    ) -> None:
        """Add an owner to a product with a percentage share."""
        ...

    async def list_owners(self, product_id: UUID) -> list[ProductOwner]:
        """List all owners of a product."""
        ...

    async def update_percentage(
        self, product_id: UUID, owner_id: UUID, percentage: Decimal
    ) -> None:
        """Update an owner's percentage share."""
        ...

    async def remove_owner(self, product_id: UUID, owner_id: UUID) -> None:
        """Remove an owner from a product."""
        ...

    async def get_total_percentage(self, product_id: UUID) -> Decimal:
        """Get sum of all percentages for validation."""
        ...

    async def clear_ownership(self, product_id: UUID) -> None:
        """Remove all owners from a product."""
        ...
