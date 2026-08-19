"""Batch submit products for approval use case."""

from uuid import UUID

from prosell.application.dto.product.batch_submit import (
    BatchSubmitItemResult,
    BatchSubmitResponse,
)
from prosell.domain.repositories.product_repository import AbstractProductRepository


class BatchSubmitProductsUseCase:
    """Submit multiple products for approval in a single operation."""

    def __init__(self, product_repository: AbstractProductRepository) -> None:
        """Initialize use case with repository."""
        self.product_repository = product_repository

    async def execute(
        self,
        product_ids: list[UUID],
        tenant_id: UUID | None,
        user_id: UUID,
    ) -> BatchSubmitResponse:
        """
        Submit multiple products for approval.

        Args:
            product_ids: List of product IDs to submit
            tenant_id: Tenant ID for isolation (None for Super Admin = no filter)
            user_id: User ID performing the submission

        Returns:
            BatchSubmitResponse with per-product results and counts
        """
        # Deduplicate IDs while preserving order
        unique_ids = list(dict.fromkeys(product_ids))

        results: list[BatchSubmitItemResult] = []
        submitted_count = 0
        failed_count = 0

        # Loop with per-item error handling
        for product_id in unique_ids:
            try:
                # ponytail: Super Admin can access all tenants (tenant_id=None means no filter)
                product = await self.product_repository.get_by_id(product_id, tenant_id)
                if not product:
                    raise ValueError(f"Product not found: {product_id}")

                # Entity validates transition (draft/rejected → pending)
                product.submit_for_approval(user_id)
                await self.product_repository.update(product, changed_by_user_id=user_id)

                results.append(
                    BatchSubmitItemResult(
                        product_id=product_id,
                        status="submitted",
                    )
                )
                submitted_count += 1

            except ValueError as e:
                # Determine error code based on exception message
                error_code = "invalid_transition" if "Cannot submit" in str(e) else "not_found"

                results.append(
                    BatchSubmitItemResult(
                        product_id=product_id,
                        status="failed",
                        error_code=error_code,
                        message=str(e),
                    )
                )
                failed_count += 1

        return BatchSubmitResponse(
            results=results,
            submitted_count=submitted_count,
            failed_count=failed_count,
        )
