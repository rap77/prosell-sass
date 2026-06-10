"""Bulk upload products use case."""

from dataclasses import dataclass
from uuid import UUID

from prosell.domain.entities.product import Product
from prosell.domain.exceptions.category_exceptions import CategoryNotFoundError
from prosell.domain.repositories.category_repository import AbstractCategoryRepository
from prosell.domain.repositories.product_repository import AbstractProductRepository
from prosell.domain.services.csv_product_parser import CSVProductParser, ParsedProductRow


@dataclass
class BulkUploadResult:
    """Result of bulk product upload operation."""

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
        """
        Initialize use case.

        Args:
            product_repository: Product repository
            category_repository: Category repository
            csv_parser: CSV parser service
        """
        self.product_repository = product_repository
        self.category_repository = category_repository
        self.csv_parser = csv_parser

    async def execute(
        self,
        parsed_products: list[ParsedProductRow],
        tenant_id: UUID,
        organization_id: UUID,
    ) -> BulkUploadResult:
        """
        Execute bulk product upload.

        Args:
            parsed_products: List of parsed product rows from CSV
            tenant_id: Tenant ID for all products
            organization_id: Organization ID for all products

        Returns:
            BulkUploadResult with counts and errors
        """
        total_count = len(parsed_products)
        created_count = 0
        failed_count = 0
        errors: list[dict[str, str | int]] = []

        for parsed_product in parsed_products:
            try:
                # 1. Convert to CreateProductRequest
                request = parsed_product.to_create_product_request(
                    tenant_id=tenant_id,
                    organization_id=organization_id,
                )

                # 2. Validate category exists
                category = await self.category_repository.get_by_id(
                    request.category_id,
                    request.tenant_id or UUID(int=0),  # Skip tenant filter if None
                )
                if not category:
                    raise CategoryNotFoundError(f"Category not found: {request.category_id}")

                # 3. Validate tenant_id and organization_id. A global category
                # (tenant_id=NULL) carries no tenant, so the request must
                # supply one — caught per-row by the except below.
                product_tenant_id = request.tenant_id or category.tenant_id
                if product_tenant_id is None:
                    raise ValueError(
                        "Cannot create a product without a tenant: tenant_id is required"
                    )
                product_organization_id = request.organization_id or product_tenant_id

                # 4. Create product entity
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

                # 5. Persist
                await self.product_repository.create(product)
                created_count += 1

            except (CategoryNotFoundError, ValueError, KeyError) as e:
                failed_count += 1
                error_dict: dict[str, str | int] = {
                    "row_number": parsed_product.row_number,
                    "vin": parsed_product.vin,
                    "error": str(e),
                }
                errors.append(error_dict)

        return BulkUploadResult(
            total_count=total_count,
            created_count=created_count,
            failed_count=failed_count,
            errors=errors,
        )
