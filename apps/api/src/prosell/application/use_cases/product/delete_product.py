"""Delete product use case — hard delete with CASCADE."""

import logging
from uuid import UUID

from prosell.domain.repositories.product_repository import AbstractProductRepository

logger = logging.getLogger(__name__)


class DeleteProductUseCase:
    """
    Hard-delete a product by ID.

    ON DELETE CASCADE on vehicles.product_id means the vehicle record
    is automatically deleted by PostgreSQL when the product is deleted.

    tenant_id is verified INSIDE this use case — not delegated to the router.
    This is a use case invariant (Clean Architecture: business rules belong here).
    """

    def __init__(self, product_repository: AbstractProductRepository) -> None:
        self.product_repository = product_repository

    async def execute(self, product_id: UUID, tenant_id: UUID) -> None:
        """
        Delete product and cascade to vehicle.

        Args:
            product_id: UUID of product to delete
            tenant_id: Tenant ID from authenticated user (used for access control)

        Raises:
            ValueError: If product not found OR product belongs to different tenant
        """
        # tenant_id enforced here: get_by_id filters by both id AND tenant_id
        # If None returned = either not found OR wrong tenant (access denied)
        product = await self.product_repository.get_by_id(product_id, tenant_id)
        if not product:
            raise ValueError(f"Product {product_id} not found or access denied")

        logger.info(
            "Hard-deleting product %s (tenant %s) — vehicle CASCADE will auto-run",
            product_id,
            tenant_id,
        )

        await self.product_repository.delete(product_id, tenant_id)
