"""Product router."""

from urllib.parse import urlparse
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Request,
    UploadFile,
    status,
)
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
from prosell.application.ports.ido_spaces import IDOSpacesService
from prosell.application.use_cases.product.approve_product import ApproveProductUseCase
from prosell.application.use_cases.product.build_attribute_filters import (
    build_attribute_filters,
)
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
from prosell.application.use_cases.product.update_product import UpdateProductUseCase
from prosell.domain.entities.product import Product
from prosell.domain.entities.user import User
from prosell.domain.exceptions.category_exceptions import CategoryNotFoundError
from prosell.domain.exceptions.product_exceptions import ProductNotFoundError
from prosell.domain.repositories.category_repository import AbstractCategoryRepository
from prosell.domain.repositories.product_repository import AbstractProductRepository
from prosell.domain.services.csv_product_parser import CSVProductParser
from prosell.infrastructure.api.dependencies import (
    get_current_auth_user_from_cookie,
    get_spaces_service,
)
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.repositories.category_repository_impl import (
    SqlAlchemyCategoryRepository,
)
from prosell.infrastructure.repositories.organization_repository_impl import (
    SqlAlchemyOrganizationRepository,
)
from prosell.infrastructure.repositories.product_repository_impl import SqlAlchemyProductRepository

router = APIRouter()


def _extract_storage_key_from_value(value: str) -> str | None:
    """Extract the storage key from a value that may be a URL, a signed URL,
    or a bare key. Returns None if the value is malformed (no usable key).

    Two accepted shapes:
      1. **URL** (legacy / external form): `scheme://host/<bucket>/<key>`.
         The bucket is the first path segment; everything after `<bucket>/`
         is the storage key.
      2. **Bare key** (canonical, post-migration form):
         `orgs/<tenant-uuid>/<rest>`. The whole value is the key.

    For URLs we also drop any `?X-Amz-...` query string (signed URLs) so the
    extraction works for the legacy buggy data too.
    """
    if not value or not isinstance(value, str):
        return None
    # Drop query string (signed URLs embed their signature there).
    without_query = value.split("?", 1)[0]
    # Heuristic: bare keys start with `orgs/` and contain no scheme. URLs
    # always have a scheme separator (`://`).
    if "://" in without_query:
        parsed = urlparse(without_query)
        path = parsed.path.lstrip("/")
        if not path:
            return None
        # Strip the first path segment (the bucket) — what remains is the key.
        _, _, key = path.partition("/")
        return key or None
    # Bare key form: the whole (querystripped) value is the key.
    return without_query or None


def validate_image_urls_for_tenant(
    image_urls: list[str] | None,
    tenant_id: UUID,
) -> None:
    """Reject image_urls whose storage key is not under the caller's tenant.

    Defense in depth — second layer (DTO format is the first, signer
    fail-closed is the third). Ensures cross-tenant image URLs never
    reach the DB in the first place.

    Accepts both shapes (see `_extract_storage_key_from_value`):
      - URL: `scheme://host/<bucket>/<key>` where `<key>` starts with
        `orgs/{tenant_id}/`. The bucket name is intentionally not
        compared — the substring `orgs/{tenant_id}/` is the security
        boundary that matters.
      - Bare key: `orgs/{tenant_id}/<rest>`.

    Raises HTTPException(422) if any entry fails the check. Empty/None
    input is a no-op (no images to validate).
    """
    if not image_urls:
        return

    expected_prefix = f"orgs/{tenant_id}/"
    for url in image_urls:
        key = _extract_storage_key_from_value(url)
        if not key:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"image_urls entry has no storage path: {url!r}",
            )
        if not key.startswith(expected_prefix):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"image_urls entry is not under the caller's tenant ({tenant_id}): {url!r}"
                ),
            )


async def get_product_repository(session: AsyncSession) -> AbstractProductRepository:
    """Get product repository instance."""
    return SqlAlchemyProductRepository(session)


async def get_category_repository(session: AsyncSession) -> AbstractCategoryRepository:
    """Get category repository instance."""
    return SqlAlchemyCategoryRepository(session)


def _merged_image_url_candidates(product: Product) -> list[str]:
    """Return the merged, deduped list of image keys for a product.

    Thin boundary wrapper over the domain rule
    (:meth:`Product.merged_image_keys`) so the sign endpoint keeps a
    local name. The PATCH cover-validator now lives in
    :class:`UpdateProductUseCase`, which calls the entity method directly.
    """
    return product.merged_image_keys()


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

    # Defense in depth: reject image_urls not under the caller's tenant
    # before they reach the use case / DB. The DTO format check has
    # already filtered out malformed URLs and non-http(s) schemes.
    validate_image_urls_for_tenant(request.image_urls, current_user.tenant_id)

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
    request: Request,
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
    - **attr.***: Dynamic attribute filters, e.g. `attr.year_min=2015`,
      `attr.make=Toyota,Honda`. The `attr.` prefix is stripped before
      validation. Each key MUST be declared `filterable=True` in the
      category's `attribute_schema`; non-filterable or unknown keys
      are rejected with 422. Range keys accept `<name>_min`/`<name>_max`.
    """
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")
    tenant_id = current_user.tenant_id

    # Collect `attr.*` query params (strip prefix). Validation happens below
    # only when we have a category to validate against — otherwise any
    # unknown keys would 422 even when `category_id` is not provided
    # (preserves backward-compat for callers that don't use attr filters).
    attr_raw: dict[str, str] = {
        k.removeprefix("attr."): v
        for k, v in request.query_params.multi_items()
        if k.startswith("attr.")
    }

    attribute_filters = None
    if attr_raw and category_id is not None:
        # SECURITY GATE: load the category's attribute_schema and validate
        # every `attr.*` key against it. Unknown / non-filterable keys
        # raise ValueError → HTTP 422, so they can never reach the SQL
        # filter pipeline as an attacker-controlled JSONB key.
        category_repo = SqlAlchemyCategoryRepository(db)
        category = await category_repo.get_by_id(category_id, tenant_id)
        if category is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Category not found: {category_id}",
            )
        schema = category.attribute_schema or {}
        try:
            attribute_filters = build_attribute_filters(attr_raw, schema)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
            ) from exc

    repo = SqlAlchemyProductRepository(db)
    use_case = ListProductsUseCase(repo)

    # image_urls are returned as bare storage keys. The browser fetches
    # signed URLs on demand from GET /api/v1/products/{id}/image-urls.
    return await use_case.execute(
        tenant_id=tenant_id,
        organization_id=organization_id,
        category_id=category_id,
        status=product_status,
        condition=condition,
        is_featured=is_featured,
        search_query=search,
        min_price_cents=min_price,
        max_price_cents=max_price,
        attribute_filters=attribute_filters,
        skip=skip,
        limit=limit,
    )


# ─── Filter values endpoint (mounted at /api/v1/categories in main.py) ──────


filter_values_router = APIRouter()


@filter_values_router.get(
    "/categories/{category_id}/filter-values",
    response_model=dict[str, list[str] | dict[str, list[str]]],
)
async def get_category_filter_values(
    category_id: UUID,
    current_user: User = Depends(get_current_auth_user_from_cookie),
    db: AsyncSession = Depends(get_async_session),
) -> dict[str, dict[str, list[str]]]:
    """Return DISTINCT values for `select` attributes without static `options`.

    For each field in the category's `attribute_schema` where
    `filter_type=select` AND no static `options` are declared, query
    `Product.attributes` for the DISTINCT non-null values (tenant + category
    scoped) and return them in a `{key: [...]}` map.

    Fields with static `options` are NOT included — those are surfaced
    verbatim from the schema by the catalog UI.
    """
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")
    tenant_id = current_user.tenant_id

    category_repo = SqlAlchemyCategoryRepository(db)
    category = await category_repo.get_by_id(category_id, tenant_id)
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category not found: {category_id}",
        )

    schema = category.attribute_schema or {}
    # Select fields WITHOUT static options — these are the ones whose values
    # live in the data, not in the schema.
    select_keys: list[str] = [
        key
        for key, defn in schema.items()
        if isinstance(defn, dict)
        and defn.get("filter_type") == "select"
        and not defn.get("options")
    ]

    product_repo = SqlAlchemyProductRepository(db)
    values = await product_repo.distinct_attribute_values(tenant_id, category_id, select_keys)

    return {"values": values}


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: UUID,
    internal: bool = False,
    current_user: User = Depends(get_current_auth_user_from_cookie),
    db: AsyncSession = Depends(get_async_session),
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

    # image_urls are returned as bare storage keys. The browser fetches
    # signed URLs on demand from GET /api/v1/products/{id}/image-urls.
    return ProductResponse.from_entity(product)


@router.get("/{product_id}/image-urls", response_model=ProductImageUrlsResponse)
async def get_product_image_urls(
    product_id: UUID,
    current_user: User = Depends(get_current_auth_user_from_cookie),
    db: AsyncSession = Depends(get_async_session),
    spaces: IDOSpacesService = Depends(get_spaces_service),
) -> ProductImageUrlsResponse:
    """Get signed URLs for product images.

    DO Spaces is private (403 on direct URLs), so this endpoint generates
    time-limited signed download URLs for each image key stored in
    product.image_urls.

    SECURITY: only keys under the caller's tenant prefix are signed.
    """
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")
    tenant_id = current_user.tenant_id

    repo = SqlAlchemyProductRepository(db)
    product = await repo.get_by_id(product_id, tenant_id)

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    tenant_prefix = f"orgs/{tenant_id}/"

    # Merge URL candidates from BOTH sources. Legacy data lives in
    # `product.attributes.image_urls` (the pre-migration location); newer
    # products populate the top-level `product.image_urls` column. The endpoint
    # must sign entries from both so that legacy products render their photos.
    # Deduped (order-preserving) so an URL in both sources is signed once.
    merged_urls = _merged_image_url_candidates(product)

    signed_images: list[ProductImageUrlResponse] = []
    for url in merged_urls:
        # Extract the storage key. Accepts both URL form (legacy/signed URLs,
        # `scheme://host/<bucket>/<key>`) and bare-key form (post-migration,
        # `orgs/<tenant>/<rest>`). Anything that doesn't reduce to a usable
        # key is dropped — fail-closed, never echo an unsigned URL.
        key = _extract_storage_key_from_value(url) if isinstance(url, str) else None
        if not key:
            continue
        # Defense in depth: only sign keys under the caller's tenant. The
        # product itself is tenant-scoped, but its `attributes` JSONB column
        # is attacker-influenceable in some flows, so we re-verify here.
        if not key.startswith(tenant_prefix):
            continue
        signed_images.append(
            ProductImageUrlResponse(
                key=key,
                url=await spaces.generate_download_url(key),
                expires_in=3600,
            )
        )

    return ProductImageUrlsResponse(product_id=product_id, images=signed_images)


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

    # Defense in depth: reject image_urls not under the caller's tenant
    # before they reach the use case / DB. The DTO format check has already
    # filtered out malformed URLs and non-http(s) schemes. Kept at the
    # router boundary (it depends on the auth context, not the entity).
    if request.image_urls is not None:
        validate_image_urls_for_tenant(request.image_urls, tenant_id)

    # All field application, the cover cross-field checks, and server-side
    # title recomposition live in the use case (it needs both the product
    # AND the category loaded — see UpdateProductUseCase).
    product_repo = SqlAlchemyProductRepository(db)
    category_repo = SqlAlchemyCategoryRepository(db)
    use_case = UpdateProductUseCase(product_repo, category_repo)

    try:
        return await use_case.execute(product_id, tenant_id, request)
    except ProductNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e)) from e


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
