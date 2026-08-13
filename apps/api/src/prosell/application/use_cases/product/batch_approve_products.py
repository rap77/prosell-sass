"""Batch approve products use case."""

from uuid import UUID

from prosell.application.dto.product.batch_review import (
    BatchReviewItemResult,
    BatchReviewResponse,
)
from prosell.domain.repositories.product_repository import AbstractProductRepository


class BatchApproveProductsUseCase:
    """Approve multiple products in a single operation."""

    def __init__(self, product_repository: AbstractProductRepository) -> None:
        """Initialize use case with repository."""
        self.product_repository = product_repository

    async def execute(
        self,
        product_ids: list[UUID],
        tenant_id: UUID,
        user_id: UUID,
    ) -> BatchReviewResponse:
        """
        Approve multiple products.

        Args:
            product_ids: List of product IDs to approve
            tenant_id: Tenant ID for isolation
            user_id: User ID performing the approval

        Returns:
            BatchReviewResponse with per-product results and counts
        """
        # Deduplicate IDs while preserving order
        unique_ids = list(dict.fromkeys(product_ids))

        results: list[BatchReviewItemResult] = []
        approved_count = 0
        failed_count = 0

        # Loop with per-item error handling
        for product_id in unique_ids:
            try:
                product = await self.product_repository.get_by_id(product_id, tenant_id)
                if not product:
                    raise ValueError(f"Product not found: {product_id}")

                # Entity validates transition
                product.approve(user_id)
                await self.product_repository.update(product)

                results.append(
                    BatchReviewItemResult(
                        product_id=product_id,
                        status="approved",
                    )
                )
                approved_count += 1

            except ValueError as e:
                # Determine error code based on exception message
                error_code = "invalid_transition" if "Cannot approve" in str(e) else "not_found"

                results.append(
                    BatchReviewItemResult(
                        product_id=product_id,
                        status="failed",
                        error_code=error_code,
                        message=str(e),
                    )
                )
                failed_count += 1

        return BatchReviewResponse(
            results=results,
            approved_count=approved_count,
            failed_count=failed_count,
        )
