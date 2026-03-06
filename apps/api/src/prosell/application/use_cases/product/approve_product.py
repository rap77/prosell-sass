"""Approve product use case."""

from uuid import UUID

from prosell.application.dto.product import ProductResponse
from prosell.domain.exceptions.product_exceptions import ProductNotFoundError
from prosell.domain.repositories.product_repository import AbstractProductRepository


class ApproveProductUseCase:
    """Approve a product (transitions to PUBLISHED)."""

    def __init__(self, product_repository: AbstractProductRepository) -> None:
        self.product_repository = product_repository

    async def execute(
        self,
        product_id: UUID,
        tenant_id: UUID,
        user_id: UUID,
    ) -> ProductResponse:
        """
        Execute product approval.

        Args:
            product_id: Product UUID
            tenant_id: Tenant UUID
            user_id: User ID of approver

        Returns:
            ProductResponse DTO

        Raises:
            ProductNotFoundError: If product doesn't exist
            ValueError: If product cannot be approved
        """
        # 1. Get product
        product = await self.product_repository.get_by_id(product_id, tenant_id)
        if not product:
            raise ProductNotFoundError(str(product_id))

        # 2. Approve (auto-publishes)
        product.approve(user_id)

        # 3. Persist
        product = await self.product_repository.update(product)

        return ProductResponse.from_entity(product)
