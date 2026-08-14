"""Batch reserve products use case."""

from uuid import UUID

from prosell.application.dto.product.batch_availability import (
    BatchAvailabilityItemResult,
    BatchAvailabilityResponse,
)
from prosell.domain.repositories.product_repository import AbstractProductRepository


class BatchReserveProductsUseCase:
    """Reserve multiple published products in a single operation."""

    def __init__(self, product_repository: AbstractProductRepository) -> None:
        """Initialize use case with repository."""
        self.product_repository = product_repository

    async def execute(
        self,
        product_ids: list[UUID],
        tenant_id: UUID | None,
    ) -> BatchAvailabilityResponse:
        """
        Reserve multiple published products.

        Args:
            product_ids: List of product IDs to reserve
            tenant_id: Tenant ID for isolation (None for Super Admin = no filter)

        Returns:
            BatchAvailabilityResponse with per-product results and counts
        """
        # Deduplicate IDs while preserving order (spec requirement)
        unique_ids = list(dict.fromkeys(product_ids))

        results: list[BatchAvailabilityItemResult] = []
        success_count = 0
        failed_count = 0

        # Loop with per-item error handling
        for product_id in unique_ids:
            try:
                # ponytail: Super Admin can access all tenants (tenant_id=None means no filter)
                product = await self.product_repository.get_by_id(product_id, tenant_id)
                if not product:
                    raise ValueError(f"Product not found: {product_id}")

                # Entity validates transition (published → reserved)
                product.reserve()
                await self.product_repository.update(product)

                results.append(
                    BatchAvailabilityItemResult(
                        product_id=product_id,
                        status="reserved",
                    )
                )
                success_count += 1

            except ValueError as e:
                # Determine error code based on exception message
                error_code = "invalid_transition" if "Cannot reserve" in str(e) else "not_found"

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
