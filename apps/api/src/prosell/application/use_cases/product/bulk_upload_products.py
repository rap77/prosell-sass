"""Bulk upload products use case."""

from dataclasses import dataclass
from uuid import UUID

from prosell.application.dto.product.create import CreateProductRequest
from prosell.domain.entities.product import Product
from prosell.domain.exceptions.category_exceptions import CategoryNotFoundError
from prosell.domain.repositories.category_repository import AbstractCategoryRepository
from prosell.domain.repositories.product_repository import AbstractProductRepository
from prosell.domain.services.csv_product_parser import CSVProductParser, ParsedProductRow
from prosell.domain.value_objects.product_condition import ProductCondition


def parsed_row_to_create_request(
    row: ParsedProductRow,
    tenant_id: UUID,
    organization_id: UUID,
) -> CreateProductRequest:
    """Convert a ParsedProductRow to a CreateProductRequest DTO.

    Lives in the application layer so the domain ParsedProductRow stays
    free of any application-layer imports (Clean Architecture).
    """
    return CreateProductRequest(
        title=row.title,
        price_cents=row.price_cents,
        tenant_id=tenant_id,
        organization_id=organization_id,
        category_id=row.category_id,
        description=row.description,
        condition=ProductCondition(row.condition),
        currency=row.currency,
        location_city=row.location_city,
        location_state=row.location_state,
        location_zip=row.location_zip,
        attributes=row.attributes,
    )


@dataclass
class BulkUploadResult:
    """Result of bulk product upload operation (excludes upload_id — added by router)."""

    total_count: int
    created_count: int
    failed_count: int
    errors: list[dict[str, str | int]]


class BulkUploadProductsUseCase:
    """Use case for bulk uploading products from CSV."""

    def __init__(
        self,
        product_repository: AbstractProductRepository,
        category_repository: AbstractCategoryRepository,
        csv_parser: CSVProductParser,
    ) -> None:
        self.product_repository = product_repository
        self.category_repository = category_repository
        self.csv_parser = csv_parser

    async def execute(
        self,
        parsed_products: list[ParsedProductRow],
        tenant_id: UUID,
        organization_id: UUID,
    ) -> BulkUploadResult:
        total_count = len(parsed_products)
        created_count = 0
        failed_count = 0
        errors: list[dict[str, str | int]] = []

        for parsed_product in parsed_products:
            try:
                request = parsed_row_to_create_request(
                    row=parsed_product,
                    tenant_id=tenant_id,
                    organization_id=organization_id,
                )

                category = await self.category_repository.get_by_id(
                    request.category_id,
                    request.tenant_id or UUID(int=0),
                )
                if not category:
                    raise CategoryNotFoundError(f"Category not found: {request.category_id}")

                product_tenant_id = request.tenant_id or category.tenant_id
                if product_tenant_id is None:
                    raise ValueError(
                        "Cannot create a product without a tenant: tenant_id is required"
                    )
                product_organization_id = request.organization_id or product_tenant_id

                product = Product.create(
                    title=request.title,
                    price_cents=request.price_cents,
                    tenant_id=product_tenant_id,
                    organization_id=product_organization_id,
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

                await self.product_repository.create(product)
                created_count += 1

            except (CategoryNotFoundError, ValueError, KeyError) as e:
                failed_count += 1
                error_dict: dict[str, str | int] = {
                    "row_number": parsed_product.row_number,
                    "message": str(e),
                }
                errors.append(error_dict)

        return BulkUploadResult(
            total_count=total_count,
            created_count=created_count,
            failed_count=failed_count,
            errors=errors,
        )
