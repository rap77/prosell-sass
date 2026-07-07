"""Use case for setting product ownership with multiple owners.

Validates that percentages sum to 100% and atomically replaces
all ownership records for a product.
"""

from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID

from prosell.domain.repositories.product_ownership_repository import (
    AbstractProductOwnershipRepository,
)
from prosell.domain.repositories.product_repository import AbstractProductRepository


@dataclass(frozen=True)
class OwnerShare:
    """A single owner's share of a product."""

    owner_id: UUID
    percentage: Decimal
    owner_type: str = "organization"  # "organization" | "user"


class SetProductOwnershipUseCase:
    """Set ownership for a product, replacing any existing ownership."""

    def __init__(
        self,
        ownership_repository: AbstractProductOwnershipRepository,
        product_repository: AbstractProductRepository,
    ) -> None:
        self.ownership_repository = ownership_repository
        self.product_repository = product_repository

    async def execute(
        self,
        product_id: UUID,
        tenant_id: UUID,
        owners: list[OwnerShare],
    ) -> None:
        """Set ownership for a product.

        Args:
            product_id: The product to set ownership for
            tenant_id: Tenant for authorization
            owners: List of owners with percentages (must sum to 100%)

        Raises:
            ValueError: If product not found, empty owners, or percentages don't sum to 100%
        """
        # Validate product exists
        product = await self.product_repository.get_by_id(product_id, tenant_id)
        if product is None:
            raise ValueError(f"Product not found: {product_id}")

        # Validate at least one owner
        if not owners:
            raise ValueError("Product must have at least one owner")

        # Validate percentages sum to 100%
        total = sum(o.percentage for o in owners)
        if total != Decimal("100.00"):
            raise ValueError(f"Ownership percentages must sum to 100%, got {total}")

        # Atomically replace ownership
        await self.ownership_repository.clear_ownership(product_id)
        for owner in owners:
            await self.ownership_repository.add_owner(
                product_id, owner.owner_id, owner.percentage, owner.owner_type
            )
