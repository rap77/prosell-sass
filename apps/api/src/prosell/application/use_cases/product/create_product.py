"""Create product use case with JSONB attribute validation."""

from uuid import UUID

from pydantic import ValidationError

from prosell.application.dto.product import CreateProductRequest, ProductResponse
from prosell.application.dto.product.attributes import (
    GenericProductAttributes,
    ProductAttributes,
    product_attributes_adapter,
    validate_generic_attributes,
    validate_real_estate_attributes,
    validate_vehicle_attributes,
)
from prosell.domain.entities.product import Product
from prosell.domain.exceptions.product_exceptions import ProductError
from prosell.domain.repositories.category_repository import AbstractCategoryRepository
from prosell.domain.repositories.product_repository import AbstractProductRepository


class CreateProductUseCase:
    """Create a new product with category-specific attribute validation.

    This use case validates product attributes against category-specific schemas
    before persisting to the database. Uses discriminated unions for type-safe
    runtime validation.

    Validation strategy:
    1. Determine category type from category entity (vehicle, real_estate, generic)
    2. Inject category discriminator into attributes dict
    3. Validate using Pydantic v2 strict mode
    4. Raise ProductError with detailed validation errors on failure
    """

    def __init__(
        self,
        product_repository: AbstractProductRepository,
        category_repository: AbstractCategoryRepository,
    ) -> None:
        self.product_repository = product_repository
        self.category_repository = category_repository

    async def execute(self, request: CreateProductRequest) -> ProductResponse:
        """
        Execute product creation with attribute validation.

        Args:
            request: CreateProductRequest DTO with unvalidated attributes dict

        Returns:
            ProductResponse DTO

        Raises:
            ProductError: If attributes fail category-specific validation
            ValueError: If category or organization doesn't exist
        """
        # 1. Fetch category to determine attribute schema
        category = await self.category_repository.get_by_id(
            request.category_id, request.tenant_id
        )

        if not category:
            raise ValueError(f"Category {request.category_id} not found")

        # 2. Validate attributes against category schema, then type-specific rules
        raw_attributes = request.attributes or {}
        try:
            category.validate_attributes(raw_attributes)
        except ValueError as exc:
            raise ProductError(str(exc)) from exc

        validated_attributes = self._validate_attributes(
            attributes=raw_attributes,
            category_name=category.name,
            category_slug=category.slug,
        )

        # 3. Create product entity with validated attributes
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
            attributes=validated_attributes,
            location_city=request.location_city,
            location_state=request.location_state,
            location_zip=request.location_zip,
        )

        # 4. Persist to database
        product = await self.product_repository.create(product)

        return ProductResponse.from_entity(product)

    def _validate_attributes(
        self,
        attributes: dict[str, object],
        category_name: str,
        category_slug: str,
    ) -> dict[str, object]:
        """
        Validate attributes against category-specific schema.

        Args:
            attributes: Raw attributes dict from request
            category_name: Category name (e.g., "Vehicles", "Real Estate")
            category_slug: Category slug (e.g., "vehicles", "real-estate")

        Returns:
            Validated attributes dict with discriminator injected

        Raises:
            ProductError: If validation fails with detailed error messages
        """
        # Normalize category slug for matching
        slug_lower = category_slug.lower()

        # Determine category type and select validator
        if "vehicle" in slug_lower or "car" in slug_lower or "auto" in slug_lower:
            validator = validate_vehicle_attributes
            category_type = "vehicle"
        elif "real" in slug_lower and "estate" in slug_lower:
            validator = validate_real_estate_attributes
            category_type = "real_estate"
        else:
            # Generic category - use lenient validation
            validator = validate_generic_attributes
            category_type = "generic"

        # Inject discriminator if missing
        if "category" not in attributes:
            attributes = {**attributes, "category": category_type}

        # Validate using Pydantic v2 strict mode
        try:
            validated_model = validator(attributes)
            # Convert back to dict for storage in JSONB column
            return validated_model.model_dump()
        except ValidationError as e:
            # Build detailed error message
            error_details = []
            for error in e.errors():
                loc = " -> ".join(str(part) for part in error["loc"])
                msg = error["msg"]
                error_details.append(f"  {loc}: {msg}")

            error_message = (
                f"Attribute validation failed for category '{category_name}'.\n"
                f"Expected schema: {category_type}\n"
                "Errors:\n" + "\n".join(error_details)
            )

            raise ProductError(error_message) from e
