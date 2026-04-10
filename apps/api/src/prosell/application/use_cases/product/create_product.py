"""Create product use case."""

from fastapi import HTTPException

from prosell.application.dto.product import CreateProductRequest, ProductResponse
from prosell.domain.entities.product import Product
from prosell.domain.repositories.category_repository import AbstractCategoryRepository
from prosell.domain.repositories.product_repository import AbstractProductRepository


class CreateProductUseCase:
    """Create a new product with C3 attribute validation."""

    def __init__(
        self,
        product_repository: AbstractProductRepository,
        category_repository: AbstractCategoryRepository,
    ) -> None:
        self.product_repository = product_repository
        self.category_repository = category_repository

    async def execute(self, request: CreateProductRequest) -> ProductResponse:
        """
        Execute product creation.

        Validates product attributes against the category's attribute_schema
        before persisting. Empty schema = no validation (backward compatible).

        Args:
            request: CreateProductRequest DTO

        Returns:
            ProductResponse DTO

        Raises:
            HTTPException 422: If attributes fail category schema validation
            ValueError: If category or organization doesn't exist
        """
        # 1. Validate attributes against category schema (if category provided)
        if request.category_id:
            category = await self.category_repository.get_by_id(
                request.category_id, request.tenant_id
            )
            if category:
                try:
                    category.validate_attributes(request.attributes or {})
                except ValueError as e:
                    raise HTTPException(status_code=422, detail=str(e)) from e

        # 2. Create product entity
        product = Product.create(
            title=request.title,
            price_cents=request.price_cents,
            tenant_id=request.tenant_id,
            organization_id=request.organization_id,
            category_id=request.category_id,
            condition=request.condition,
            slug=request.slug,
            description=request.description,
            currency=request.currency,
            attributes=request.attributes,
            location_city=request.location_city,
            location_state=request.location_state,
            location_zip=request.location_zip,
        )

        # 3. Persist
        product = await self.product_repository.create(product)

        return ProductResponse.from_entity(product)
