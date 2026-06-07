"""Create product use case with JSONB attribute validation."""

from uuid import UUID

from prosell.application.dto.product import CreateProductRequest, ProductResponse
from prosell.domain.entities.product import Product
from prosell.domain.exceptions.category_exceptions import CategoryNotFoundError
from prosell.domain.repositories.category_repository import AbstractCategoryRepository
from prosell.domain.repositories.product_repository import AbstractProductRepository
from prosell.domain.services.template_composer import resolve_title


class CreateProductUseCase:
    """Create a new product with category validation."""

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

        Args:
            request: CreateProductRequest DTO

        Returns:
            ProductResponse DTO

        Raises:
            CategoryNotFoundError: If category does not exist
            ValueError: If validation fails
        """
        # 1. Validate category exists
        category = await self.category_repository.get_by_id(
            request.category_id,
            request.tenant_id or UUID(int=0),  # Skip tenant filter if None
        )
        if not category:
            raise CategoryNotFoundError(f"Category not found: {request.category_id}")

        # 1b. Validate attributes against category schema
        # (raises ValueError on type/required mismatch)
        category.validate_attributes(request.attributes or {})

        # 1c. Auto-generate stock_number from VIN if not provided
        attrs: dict[str, object] = request.attributes or {}
        vin_str = attrs.get("vin")
        if isinstance(vin_str, str) and len(vin_str) >= 6 and "stock_number" not in attrs:
            attrs["stock_number"] = vin_str[-6:].upper()
            request = request.model_copy(update={"attributes": attrs})

        # 2. Create product entity
        tenant_id = request.tenant_id or category.tenant_id
        organization_id = request.organization_id or tenant_id

        # 2b. Compose the title from the category's presentation template
        # when it declares one; otherwise keep the request-provided title
        # (backward-compatible fallback). Shared with the PATCH handler.
        title = resolve_title(category.presentation, attrs, fallback=request.title)

        # 3. Create product entity
        product = Product.create(
            title=title,
            price_cents=request.price_cents,
            tenant_id=tenant_id,
            organization_id=organization_id,
            category_id=request.category_id,
            condition=request.condition,
            slug=request.slug,
            description=request.description,
            currency=request.currency,
            attributes=request.attributes,
            image_urls=request.image_urls,
            cover_image_key=request.cover_image_key,
            location_city=request.location_city,
            location_state=request.location_state,
            location_zip=request.location_zip,
        )

        # 4. Persist
        product = await self.product_repository.create(product)

        return ProductResponse.from_entity(product)
