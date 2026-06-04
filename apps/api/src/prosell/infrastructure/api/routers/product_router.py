"""Product router."""

from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.application.dto.product import (
    BulkUploadPreviewResponse,
    BulkUploadVehiclesResponse,
    CreateProductRequest,
    ProductImageUrlResponse,
    ProductImageUrlsResponse,
    ProductResponse,
    UpdateProductRequest,
    VehicleImportRowResponse,
)
from prosell.application.use_cases.product.approve_product import ApproveProductUseCase
from prosell.application.use_cases.product.bulk_upload_preview import (
    BulkUploadPreviewUseCase,
)
from prosell.application.use_cases.product.bulk_upload_products import (
    BulkUploadProductsUseCase,
    BulkUploadResult,
)
from prosell.application.use_cases.product.bulk_upload_vehicles import (
    BulkUploadVehiclesUseCase,
)
from prosell.application.use_cases.product.create_product import CreateProductUseCase
from prosell.application.use_cases.product.delete_product import DeleteProductUseCase
from prosell.application.use_cases.product.list_products import (
    ListProductsUseCase,
    ProductListResponse,
)
from prosell.application.ports.ido_spaces import IDOSpacesService
from prosell.domain.entities.user import User
from prosell.domain.exceptions.category_exceptions import CategoryNotFoundError
from prosell.domain.repositories.category_repository import AbstractCategoryRepository
from prosell.domain.repositories.product_repository import AbstractProductRepository
from prosell.domain.services.csv_product_parser import CSVProductParser
from prosell.infrastructure.api.dependencies import get_current_auth_user_from_cookie, get_spaces_service
from prosell.infrastructure.api.routers.image_router import sign_image_urls
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.repositories.category_repository_impl import (
    SqlAlchemyCategoryRepository,
)
from prosell.infrastructure.repositories.organization_repository_impl import (
    SqlAlchemyOrganizationRepository,
)
from prosell.infrastructure.repositories.product_repository_impl import SqlAlchemyProductRepository

router = APIRouter()


async def get_product_repository(session: AsyncSession) -> AbstractProductRepository:
    """Get product repository instance."""
    return SqlAlchemyProductRepository(session)


async def get_category_repository(session: AsyncSession) -> AbstractCategoryRepository:
    """Get category repository instance."""
    return SqlAlchemyCategoryRepository(session)


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    request: CreateProductRequest,
    current_user: User = Depends(get_current_auth_user_from_cookie),
    db: AsyncSession = Depends(get_async_session),
) -> ProductResponse:
    """
    Create a new product.

    Product is created in DRAFT status by default.
    tenant_id and organization_id are injected from the authenticated user if not provided.
    """
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")

    # Always use auth context — never trust tenant_id/organization_id from the client
    request = request.model_copy(
        update={
            "tenant_id": current_user.tenant_id,
            "organization_id": current_user.tenant_id,
        }
    )

    # Execute use case
    product_repo = SqlAlchemyProductRepository(db)
    category_repo = SqlAlchemyCategoryRepository(db)
    use_case = CreateProductUseCase(product_repo, category_repo)

    try:
        return await use_case.execute(request)
    except CategoryNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e)) from e


@router.post("/bulk-upload", response_model=BulkUploadResult, status_code=status.HTTP_201_CREATED)
async def bulk_upload_products(
    csv_file: UploadFile = File(..., description="CSV file with product data"),
    current_user: User = Depends(get_current_auth_user_from_cookie),
    db: AsyncSession = Depends(get_async_session),
) -> BulkUploadResult:
    """
    Bulk upload products from CSV file.

    CSV format requirements:
    - Required columns: vin, title, price, category_id
    - Optional columns: description, condition, currency, location_city, location_state,
    location_zip, attributes

    The endpoint:
    - Parses CSV and validates all rows
    - Continues processing after individual row errors (partial success)
    - Returns detailed error reporting with row numbers and VINs
    - Creates products in DRAFT status

    Example CSV:
    ```csv
    vin,title,price,category_id,description,condition
    1HGCM82633A123456,2020 Honda Accord,25000.00,123e4567-e89b-12d3-a456-426614174000,Well
    maintained,used
    1HGCM82633A123457,2021 Honda Civic,22000.00,123e4567-e89b-12d3-a456-426614174000,Like new,used
    ```
    """
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")

    # Validate CSV file
    if not csv_file.filename or not csv_file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Only CSV files are supported"
        )

    # Read CSV content
    content = await csv_file.read()
    csv_content = content.decode("utf-8")

    # Execute use case
    product_repo = SqlAlchemyProductRepository(db)
    category_repo = SqlAlchemyCategoryRepository(db)
    csv_parser = CSVProductParser()
    use_case = BulkUploadProductsUseCase(product_repo, category_repo, csv_parser)

    # Parse CSV
    parse_result = await csv_parser.parse_csv(
        csv_content=csv_content,
        tenant_id=current_user.tenant_id,
        organization_id=current_user.tenant_id,
    )

    # Bulk upload
    return await use_case.execute(
        parsed_products=parse_result.products,
        tenant_id=current_user.tenant_id,
        organization_id=current_user.tenant_id,
    )


@router.get("", response_model=ProductListResponse)
async def list_products(
    organization_id: UUID | None = None,
    category_id: UUID | None = None,
    product_status: str | None = Query(default=None, alias="status"),
    condition: str | None = None,
    is_featured: bool | None = None,
    search: str | None = None,
    min_price: int | None = None,
    max_price: int | None = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_auth_user_from_cookie),
    db: AsyncSession = Depends(get_async_session),
    spaces: IDOSpacesService = Depends(get_spaces_service),
) -> ProductListResponse:
    """
    List products with optional filters.

    - **organization_id**: Filter by organization
    - **category_id**: Filter by category
    - **status**: Filter by status (draft, pending, published, etc.)
    - **condition**: Filter by condition (new, used, etc.)
    - **is_featured**: Filter by featured status
    - **search**: Text search in title/description
    - **min_price**: Minimum price in cents
    - **max_price**: Maximum price in cents
    - **skip**: Pagination offset
    - **limit**: Max records per page
    """
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")
    tenant_id = current_user.tenant_id

    repo = SqlAlchemyProductRepository(db)
    use_case = ListProductsUseCase(repo)

    result = await use_case.execute(
        tenant_id=tenant_id,
        organization_id=organization_id,
        category_id=category_id,
        status=product_status,
        condition=condition,
        is_featured=is_featured,
        search_query=search,
        min_price_cents=min_price,
        max_price_cents=max_price,
        skip=skip,
        limit=limit,
    )

    # Sign each product's image_urls[] so the browser can fetch from the private
    # bucket. The signer inside DOSpacesService uses the public endpoint
    # (e.g. http://localhost:9000) so the signature matches the host the
    # browser will actually use.
    for product in result.products:
        if product.image_urls:
            product.image_urls = await sign_image_urls(product.image_urls, spaces)

    return result


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: UUID,
    internal: bool = False,
    current_user: User = Depends(get_current_auth_user_from_cookie),
    db: AsyncSession = Depends(get_async_session),
    spaces: IDOSpacesService = Depends(get_spaces_service),
) -> ProductResponse:
    """Get a product by ID.

    - **internal**: When True, skip view_count increment. Use this for
      seller-side reads (edit forms, admin panels) to avoid polluting
      analytics with internal traffic.
    """
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")
    tenant_id = current_user.tenant_id

    repo = SqlAlchemyProductRepository(db)
    product = await repo.get_by_id(product_id, tenant_id)

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Only increment view count for public/buyer reads, not internal seller reads
    if not internal:
        await repo.increment_view_count(product_id, tenant_id)

    response = ProductResponse.from_entity(product)

    # Sign each image_url so the browser can fetch from the private bucket.
    if response.image_urls:
        response.image_urls = await sign_image_urls(response.image_urls, spaces)

    return response


@router.get("/{product_id}/image-urls", response_model=ProductImageUrlsResponse)
async def get_product_image_urls(
    product_id: UUID,
    current_user: User = Depends(get_current_auth_user_from_cookie),
    db: AsyncSession = Depends(get_async_session),
) -> ProductImageUrlsResponse:
    """Get signed URLs for product images.

    DO Spaces is private (403 on direct URLs), so this endpoint generates
    time-limited signed download URLs for each image key stored in
    product.image_urls.
    """
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")

    repo = SqlAlchemyProductRepository(db)
    product = await repo.get_by_id(product_id, current_user.tenant_id)

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    spaces = get_spaces_service()
    image_keys = product.image_urls or []

    images = [
        ProductImageUrlResponse(key=key, url=await spaces.generate_download_url(key), expires_in=3600)
        for key in image_keys
    ]

    return ProductImageUrlsResponse(product_id=product_id, images=images)


@router.patch("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: UUID,
    request: UpdateProductRequest,
    current_user: User = Depends(get_current_auth_user_from_cookie),
    db: AsyncSession = Depends(get_async_session),
) -> ProductResponse:
    """
    Update a product.

    Only DRAFT, REJECTED, and PAUSED products can be edited.
    """
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")
    tenant_id = current_user.tenant_id

    repo = SqlAlchemyProductRepository(db)
    product = await repo.get_by_id(product_id, tenant_id)

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Update basic fields
    if request.title is not None:
        product.title = request.title
    if request.description is not None:
        product.description = request.description
    if request.price_cents is not None:
        product.price_cents = request.price_cents
    if request.category_id is not None:
        product.category_id = request.category_id
    if request.condition is not None:
        product.condition = request.condition
    if request.attributes is not None:
        product.attributes = request.attributes
    if request.image_urls is not None:
        product.image_urls = request.image_urls
    if request.location_city is not None:
        product.location_city = request.location_city
    if request.location_state is not None:
        product.location_state = request.location_state
    if request.location_zip is not None:
        product.location_zip = request.location_zip

    product = await repo.update(product)

    return ProductResponse.from_entity(product)


@router.post("/{product_id}/submit", response_model=ProductResponse)
async def submit_product_for_approval(
    product_id: UUID,
    current_user: User = Depends(get_current_auth_user_from_cookie),
    db: AsyncSession = Depends(get_async_session),
) -> ProductResponse:
    """
    Submit product for approval.

    Transitions product from DRAFT/REJECTED → PENDING.
    """
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")
    tenant_id = current_user.tenant_id

    repo = SqlAlchemyProductRepository(db)
    product = await repo.get_by_id(product_id, tenant_id)

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.submit_for_approval(current_user.id)
    product = await repo.update(product)

    return ProductResponse.from_entity(product)


@router.post("/{product_id}/approve", response_model=ProductResponse)
async def approve_product(
    product_id: UUID,
    current_user: User = Depends(get_current_auth_user_from_cookie),
    db: AsyncSession = Depends(get_async_session),
) -> ProductResponse:
    """
    Approve a product.

    Transitions product from PENDING → PUBLISHED.
    Requires MASTER or VERIFIER role.
    """
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")
    tenant_id = current_user.tenant_id

    repo = SqlAlchemyProductRepository(db)
    use_case = ApproveProductUseCase(repo)

    return await use_case.execute(product_id, tenant_id, current_user.id)


@router.post("/{product_id}/reject", response_model=ProductResponse)
async def reject_product(
    product_id: UUID,
    reason: str,
    current_user: User = Depends(get_current_auth_user_from_cookie),
    db: AsyncSession = Depends(get_async_session),
) -> ProductResponse:
    """
    Reject a product.

    Transitions product from PENDING → REJECTED.
    Requires MASTER or VERIFIER role.
    """
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")
    tenant_id = current_user.tenant_id

    repo = SqlAlchemyProductRepository(db)
    product = await repo.get_by_id(product_id, tenant_id)

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.reject(current_user.id, reason)
    product = await repo.update(product)

    return ProductResponse.from_entity(product)


@router.post("/{product_id}/publish", response_model=ProductResponse)
async def publish_product(
    product_id: UUID,
    current_user: User = Depends(get_current_auth_user_from_cookie),
    db: AsyncSession = Depends(get_async_session),
) -> ProductResponse:
    """
    Publish product directly (skip approval).

    Transitions product from PENDING → PUBLISHED.
    Admin only - skips approval workflow.
    """
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")
    tenant_id = current_user.tenant_id

    repo = SqlAlchemyProductRepository(db)
    product = await repo.get_by_id(product_id, tenant_id)

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.publish()
    product = await repo.update(product)

    return ProductResponse.from_entity(product)


@router.post("/{product_id}/pause", response_model=ProductResponse)
async def pause_product(
    product_id: UUID,
    current_user: User = Depends(get_current_auth_user_from_cookie),
    db: AsyncSession = Depends(get_async_session),
) -> ProductResponse:
    """
    Pause a published product.

    Transitions product from PUBLISHED → PAUSED.
    """
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")
    tenant_id = current_user.tenant_id

    repo = SqlAlchemyProductRepository(db)
    product = await repo.get_by_id(product_id, tenant_id)

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.pause()
    product = await repo.update(product)

    return ProductResponse.from_entity(product)


@router.post("/{product_id}/resume", response_model=ProductResponse)
async def resume_product(
    product_id: UUID,
    current_user: User = Depends(get_current_auth_user_from_cookie),
    db: AsyncSession = Depends(get_async_session),
) -> ProductResponse:
    """
    Resume a paused product.

    Transitions product from PAUSED → PUBLISHED.
    """
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")
    tenant_id = current_user.tenant_id

    repo = SqlAlchemyProductRepository(db)
    product = await repo.get_by_id(product_id, tenant_id)

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.resume()
    product = await repo.update(product)

    return ProductResponse.from_entity(product)


@router.post("/{product_id}/mark-sold", response_model=ProductResponse)
async def mark_product_sold(
    product_id: UUID,
    current_user: User = Depends(get_current_auth_user_from_cookie),
    db: AsyncSession = Depends(get_async_session),
) -> ProductResponse:
    """
    Mark product as sold.

    Transitions product from PUBLISHED/RESERVED → SOLD.
    """
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")
    tenant_id = current_user.tenant_id

    repo = SqlAlchemyProductRepository(db)
    product = await repo.get_by_id(product_id, tenant_id)

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.mark_sold()
    product = await repo.update(product)

    return ProductResponse.from_entity(product)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: UUID,
    current_user: User = Depends(get_current_auth_user_from_cookie),
    db: AsyncSession = Depends(get_async_session),
) -> None:
    """
    Hard-delete a product and cascade to vehicle.

    ON DELETE CASCADE on vehicles.product_id ensures vehicle record is
    automatically deleted. This is a permanent, irreversible operation.

    Requires: product must belong to user's tenant.
    """
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")
    tenant_id = current_user.tenant_id

    repo = SqlAlchemyProductRepository(db)
    use_case = DeleteProductUseCase(repo)

    try:
        await use_case.execute(product_id, tenant_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.post("/{product_id}/archive", response_model=ProductResponse)
async def archive_product(
    product_id: UUID,
    current_user: User = Depends(get_current_auth_user_from_cookie),
    db: AsyncSession = Depends(get_async_session),
) -> ProductResponse:
    """
    Archive a product (soft delete).

    Transitions any status → ARCHIVED.
    """
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")
    tenant_id = current_user.tenant_id

    repo = SqlAlchemyProductRepository(db)
    product = await repo.get_by_id(product_id, tenant_id)

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.archive()
    product = await repo.update(product)

    return ProductResponse.from_entity(product)


@router.get("/featured", response_model=list[ProductResponse])
async def get_featured_products(
    limit: int = 10,
    current_user: User = Depends(get_current_auth_user_from_cookie),
    db: AsyncSession = Depends(get_async_session),
) -> list[ProductResponse]:
    """Get featured products."""
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")
    tenant_id = current_user.tenant_id

    repo = SqlAlchemyProductRepository(db)
    products = await repo.get_featured(tenant_id, limit)

    return [ProductResponse.from_entity(p) for p in products]


@router.post("/bulk-upload/preview", response_model=BulkUploadPreviewResponse)
async def bulk_upload_preview(
    csv_file: UploadFile = File(..., description="CSV file (semicolon-delimited, client format)"),
    current_user: User = Depends(get_current_auth_user_from_cookie),
) -> BulkUploadPreviewResponse:
    """
       Preview bulk upload — dry-run analysis of a client-format CSV.

       This endpoint:
       - Reads the CSV (semicolon-delimited, 23 columns from client)
       - Maps each row using CSVFieldMapper
       - Returns per-row analysis WITHOUT modifying the database
       - Shows mapped fields, missing fields, unmapped columns, and images found

       CSV format (client):
    ```
       id;title;price;category;type;location;year;make;model;mileage;body_style;
       exterior_color;interior_color;clean_title;state;fuel_type;transmission;
       option;description;path;groups;label;publicado;VIN
       ```

       Unlike the standard bulk-upload, this endpoint:
       - Does NOT require category_id or organization_id
       - Does NOT write anything to the database
       - Supports the client CSV format automatically (semicolon delimiter)
    """
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")

    # Validate CSV file
    if not csv_file.filename or not csv_file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Only CSV files are supported"
        )

    # Read CSV content
    content = await csv_file.read()
    csv_content = content.decode("utf-8")

    # Execute preview use case
    use_case = BulkUploadPreviewUseCase()
    result = await use_case.execute(csv_content)

    return BulkUploadPreviewResponse(
        total_rows=result.total_rows,
        rows=result.rows,
        summary=result.summary,
    )


@router.post("/bulk-upload/with-images", response_model=BulkUploadVehiclesResponse)
async def bulk_upload_with_images(
    csv_file: UploadFile = File(..., description="CSV file (semicolon-delimited, client format)"),
    images_zip: UploadFile | None = File(None, description="Optional ZIP file with vehicle images"),
    organization_id: UUID = Form(..., description="Organization ID for the products"),
    category_id: UUID = Form(..., description="Category ID for vehicles"),
    current_user: User = Depends(get_current_auth_user_from_cookie),
    db: AsyncSession = Depends(get_async_session),
) -> BulkUploadVehiclesResponse:
    """
    Bulk upload vehicles from CSV with optional image ZIP.

    This endpoint:
    - Parses CSV (semicolon-delimited, 23 columns from client)
    - Maps images from ZIP file using path matching
    - Upserts products by VIN (update if exists, create if not)
    - Associates images with products in DO Spaces

    CSV format (client):
    ```
    id;title;price;category;type;location;year;make;model;mileage;body_style;
    exterior_color;interior_color;clean_title;state;fuel_type;transmission;
    option;description;path;groups;label;publicado;VIN
    ```

    Requires:
    - Valid JWT authentication
    - organization_id and category_id as form fields
    - Optional ZIP file with images organized by path
    """
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")

    # IDOR prevention: verify organization belongs to user's tenant
    org_repo = SqlAlchemyOrganizationRepository(db)
    org = await org_repo.get_by_id(org_id=organization_id, tenant_id=current_user.tenant_id)
    if org is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organization not found or access denied",
        )

    # Validate CSV file
    if not csv_file.filename or not csv_file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Only CSV files are supported"
        )

    # Read CSV content
    csv_content = await csv_file.read()
    csv_content_str = csv_content.decode("utf-8")

    # Read ZIP if provided
    zip_bytes: bytes | None = None
    if images_zip and images_zip.filename and images_zip.filename.endswith(".zip"):
        zip_bytes = await images_zip.read()

    # Execute use case
    product_repo = SqlAlchemyProductRepository(db)
    category_repo = SqlAlchemyCategoryRepository(db)
    use_case = BulkUploadVehiclesUseCase(
        product_repository=product_repo,
        category_repository=category_repo,
    )

    result = await use_case.execute(
        csv_content=csv_content_str,
        tenant_id=current_user.tenant_id,
        organization_id=organization_id,
        category_id=category_id,
        zip_bytes=zip_bytes,
    )

    return BulkUploadVehiclesResponse(
        total_rows=result.total_rows,
        imported_count=result.imported_count,
        updated_count=result.updated_count,
        failed_count=result.failed_count,
        results=[
            VehicleImportRowResponse(
                row_number=r.row_number,
                vin=r.vin,
                product_id=r.product_id,
                images_uploaded=r.images_uploaded,
                status=r.status,
                errors=r.errors,
            )
            for r in result.results
        ],
    )
