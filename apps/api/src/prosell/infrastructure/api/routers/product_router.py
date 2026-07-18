"""Product router."""

import csv
import io
from datetime import UTC, datetime, timedelta
from typing import Annotated, Literal
from urllib.parse import urlparse
from uuid import UUID, uuid4

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
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.application.dto.product import (
    BulkUploadPreviewResponse,
    BulkUploadRowError,
    BulkUploadUploadResult,
    BulkUploadVehiclesResponse,
    CreateProductRequest,
    ProductImageUrlResponse,
    ProductImageUrlsResponse,
    ProductResponse,
    RejectProductRequest,
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
from prosell.application.use_cases.product.bulk_upload_products import BulkUploadProductsUseCase
from prosell.application.use_cases.product.bulk_upload_vehicles import (
    BulkUploadVehiclesUseCase,
)
from prosell.application.use_cases.product.create_product import CreateProductUseCase
from prosell.application.use_cases.product.delete_product import DeleteProductUseCase
from prosell.application.use_cases.product.list_products import (
    ListProductsUseCase,
    ProductListResponse,
)
from prosell.application.use_cases.product.set_product_ownership import (
    OwnerShare,
    SetProductOwnershipUseCase,
)
from prosell.application.use_cases.product.update_product import UpdateProductUseCase
from prosell.domain.entities.product import Product
from prosell.domain.entities.role import Permission
from prosell.domain.entities.user import User
from prosell.domain.exceptions.category_exceptions import CategoryNotFoundError
from prosell.domain.exceptions.product_exceptions import ProductNotFoundError
from prosell.domain.services.csv_product_parser import CSVParseError, CSVProductParser
from prosell.infrastructure.api.dependencies import (
    get_current_auth_user_from_cookie,
    get_spaces_service,
)
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.models.bulk_upload_error_model import BulkUploadErrorModel
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.models.product_model import ProductModel
from prosell.infrastructure.repositories.category_repository_impl import (
    SqlAlchemyCategoryRepository,
)
from prosell.infrastructure.repositories.organization_repository_impl import (
    SqlAlchemyOrganizationRepository,
)
from prosell.infrastructure.repositories.product_ownership_repository_impl import (
    SqlAlchemyProductOwnershipRepository,
)
from prosell.infrastructure.repositories.product_repository_impl import (
    FILTER_VALUES_MAX_PER_KEY,
    SqlAlchemyProductRepository,
)

router = APIRouter()

CurrentUser = Annotated[User, Depends(get_current_auth_user_from_cookie)]
DbSession = Annotated[AsyncSession, Depends(get_async_session)]
SpacesService = Annotated[IDOSpacesService, Depends(get_spaces_service)]


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


def _merged_image_url_candidates(product: Product) -> list[str]:
    """Return the merged, deduped list of image keys for a product.

    Thin boundary wrapper over the domain rule
    (:meth:`Product.merged_image_keys`) so the sign endpoint keeps a
    local name. The PATCH cover-validator now lives in
    :class:`UpdateProductUseCase`, which calls the entity method directly.
    """
    return product.merged_image_keys()


def _check_org_scope_permission(
    current_user: User, organization_id: UUID | None
) -> tuple[UUID, bool]:
    """Validate organization-scoping authorization shared by every product list
    endpoint that accepts `organization_id`.

    Raises 403 if the caller has no tenant, or if they request another
    organization's `organization_id` without `ORG_ADMIN_VIEW_ALL`. Returns
    `(tenant_id, can_view_all_orgs)` — `tenant_id` is `current_user.tenant_id`
    narrowed to non-None here so callers don't each repeat the None-check.
    Callers still derive their own effective tenant_id from `can_view_all_orgs`
    because they don't all mean the same thing by "no organization_id given"
    (e.g. `list_products` defaults to a global browse for admins,
    `get_featured_products` defaults to the caller's own tenant).
    """
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")

    can_view_all_orgs = current_user.has_permission(Permission.ORG_ADMIN_VIEW_ALL)
    if (
        organization_id is not None
        and not can_view_all_orgs
        and organization_id != current_user.tenant_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot filter products by another organization's organization_id",
        )
    return current_user.tenant_id, can_view_all_orgs


def _require_marketplace_publish(current_user: User) -> None:
    """Require permission for actions that publish or moderate products."""
    if not current_user.has_permission(Permission.MARKETPLACE_PUBLISH):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Marketplace publish permission required",
        )


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    request: CreateProductRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> ProductResponse:
    """
    Create a new product.

    Product is created in DRAFT status by default.
    tenant_id and organization_id are injected from the authenticated user if not provided.
    """
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")

    # ponytail: Admins with ORG_ADMIN_VIEW_ALL can create products for other
    # orgs; regular users always create in their own org. The chosen
    # organization_id is validated against the database below to prevent
    # IDOR — the client claim is only honored if the org actually exists.
    is_org_admin = current_user.has_permission(Permission.ORG_ADMIN_VIEW_ALL)
    if is_org_admin and request.organization_id is not None:
        # Defense in depth: never trust an org id from the client without
        # verifying it exists. tenant_id and organization_id share the same
        # value (per the model documented in admin_organizations_router.list_organization_products).
        org_repo = SqlAlchemyOrganizationRepository(db)
        target_org = await org_repo.get_by_tenant_id(request.organization_id)
        if target_org is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Organization not found: {request.organization_id}",
            )
        target_org_id = target_org.id
    else:
        target_org_id = current_user.tenant_id

    request = request.model_copy(
        update={
            "tenant_id": target_org_id,
            "organization_id": target_org_id,
        }
    )

    # Defense in depth: reject image_urls not under the target tenant
    # before they reach the use case / DB. The DTO format check has
    # already filtered out malformed URLs and non-http(s) schemes.
    # ponytail: admins upload to target org's tenant, not their own
    validate_image_urls_for_tenant(request.image_urls, target_org_id)

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


@router.post(
    "/bulk-upload",
    response_model=BulkUploadUploadResult,
    status_code=status.HTTP_201_CREATED,
)
async def bulk_upload_products(
    current_user: CurrentUser,
    db: DbSession,
    csv_file: UploadFile = File(..., description="CSV file with product data"),
) -> BulkUploadUploadResult:
    """Bulk upload products from a schema-aware CSV file.

    Required columns: title, price, category_id. Any additional columns are
    validated against the category's attribute_schema. Errors are per-row and
    partial success is supported.
    """
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")

    if not csv_file.filename or not csv_file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Only CSV files are supported"
        )

    content = await csv_file.read()
    try:
        csv_content = content.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="CSV must be UTF-8 encoded"
        ) from exc

    product_repo = SqlAlchemyProductRepository(db)
    category_repo = SqlAlchemyCategoryRepository(db)
    csv_parser = CSVProductParser(category_repository=category_repo)
    use_case = BulkUploadProductsUseCase(product_repo, category_repo, csv_parser)

    try:
        parse_result = await csv_parser.parse_csv(
            csv_content=csv_content,
            tenant_id=current_user.tenant_id,
            organization_id=current_user.tenant_id,
        )
    except CSVParseError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc

    use_result = await use_case.execute(
        parsed_products=parse_result.products,
        tenant_id=current_user.tenant_id,
        organization_id=current_user.tenant_id,
    )

    upload_id = uuid4()

    # Merge parse-phase + use-case-phase errors into BulkUploadRowError list
    all_errors: list[BulkUploadRowError] = [
        BulkUploadRowError(
            row_number=e.row_number,
            column=e.column,
            message=e.message,
            raw_row=e.raw_row,
        )
        for e in parse_result.errors
    ] + [
        BulkUploadRowError(
            row_number=int(e["row_number"]),
            message=str(e["message"]),
        )
        for e in use_result.errors
    ]

    if all_errors:
        # Determine category_id for the audit record
        if parse_result.products:
            audit_category_id = parse_result.products[0].category_id
        else:
            try:
                audit_category_id = UUID(parse_result.errors[0].raw_row.get("category_id") or "")
            except (ValueError, IndexError):
                audit_category_id = uuid4()

        error_record = BulkUploadErrorModel(
            id=upload_id,
            tenant_id=current_user.tenant_id,
            category_id=audit_category_id,
            expires_at=datetime.now(UTC) + timedelta(hours=24),
            payload=[e.model_dump() for e in all_errors],
        )
        db.add(error_record)
        await db.flush()

    return BulkUploadUploadResult(
        upload_id=upload_id,
        total_rows=parse_result.total_rows,
        created_count=use_result.created_count,
        failed_count=len(all_errors),
        errors=all_errors,
    )


def _csv_safe(v: object) -> str:
    s = "" if v is None else str(v)
    if s and s[0] in ("=", "+", "-", "@", "\t", "\r"):
        s = "'" + s
    return s


@router.get("/bulk-upload/errors.csv", response_model=None)
async def download_bulk_upload_errors_csv(
    current_user: CurrentUser,
    db: DbSession,
    upload_id: UUID = Query(..., description="Upload ID from the bulk-upload response"),
) -> StreamingResponse:
    """Download a CSV of per-row errors from a previous bulk upload.

    The error record expires 24 hours after the upload. Returns 404 when the
    record doesn't exist, has expired, or belongs to a different tenant.
    """
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")

    result = await db.execute(
        select(BulkUploadErrorModel).where(
            BulkUploadErrorModel.id == upload_id,
            BulkUploadErrorModel.tenant_id == current_user.tenant_id,
            BulkUploadErrorModel.expires_at > datetime.now(UTC),
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Upload error record not found or expired",
        )

    output = io.StringIO()
    fieldnames = ["row_number", "column", "message", "raw_row"]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    for err in record.payload:
        writer.writerow(
            {
                "row_number": _csv_safe(err.get("row_number", "")),
                "column": _csv_safe(err.get("column") or ""),
                "message": _csv_safe(err.get("message", "")),
                "raw_row": _csv_safe(err.get("raw_row", {})),
            }
        )

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=bulk-upload-errors-{upload_id}.csv"},
    )


@router.get("", response_model=ProductListResponse)
async def list_products(
    request: Request,
    current_user: CurrentUser,
    db: DbSession,
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
    tenant_id, can_view_all_orgs = _check_org_scope_permission(current_user, organization_id)

    effective_tenant = None if can_view_all_orgs else tenant_id

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
    if attr_raw and category_id is None:
        # F1 fail-open fix: without a category there's no schema to validate
        # `attr.*` keys against, so any key would reach the JSONB filter
        # pipeline as attacker-controlled column access. Reject up-front.
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "attr.* filters require category_id so keys can be validated "
                "against the category's attribute_schema"
            ),
        )
    if attr_raw and category_id is not None:
        # SECURITY GATE: load the category's attribute_schema and validate
        # every `attr.*` key against it. Unknown / non-filterable keys
        # raise ValueError → HTTP 422, so they can never reach the SQL
        # filter pipeline as an attacker-controlled JSONB key.
        # Resolve against the organization being viewed, not the admin's own
        # tenant — `organization_id` is only honored here when the caller
        # has ORG_ADMIN_VIEW_ALL (validated above), so this can't be used
        # to read another tenant's category as a regular seller.
        category_tenant_id = (
            organization_id if organization_id is not None and can_view_all_orgs else tenant_id
        )
        category_repo = SqlAlchemyCategoryRepository(db)
        category = await category_repo.get_by_id_or_global(category_id, category_tenant_id)
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
    result = await use_case.execute(
        tenant_id=effective_tenant,
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

    # ponytail: batch-fetch the owning organization's code/color in a single
    # query. products.organization_id IS the tenant that owns the product,
    # so we JOIN directly against organizations — no product_ownership
    # hop and no owner_type discriminator (the table now only stores
    # broker (user) shares; see PROP-001-tenant-cascade).
    if result.products:
        product_ids = [p.id for p in result.products]
        owner_query = (
            select(
                ProductModel.id.label("product_id"),
                OrganizationModel.code,
                OrganizationModel.color,
            )
            .join(OrganizationModel, ProductModel.organization_id == OrganizationModel.id)
            .where(ProductModel.id.in_(product_ids))
        )
        owner_rows = await db.execute(owner_query)
        owner_map: dict[UUID, tuple[str | None, str | None]] = {
            row.product_id: (row.code, row.color) for row in owner_rows
        }

        enriched = [
            p.model_copy(
                update={
                    "org_code": owner_map.get(p.id, (None, None))[0],
                    "org_color": owner_map.get(p.id, (None, None))[1],
                }
            )
            for p in result.products
        ]
        return ProductListResponse(
            products=enriched,
            total=result.total,
            skip=result.skip,
            limit=result.limit,
        )

    return result


# ─── Filter values endpoint (mounted at /api/v1/categories in main.py) ──────


filter_values_router = APIRouter()


# F2 sink-arg cap: bound how many DISTINCT values we return per filter key
# to keep responses predictable and prevent a malicious/large dataset from
# producing unbounded payloads. Re-imported from the repo module so the
# SQL `.limit()` and the Python truncation share a single source of truth.


class CategoryFilterValuesResponse(BaseModel):
    """Response shape for GET /categories/{id}/filter-values.

    `truncated` lists the keys whose DISTINCT list was capped at
    ``FILTER_VALUES_MAX_PER_KEY`` so the client can detect missing facets.
    """

    values: dict[str, list[str]]
    truncated: list[str]


@filter_values_router.get(
    "/categories/{category_id}/filter-values",
    response_model=CategoryFilterValuesResponse,
)
async def get_category_filter_values(
    category_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
    organization_id: UUID | None = None,
) -> CategoryFilterValuesResponse:
    """Return DISTINCT values for `select` attributes without static `options`.

    For each field in the category's `attribute_schema` where
    `filter_type=select` AND no static `options` are declared, query
    `Product.attributes` for the DISTINCT non-null values (tenant + category
    scoped) and return them in a `{key: [...]}` map.

    Fields with static `options` are NOT included — those are surfaced
    verbatim from the schema by the catalog UI.

    Each per-key list is capped at :data:`FILTER_VALUES_MAX_PER_KEY`
    entries to bound response size; any key whose result was truncated
    appears in the response's `truncated` list.
    """
    owner_tenant_id, can_view_all_orgs = _check_org_scope_permission(current_user, organization_id)
    tenant_id = (
        organization_id if organization_id is not None and can_view_all_orgs else owner_tenant_id
    )

    category_repo = SqlAlchemyCategoryRepository(db)
    category = await category_repo.get_by_id_or_global(category_id, tenant_id)
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
    raw_values = await product_repo.distinct_attribute_values(tenant_id, category_id, select_keys)

    # F2 sink-arg cap: slice each list and record which keys were truncated.
    capped_values: dict[str, list[str]] = {}
    truncated: list[str] = []
    for key, vals in raw_values.items():
        if len(vals) > FILTER_VALUES_MAX_PER_KEY:
            capped_values[key] = vals[:FILTER_VALUES_MAX_PER_KEY]
            truncated.append(key)
        else:
            capped_values[key] = vals

    return CategoryFilterValuesResponse(values=capped_values, truncated=truncated)


@router.get("/featured", response_model=list[ProductResponse])
async def get_featured_products(
    current_user: CurrentUser,
    db: DbSession,
    organization_id: UUID | None = None,
    limit: int = 10,
) -> list[ProductResponse]:
    """Get featured products."""
    owner_tenant_id, can_view_all_orgs = _check_org_scope_permission(current_user, organization_id)
    tenant_id = (
        organization_id if organization_id is not None and can_view_all_orgs else owner_tenant_id
    )

    repo = SqlAlchemyProductRepository(db)
    products = await repo.get_featured(tenant_id, limit)

    return [ProductResponse.from_entity(p) for p in products]


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
    internal: bool = False,
) -> ProductResponse:
    """Get a product by ID.

    - **internal**: When True, skip view_count increment. Use this for
      seller-side reads (edit forms, admin panels) to avoid polluting
      analytics with internal traffic.

    Admins with ORG_ADMIN_VIEW_ALL can view products from any organization.
    """
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")

    # ponytail: admins can view products from any org
    is_org_admin = current_user.has_permission(Permission.ORG_ADMIN_VIEW_ALL)
    repo = SqlAlchemyProductRepository(db)
    product = await repo.get_by_id(product_id, None if is_org_admin else current_user.tenant_id)

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Only increment view count for public/buyer reads, not internal seller reads
    if not internal:
        await repo.increment_view_count(product_id, product.tenant_id)

    # image_urls are returned as bare storage keys. The browser fetches
    # signed URLs on demand from GET /api/v1/products/{id}/image-urls.
    return ProductResponse.from_entity(product)


@router.get("/{product_id}/image-urls", response_model=ProductImageUrlsResponse)
async def get_product_image_urls(
    product_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
    spaces: SpacesService,
) -> ProductImageUrlsResponse:
    """Get signed URLs for product images.

    DO Spaces is private (403 on direct URLs), so this endpoint generates
    time-limited signed download URLs for each image key stored in
    product.image_urls.

    SECURITY: only keys under the product's tenant prefix are signed.
    Admins with ORG_ADMIN_VIEW_ALL can view images from any organization.
    """
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")

    # ponytail: admins can view products from any org
    is_org_admin = current_user.has_permission(Permission.ORG_ADMIN_VIEW_ALL)
    repo = SqlAlchemyProductRepository(db)
    product = await repo.get_by_id(product_id, None if is_org_admin else current_user.tenant_id)

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # ponytail: use product's tenant for URL signing, not caller's
    tenant_prefix = f"orgs/{product.tenant_id}/"

    # Merge URL candidates from BOTH sources. Legacy data lives in
    # `product.attributes.image_urls` (the pre-migration location); newer
    # products populate the top-level `product.image_urls` column. The endpoint
    # must sign entries from both so that legacy products render their photos.
    # Deduped (order-preserving) so an URL in both sources is signed once.
    merged_urls = _merged_image_url_candidates(product)

    # ponytail: reorder so cover is always first — frontend expects images[0] = cover
    cover_key = product.cover_image_key
    if cover_key and cover_key in merged_urls:
        merged_urls = [cover_key, *(u for u in merged_urls if u != cover_key)]
    elif cover_key:
        merged_urls = [cover_key, *merged_urls]

    signed_images: list[ProductImageUrlResponse] = []
    for url in merged_urls:
        # Extract the storage key. Accepts both URL form (legacy/signed URLs,
        # `scheme://host/<bucket>/<key>`) and bare-key form (post-migration,
        # `orgs/<tenant>/<rest>`). Anything that doesn't reduce to a usable
        # key is dropped — fail-closed, never echo an unsigned URL.
        key = _extract_storage_key_from_value(url) if isinstance(url, str) else None
        if not key:
            continue
        # Defense in depth: only sign keys under the product's tenant. The
        # `attributes` JSONB column is attacker-influenceable in some flows,
        # so we re-verify the key prefix matches the product's tenant here.
        if not key.startswith(tenant_prefix):
            continue
        signed_images.append(
            ProductImageUrlResponse(
                key=key,
                url=await spaces.generate_download_url(key),
                expires_in=3600,
            )
        )

    return ProductImageUrlsResponse(
        product_id=product_id,
        images=signed_images,
        cover_image_key=product.cover_image_key,
    )


@router.patch("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: UUID,
    request: UpdateProductRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> ProductResponse:
    """
    Update a product.

    Only DRAFT, REJECTED, and PAUSED products can be edited.
    Admins with ORG_ADMIN_VIEW_ALL can edit products from any organization.
    """
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")

    # ponytail: admins can edit products from any org
    is_org_admin = current_user.has_permission(Permission.ORG_ADMIN_VIEW_ALL)
    product_repo = SqlAlchemyProductRepository(db)

    # Fetch product first to get its tenant_id for validation
    product = await product_repo.get_by_id(
        product_id, None if is_org_admin else current_user.tenant_id
    )
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    # Defense in depth: reject image_urls not under the product's tenant
    # before they reach the use case / DB. The DTO format check has already
    # filtered out malformed URLs and non-http(s) schemes.
    # ponytail: validate against product's tenant, not caller's
    if request.image_urls is not None:
        validate_image_urls_for_tenant(request.image_urls, product.tenant_id)

    # Gate `published_to_marketplace` behind MARKETPLACE_PUBLISH. Checked at
    # the router boundary (depends on the auth context, not the entity).
    if request.published_to_marketplace is not None and not current_user.has_permission(
        Permission.MARKETPLACE_PUBLISH
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User lacks permission to publish products to the marketplace",
        )

    # Tenant cascade: only ProSell can transfer a product to another
    # organization. Reject 403 at the router boundary before the use case
    # even sees the request. The use case still re-checks as defense in
    # depth so a non-admin caller can't reach it via a different code path.
    if request.organization_id is not None and not is_org_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Changing organization_id requires ORG_ADMIN_VIEW_ALL",
        )

    # All field application, the cover cross-field checks, and server-side
    # title recomposition live in the use case (it needs both the product
    # AND the category loaded — see UpdateProductUseCase).
    category_repo = SqlAlchemyCategoryRepository(db)
    ownership_repo = SqlAlchemyProductOwnershipRepository(db)
    use_case = UpdateProductUseCase(product_repo, category_repo, ownership_repo)

    try:
        # ponytail: pass product's tenant, not caller's
        return await use_case.execute(
            product_id,
            product.tenant_id,
            request,
            is_org_admin=is_org_admin,
        )
    except ProductNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e)) from e


@router.post("/{product_id}/submit", response_model=ProductResponse)
async def submit_product_for_approval(
    product_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
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
    current_user: CurrentUser,
    db: DbSession,
) -> ProductResponse:
    """
    Approve a product.

    Transitions product from PENDING → PUBLISHED.
    Requires MASTER or VERIFIER role.
    """
    _require_marketplace_publish(current_user)
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")
    tenant_id = current_user.tenant_id

    repo = SqlAlchemyProductRepository(db)
    use_case = ApproveProductUseCase(repo)

    return await use_case.execute(product_id, tenant_id, current_user.id)


@router.post("/{product_id}/reject", response_model=ProductResponse)
async def reject_product(
    product_id: UUID,
    request: RejectProductRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> ProductResponse:
    """
    Reject a product.

    Transitions product from PENDING → REJECTED.
    Requires MASTER or VERIFIER role.
    """
    _require_marketplace_publish(current_user)
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")
    tenant_id = current_user.tenant_id

    repo = SqlAlchemyProductRepository(db)
    product = await repo.get_by_id(product_id, tenant_id)

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.reject(current_user.id, request.reason)
    product = await repo.update(product)

    return ProductResponse.from_entity(product)


@router.post("/{product_id}/publish", response_model=ProductResponse)
async def publish_product(
    product_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> ProductResponse:
    """
    Publish product directly (skip approval).

    Transitions product from PENDING → PUBLISHED.
    Admin only - skips approval workflow.
    """
    _require_marketplace_publish(current_user)
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
    current_user: CurrentUser,
    db: DbSession,
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
    current_user: CurrentUser,
    db: DbSession,
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
    current_user: CurrentUser,
    db: DbSession,
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


@router.delete("/{product_id}", response_model=None, status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
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
    current_user: CurrentUser,
    db: DbSession,
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


@router.post("/bulk-upload/preview", response_model=BulkUploadPreviewResponse)
async def bulk_upload_preview(
    current_user: CurrentUser,
    csv_file: UploadFile = File(..., description="CSV file (semicolon-delimited, client format)"),
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
    current_user: CurrentUser,
    db: DbSession,
    csv_file: UploadFile = File(..., description="CSV file (semicolon-delimited, client format)"),
    images_zip: UploadFile | None = File(None, description="Optional ZIP file with vehicle images"),
    organization_id: UUID = Form(..., description="Organization ID for the products"),
    category_id: UUID = Form(..., description="Category ID for vehicles"),
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


# =============================================================================
# PRODUCT BROKERS — tenant cascade split
# =============================================================================
# After the tenant cascade (PROP-001), product_ownership only stores broker
# shares (owner_type='user'). The product's owning organization is the
# products.organization_id column. The "ownership" endpoint was renamed to
# "brokers" to make the split explicit; the old endpoint stays as a
# deprecation alias that rejects organization shares explicitly.
# =============================================================================


class BrokerShareRequest(BaseModel):
    """Single broker share in request. Always owner_type='user'."""

    owner_id: UUID
    percentage: str  # Decimal as string for precision
    owner_type: Literal["user"] = "user"


class SetBrokersRequest(BaseModel):
    """Request to set broker shares for a product."""

    owners: list[BrokerShareRequest]


class OwnerShareRequest(BaseModel):
    """Deprecated. Use BrokerShareRequest. Kept for the legacy endpoint."""

    owner_id: UUID
    owner_type: Literal["organization", "user"] = "organization"
    percentage: str  # Decimal as string for precision


class SetOwnershipRequest(BaseModel):
    """Deprecated. Use SetBrokersRequest. Kept for the legacy endpoint."""

    owners: list[OwnerShareRequest]


class BrokerShareResponse(BaseModel):
    """Single broker share in response."""

    owner_id: UUID
    owner_type: Literal["user"] = "user"
    percentage: str
    created_at: datetime


class BrokersResponse(BaseModel):
    """Response with broker shares for a product."""

    product_id: UUID
    owners: list[BrokerShareResponse]


class OwnerShareResponse(BaseModel):
    """Deprecated. Use BrokerShareResponse."""

    owner_id: UUID
    owner_type: Literal["organization", "user"]
    percentage: str
    created_at: datetime


class OwnershipResponse(BaseModel):
    """Deprecated. Use BrokersResponse."""

    product_id: UUID
    owners: list[OwnerShareResponse]


@router.put(
    "/{product_id}/brokers",
    response_model=BrokersResponse,
    summary="Set product broker shares",
)
async def set_product_brokers(
    product_id: UUID,
    request: SetBrokersRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> BrokersResponse:
    """Set broker shares for a product, replacing any existing broker rows.

    Percentages must sum to 100%. Admins with ORG_ADMIN_VIEW_ALL can set
    brokers for any organization. Product-level ownership is governed by
    products.organization_id and changed via PATCH /products/{id}.
    """
    if current_user.tenant_id is None:
        raise HTTPException(status_code=403, detail="No tenant context")

    is_org_admin = current_user.has_permission(Permission.ORG_ADMIN_VIEW_ALL)
    product_repo = SqlAlchemyProductRepository(db)
    product = await product_repo.get_by_id(
        product_id, None if is_org_admin else current_user.tenant_id
    )
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    ownership_repo = SqlAlchemyProductOwnershipRepository(db)
    use_case = SetProductOwnershipUseCase(
        ownership_repository=ownership_repo,
        product_repository=product_repo,
    )

    from decimal import Decimal

    try:
        await use_case.execute(
            product_id=product_id,
            tenant_id=product.tenant_id,
            owners=[
                OwnerShare(
                    owner_id=o.owner_id,
                    percentage=Decimal(o.percentage),
                    owner_type="user",  # ponytail: brokers endpoint is user-only by schema
                )
                for o in request.owners
            ],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    owners = await ownership_repo.list_owners(product_id)
    return BrokersResponse(
        product_id=product_id,
        owners=[
            BrokerShareResponse(
                owner_id=o.owner_id,
                owner_type="user",
                percentage=str(o.percentage),
                created_at=o.created_at,
            )
            for o in owners
        ],
    )


@router.put(
    "/{product_id}/ownership",
    response_model=OwnershipResponse,
    summary="Set product ownership (deprecated, use /brokers)",
    deprecated=True,
)
async def set_product_ownership(
    product_id: UUID,
    request: SetOwnershipRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> OwnershipResponse:
    """Deprecated alias for PUT /products/{id}/brokers.

    Accepts only owner_type='user' rows. Organization-level ownership has
    moved to PATCH /products/{id} with the `organization_id` field. This
    endpoint is kept temporarily so external scripts keep working; it
    will be removed once the /brokers path is fully adopted.
    """
    if any(o.owner_type != "user" for o in request.owners):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Setting organization ownership here is no longer supported. "
                "Use PATCH /products/{id} with the `organization_id` field, "
                "and POST /products/{id}/brokers for broker shares."
            ),
        )
    if current_user.tenant_id is None:
        raise HTTPException(status_code=403, detail="No tenant context")

    is_org_admin = current_user.has_permission(Permission.ORG_ADMIN_VIEW_ALL)
    product_repo = SqlAlchemyProductRepository(db)
    product = await product_repo.get_by_id(
        product_id, None if is_org_admin else current_user.tenant_id
    )
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    ownership_repo = SqlAlchemyProductOwnershipRepository(db)
    use_case = SetProductOwnershipUseCase(
        ownership_repository=ownership_repo,
        product_repository=product_repo,
    )

    from decimal import Decimal

    try:
        await use_case.execute(
            product_id=product_id,
            tenant_id=product.tenant_id,
            owners=[
                OwnerShare(
                    owner_id=o.owner_id,
                    percentage=Decimal(o.percentage),
                    owner_type="user",
                )
                for o in request.owners
            ],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    owners = await ownership_repo.list_owners(product_id)
    return OwnershipResponse(
        product_id=product_id,
        owners=[
            OwnerShareResponse(
                owner_id=o.owner_id,
                owner_type=o.owner_type,
                percentage=str(o.percentage),
                created_at=o.created_at,
            )
            for o in owners
        ],
    )


@router.get(
    "/{product_id}/ownership",
    response_model=OwnershipResponse,
    summary="Get product ownership",
)
async def get_product_ownership(
    product_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> OwnershipResponse:
    """Get ownership for a product.

    Admins with ORG_ADMIN_VIEW_ALL can view ownership from any organization.
    """
    if current_user.tenant_id is None:
        raise HTTPException(status_code=403, detail="No tenant context")

    # ponytail: admins can view products from any org
    is_org_admin = current_user.has_permission(Permission.ORG_ADMIN_VIEW_ALL)
    product_repo = SqlAlchemyProductRepository(db)
    product = await product_repo.get_by_id(
        product_id, None if is_org_admin else current_user.tenant_id
    )
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    ownership_repo = SqlAlchemyProductOwnershipRepository(db)
    owners = await ownership_repo.list_owners(product_id)

    return OwnershipResponse(
        product_id=product_id,
        owners=[
            OwnerShareResponse(
                owner_id=o.owner_id,
                owner_type=o.owner_type,
                percentage=str(o.percentage),
                created_at=o.created_at,
            )
            for o in owners
        ],
    )
