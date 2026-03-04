"""Create product use case."""

from prosell.application.dto.product import CreateProductRequest, ProductResponse
from prosell.domain.entities.product import Product
from prosell.domain.repositories.product_repository import AbstractProductRepository


class CreateProductUseCase:
    """Create a new product."""

    def __init__(self, product_repository: AbstractProductRepository) -> None:
        self.product_repository = product_repository

    async def execute(self, request: CreateProductRequest) -> ProductResponse:
        """
        Execute product creation.

        Args:
            request: CreateProductRequest DTO

        Returns:
            ProductResponse DTO

        Raises:
            ValueError: If category or organization doesn't exist
        """
        # 1. Create product entity
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

        # 2. Persist
        product = await self.product_repository.create(product)

        return ProductResponse.from_entity(product)
