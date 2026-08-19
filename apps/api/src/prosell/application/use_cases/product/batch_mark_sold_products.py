"""Batch mark sold products use case."""

from uuid import UUID

from prosell.application.dto.product.batch_availability import (
    BatchAvailabilityItemResult,
    BatchAvailabilityResponse,
)
from prosell.domain.repositories.product_repository import AbstractProductRepository


class BatchMarkSoldProductsUseCase:
    """Mark multiple products as sold in a single operation."""

    def __init__(self, product_repository: AbstractProductRepository) -> None:
        """Initialize use case with repository."""
        self.product_repository = product_repository

    async def execute(
        self,
        product_ids: list[UUID],
        tenant_id: UUID | None,
        user_id: UUID,
    ) -> BatchAvailabilityResponse:
        """
        Mark multiple products as sold.

        Args:
            product_ids: List of product IDs to mark sold
            tenant_id: Tenant ID for isolation (None for Super Admin = no filter)
            user_id: User ID performing the action, for the audit trail

        Returns:
            BatchAvailabilityResponse with per-product results and counts
        """
        # Deduplicate IDs while preserving order
        unique_ids = list(dict.fromkeys(product_ids))

        results: list[BatchAvailabilityItemResult] = []
        success_count = 0
        failed_count = 0

        # Loop with per-item error handling
        for product_id in unique_ids:
            try:
                product = await self.product_repository.get_by_id(product_id, tenant_id)
                if not product:
                    raise ValueError(f"Product not found: {product_id}")

                # Entity validates transition (published/reserved → sold)
                product.mark_sold()
                await self.product_repository.update(product, changed_by_user_id=user_id)

                results.append(
                    BatchAvailabilityItemResult(
                        product_id=product_id,
                        status="sold",
                    )
                )
                success_count += 1

            except ValueError as e:
                # Determine error code based on exception message
                error_code = "invalid_transition" if "Cannot mark" in str(e) else "not_found"

                results.append(
                    BatchAvailabilityItemResult(
                        product_id=product_id,
                        status="failed",
                        error_code=error_code,
                        message=str(e),
                    )
                )
                failed_count += 1

        return BatchAvailabilityResponse(
            results=results,
            success_count=success_count,
            failed_count=failed_count,
        )
