"""List products use case."""

from uuid import UUID

from pydantic import BaseModel

from prosell.application.dto.product import ProductResponse
from prosell.domain.repositories.product_repository import AbstractProductRepository
from prosell.domain.value_objects.attribute_filter import AttributeFilter
from prosell.domain.value_objects.product_condition import ProductCondition
from prosell.domain.value_objects.product_status import ProductStatus


class ProductListResponse(BaseModel):
    """DTO for product list response."""

    products: list[ProductResponse]
    total: int
    skip: int
    limit: int


class ListProductsUseCase:
    """List products with filters."""

    def __init__(self, product_repository: AbstractProductRepository) -> None:
        self.product_repository = product_repository

    async def execute(
        self,
        tenant_id: UUID,
        organization_id: UUID | None = None,
        category_id: UUID | None = None,
        status: str | None = None,
        condition: str | None = None,
        is_featured: bool | None = None,
        search_query: str | None = None,
        min_price_cents: int | None = None,
        max_price_cents: int | None = None,
        attribute_filters: list[AttributeFilter] | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> ProductListResponse:
        """
        Execute product listing.

        Args:
            tenant_id: Tenant UUID
            organization_id: Filter by organization
            category_id: Filter by category
            status: Filter by status (string)
            condition: Filter by condition (string)
            is_featured: Filter by featured status
            search_query: Text search
            min_price_cents: Minimum price
            max_price_cents: Maximum price
            attribute_filters: Dynamic filters over JSONB `attributes` column
            skip: Pagination offset
            limit: Max records

        Returns:
            ProductListResponse DTO
        """
        # Convert string enums to actual enums if provided
        status_enum = ProductStatus(status) if status else None
        condition_enum = ProductCondition(condition) if condition else None

        # Get products
        products = await self.product_repository.get_all(
            tenant_id=tenant_id,
            organization_id=organization_id,
            category_id=category_id,
            status=status_enum,
            condition=condition_enum,
            is_featured=is_featured,
            search_query=search_query,
            min_price_cents=min_price_cents,
            max_price_cents=max_price_cents,
            attribute_filters=attribute_filters,
            skip=skip,
            limit=limit,
        )

        # Get total count
        total = await self.product_repository.count(
            tenant_id=tenant_id,
            organization_id=organization_id,
            status=status_enum,
        )

        return ProductListResponse(
            products=[ProductResponse.from_entity(p) for p in products],
            total=total,
            skip=skip,
            limit=limit,
        )
