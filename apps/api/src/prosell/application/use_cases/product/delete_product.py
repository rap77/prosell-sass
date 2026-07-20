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

    tenant_id=None means admin bypass (can delete any product).
    """

    def __init__(self, product_repository: AbstractProductRepository) -> None:
        self.product_repository = product_repository

    async def execute(self, product_id: UUID, tenant_id: UUID | None) -> None:
        """
        Delete product and cascade to vehicle.

        Args:
            product_id: UUID of product to delete
            tenant_id: Tenant ID for access control, or None for admin bypass

        Raises:
            ValueError: If product not found OR (tenant_id set AND mismatch)
        """
        product = await self.product_repository.get_by_id(product_id, tenant_id)
        if not product:
            raise ValueError(f"Product {product_id} not found or access denied")

        logger.info(
            "Hard-deleting product %s (tenant filter: %s) — vehicle CASCADE will auto-run",
            product_id,
            tenant_id or "admin-bypass",
        )

        # ponytail: use product's actual tenant_id for delete, not the filter
        await self.product_repository.delete(product_id, product.tenant_id)
