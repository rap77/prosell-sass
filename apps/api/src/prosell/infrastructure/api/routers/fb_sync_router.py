"""Facebook Marketplace sync router.

Endpoints for fb-auto-post bot to sync product publications.
"""

import logging
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import Annotated, Literal, TypedDict, cast
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import and_, exists, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from prosell.application.ports.ido_spaces import IDOSpacesService
from prosell.core.config import settings
from prosell.domain.entities.user import User
from prosell.domain.value_objects.product_status import ProductStatus
from prosell.infrastructure.api.dependencies import (
    FBEncryption,
    get_current_auth_user_from_cookie,
    get_spaces_service,
    verify_bot_token,
)
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.images.storage_keys import extract_storage_key_from_value
from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.models.fb_account_model import (
    FBAccountGroupModel,
    FBAccountModel,
    FBGroupCategory,
    FBPublicationHistoryModel,
    FBPublicationStatusModel,
    product_fb_account_assignments,
)
from prosell.infrastructure.models.fb_unpublish_request_model import FBUnpublishRequestModel
from prosell.infrastructure.models.marketplace_publication_model import (
    MarketplacePublicationModel,
)
from prosell.infrastructure.models.organization_marketplace_access_model import (
    OrganizationMarketplaceAccessModel,
)
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.models.product_model import ProductModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/fb-sync", tags=["fb-sync"])

DbSession = Annotated[AsyncSession, Depends(get_async_session)]
SpacesService = Annotated[IDOSpacesService, Depends(get_spaces_service)]


class _VehicleAttributes(TypedDict, total=False):
    """TypedDict for the subset of product attributes the bot needs.

    JSONB-backed `products.attributes` is `dict[str, object]`; we narrow with
    `cast` so the bot payload has type-safe access without `Any`.
    """

    year: int
    make: str
    model: str
    mileage: int
    body_type: str
    exterior_color: str
    interior_color: str
    clean_title: bool
    fuel_type: str
    transmission: str
    vin: str


def _int_attr(attrs: _VehicleAttributes, key: str) -> int | None:
    """Runtime-validated int getter for vehicle attributes."""
    val = attrs.get(key)
    return val if isinstance(val, int) and not isinstance(val, bool) else None


def _str_attr(attrs: _VehicleAttributes, key: str) -> str | None:
    """Runtime-validated str getter for vehicle attributes."""
    val = attrs.get(key)
    return val if isinstance(val, str) else None


async def _category_descendant_ids(db: DbSession, root_id: UUID) -> set[UUID]:
    """Resolve a root vertical to every nested category it contains."""
    result = await db.execute(select(CategoryModel.id, CategoryModel.parent_id))
    children_by_parent: dict[UUID, list[UUID]] = {}
    for category_id, parent_id in result.all():
        if parent_id is not None:
            children_by_parent.setdefault(parent_id, []).append(category_id)

    category_ids = {root_id}
    pending_ids = [root_id]
    while pending_ids:
        parent_id = pending_ids.pop()
        for child_id in children_by_parent.get(parent_id, []):
            if child_id not in category_ids:
                category_ids.add(child_id)
                pending_ids.append(child_id)
    return category_ids


async def _root_verticals(db: DbSession, category_ids: list[UUID]) -> list[tuple[str, str]]:
    """Map product leaf categories to the root vertical displayed by the bot."""
    result = await db.execute(select(CategoryModel))
    categories = {category.id: category for category in result.scalars().all()}
    root_ids: set[UUID] = set()
    for category_id in category_ids:
        current = categories.get(category_id)
        visited_ids: set[UUID] = set()
        while (
            current is not None and current.parent_id is not None and current.id not in visited_ids
        ):
            visited_ids.add(current.id)
            current = categories.get(current.parent_id)
        if current is not None:
            root_ids.add(current.id)

    return sorted((categories[root_id].slug, categories[root_id].name) for root_id in root_ids)


# ponytail: DTOs inline, single use
SIGNED_URL_TTL = 3600  # 1 hour

# ponytail: map body_type to FB vehicle_type, default "Car"
BODY_TYPE_TO_VEHICLE_TYPE: dict[str, str] = {
    "Pickup": "Truck",
    "Truck": "Truck",
    "SUV": "SUV/Crossover",
    "Crossover": "SUV/Crossover",
    "Van": "Van/Minivan",
    "Minivan": "Van/Minivan",
}


class PendingProduct(BaseModel):
    """Product ready for FB publication - flat structure matching fb-auto-post."""

    id: UUID
    title: str
    price: int  # dollars (not cents)
    type: str  # Vehicle Type: Car, Truck, SUV/Crossover, Van/Minivan
    location: str  # "City, State"
    year: int | None = None
    make: str | None = None
    model: str | None = None
    mileage: int | None = None
    body_style: str | None = None  # FB calls it body_style
    exterior_color: str | None = None
    interior_color: str | None = None
    clean_title: bool = False
    state: str = "Usado"  # Vehicle Condition: Nuevo, Usado
    fuel_type: str | None = None
    transmission: str | None = None
    description: str | None = None
    vin: str | None = None
    option: str = ""  # ponytail: features not in ProSell yet
    image_urls: list[str]  # signed URLs for download
    organization_code: str | None = None  # org code badge
    organization_color: str | None = None  # hex color for badge


class PendingProductsResponse(BaseModel):
    """Response for GET /pending."""

    products: list[PendingProduct]


class FBGroupPosted(BaseModel):
    """Group info from bot callback."""

    position: int
    fb_group_id: str | None = None
    name: str | None = None


class SyncCallbackRequest(BaseModel):
    """Bot reports publication result."""

    product_id: UUID
    status: Literal["published", "failed"]
    account_email: EmailStr
    account_alias: str | None = None
    # New: structured group info
    fb_groups: list[FBGroupPosted] = Field(default_factory=list)
    # Legacy: just positions (kept for backwards compat)
    fb_group_positions: list[int] = Field(default_factory=list)
    fb_post_id: str | None = None  # if published
    error: str | None = None  # if failed
    error_code: str | None = None  # rate_limit, suspended, post_limit, etc.


class SyncCallbackResponse(BaseModel):
    """Response for POST /callback."""

    publication_id: UUID
    status: str


MAX_UNPUBLISH_ATTEMPTS = 3


class PendingUnpublishRequest(BaseModel):
    """A queued Facebook listing removal for one bot account."""

    id: UUID
    product_id: UUID
    fb_post_id: str | None
    attempt_count: int


class PendingUnpublishRequestsResponse(BaseModel):
    """Response for GET /unpublish-pending."""

    requests: list[PendingUnpublishRequest]


class UnpublishCallbackRequest(BaseModel):
    """Bot reports the outcome of a queued Facebook listing removal."""

    request_id: UUID
    account_email: EmailStr
    status: Literal["completed", "failed"]
    error: str | None = Field(default=None, max_length=1000)


class UnpublishCallbackResponse(BaseModel):
    """Response for POST /unpublish-callback."""

    request_id: UUID
    status: str
    attempt_count: int


async def _account_can_publish_product(
    db: AsyncSession,
    account: FBAccountModel,
    product: ProductModel,
) -> bool:
    """Return whether an account has an explicit, active right to publish a product."""
    assignment = await db.execute(
        select(product_fb_account_assignments.c.product_id).where(
            product_fb_account_assignments.c.product_id == product.id,
            product_fb_account_assignments.c.fb_account_id == account.id,
        )
    )
    if assignment.scalar_one_or_none() is None:
        return False

    if product.tenant_id == account.tenant_id:
        return True

    access = await db.execute(
        select(OrganizationMarketplaceAccessModel.id).where(
            OrganizationMarketplaceAccessModel.inventory_owner_organization_id
            == product.organization_id,
            OrganizationMarketplaceAccessModel.operator_organization_id == account.tenant_id,
            OrganizationMarketplaceAccessModel.status == "active",
            OrganizationMarketplaceAccessModel.can_publish_marketplace.is_(True),
        )
    )
    return access.scalar_one_or_none() is not None


async def _get_active_fb_account(db: AsyncSession, account_email: EmailStr) -> FBAccountModel:
    """Resolve an active bot account without allowing inactive account work."""
    account = (
        await db.execute(select(FBAccountModel).where(FBAccountModel.email == account_email))
    ).scalar_one_or_none()
    if account is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="FB account not found")
    if account.status != "active":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"FB account is {account.status}",
        )
    return account


@router.get(
    "/unpublish-pending",
    response_model=PendingUnpublishRequestsResponse,
    dependencies=[Depends(verify_bot_token)],
)
async def get_pending_unpublish_requests(
    db: DbSession,
    account_email: EmailStr = Query(..., description="Active FB account polling removal work."),
) -> PendingUnpublishRequestsResponse:
    """Return queued removal work belonging only to the active polling account."""
    account = await _get_active_fb_account(db, account_email)
    requests = (
        (
            await db.execute(
                select(FBUnpublishRequestModel)
                .where(
                    FBUnpublishRequestModel.fb_account_id == account.id,
                    FBUnpublishRequestModel.status == "queued",
                )
                .order_by(FBUnpublishRequestModel.created_at)
            )
        )
        .scalars()
        .all()
    )
    return PendingUnpublishRequestsResponse(
        requests=[
            PendingUnpublishRequest(
                id=request.id,
                product_id=request.product_id,
                fb_post_id=request.fb_post_id,
                attempt_count=request.attempt_count,
            )
            for request in requests
        ]
    )


@router.post(
    "/unpublish-callback",
    response_model=UnpublishCallbackResponse,
    dependencies=[Depends(verify_bot_token)],
)
async def unpublish_callback(
    callback: UnpublishCallbackRequest,
    db: DbSession,
) -> UnpublishCallbackResponse:
    """Persist a bot removal result and update every publication projection."""
    account = await _get_active_fb_account(db, callback.account_email)
    unpublish_request = (
        await db.execute(
            select(FBUnpublishRequestModel)
            .where(
                FBUnpublishRequestModel.id == callback.request_id,
                FBUnpublishRequestModel.fb_account_id == account.id,
            )
            .with_for_update()
        )
    ).scalar_one_or_none()
    if unpublish_request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Unpublish request not found"
        )

    if unpublish_request.status == "completed":
        return UnpublishCallbackResponse(
            request_id=unpublish_request.id,
            status=unpublish_request.status,
            attempt_count=unpublish_request.attempt_count,
        )

    if callback.status == "failed":
        unpublish_request.attempt_count = min(
            unpublish_request.attempt_count + 1, MAX_UNPUBLISH_ATTEMPTS
        )
        unpublish_request.last_error = callback.error or "Removal failed without error detail"
        await db.commit()
        return UnpublishCallbackResponse(
            request_id=unpublish_request.id,
            status=unpublish_request.status,
            attempt_count=unpublish_request.attempt_count,
        )

    now = datetime.now(UTC)
    history_id = uuid4()
    history = FBPublicationHistoryModel(
        id=history_id,
        tenant_id=unpublish_request.tenant_id,
        product_id=unpublish_request.product_id,
        fb_account_id=account.id,
        event_type="deleted",
        fb_post_id=unpublish_request.fb_post_id,
        event_at=now,
    )
    db.add(history)
    publication_status = await db.get(
        FBPublicationStatusModel, unpublish_request.publication_status_id
    )
    if publication_status is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Publication status not found"
        )
    publication_status.status = "deleted"
    publication_status.last_event_id = history_id
    publication_status.last_event_at = now
    publication_status.last_deleted_at = now
    unpublish_request.status = "completed"
    unpublish_request.last_error = None

    legacy_publication_filter = [
        MarketplacePublicationModel.product_id == unpublish_request.product_id,
        MarketplacePublicationModel.account_email == account.email,
        MarketplacePublicationModel.status.in_(["active", "pending"]),
    ]
    if unpublish_request.fb_post_id is None:
        legacy_publication_filter.append(MarketplacePublicationModel.fb_post_id.is_(None))
    else:
        legacy_publication_filter.append(
            MarketplacePublicationModel.fb_post_id == unpublish_request.fb_post_id
        )
    await db.execute(
        update(MarketplacePublicationModel)
        .where(*legacy_publication_filter)
        .values(status="deleted", deleted_at=now, updated_at=now)
    )
    await db.commit()
    return UnpublishCallbackResponse(
        request_id=unpublish_request.id,
        status=unpublish_request.status,
        attempt_count=unpublish_request.attempt_count,
    )


@router.get(
    "/pending",
    response_model=PendingProductsResponse,
    dependencies=[Depends(verify_bot_token)],
)
async def get_pending_products(
    db: DbSession,
    spaces: SpacesService,
    account_email: EmailStr | None = Query(
        None,
        description="FB account email used to resolve publication authorization.",
    ),
    organization_id: UUID | None = Query(None, description="Filter by organization"),
    category: str | None = Query(
        None, description="Filter by vertical/category (vehicles, real_estate, general)"
    ),
    limit: int = Query(50, ge=1, le=200),
) -> PendingProductsResponse:
    """Get products pending publication.

    Returns products that:
    - Are published in ProSell (status=published)
    - Are marked for marketplace (published_to_marketplace=true)
    - Are explicitly assigned to the selected FB account
    - Belong to its tenant or a dealer that authorized its organization
    - Have NOT been published by account_email yet
    - Optionally: belong to organization_id
    - Optionally: match category vertical
    """
    if account_email is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="account_email is required to resolve publication authorization",
        )

    account_query = select(FBAccountModel).where(FBAccountModel.email == account_email)
    account_result = await db.execute(account_query)
    fb_account = account_result.scalar_one_or_none()
    if not fb_account or fb_account.status != "active":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Active FB account {account_email} not found",
        )

    authorized_dealer_orgs = select(
        OrganizationMarketplaceAccessModel.inventory_owner_organization_id
    ).where(
        OrganizationMarketplaceAccessModel.operator_organization_id == fb_account.tenant_id,
        OrganizationMarketplaceAccessModel.status == "active",
        OrganizationMarketplaceAccessModel.can_publish_marketplace.is_(True),
    )

    # Subquery: product has explicit assignment to THIS account
    has_explicit_assignment = exists(
        select(product_fb_account_assignments.c.product_id).where(
            product_fb_account_assignments.c.product_id == ProductModel.id,
            product_fb_account_assignments.c.fb_account_id == fb_account.id,
        )
    )

    # Subquery: product has ANY explicit assignments (to any account)
    has_any_assignment = exists(
        select(product_fb_account_assignments.c.product_id).where(
            product_fb_account_assignments.c.product_id == ProductModel.id
        )
    )

    # Build query with org fallback: explicit assignment OR inherit from org
    # ponytail: null org defaults = all accounts, [] = none, [ids] = specific
    query = (
        select(ProductModel)
        .join(OrganizationModel, ProductModel.organization_id == OrganizationModel.id)
        .where(
            or_(
                # Case 1: product explicitly assigned to this account
                has_explicit_assignment,
                # Case 2: no explicit assignments, inherit from org
                and_(
                    ~has_any_assignment,
                    or_(
                        # org defaults null = all accounts
                        OrganizationModel.default_fb_account_ids.is_(None),
                        # org defaults contains this account
                        OrganizationModel.default_fb_account_ids.contains([fb_account.id]),
                    ),
                ),
            )
        )
        .where(
            or_(
                ProductModel.tenant_id == fb_account.tenant_id,
                ProductModel.organization_id.in_(authorized_dealer_orgs),
            )
        )
        .where(ProductModel.status == ProductStatus.PUBLISHED)
        .where(ProductModel.published_to_marketplace.is_(True))
    )

    # Filter by organization if provided
    if organization_id:
        query = query.where(ProductModel.organization_id == organization_id)

    # The dashboard exposes root verticals while products can live in any
    # descendant category, so resolve the full subtree before filtering.
    if category:
        selected_category = await db.scalar(
            select(CategoryModel).where(CategoryModel.slug == category)
        )
        if selected_category is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown category {category!r}",
            )
        category_ids = await _category_descendant_ids(db, selected_category.id)
        query = query.where(ProductModel.category_id.in_(category_ids))

    published_subq = (
        select(MarketplacePublicationModel.product_id)
        .where(MarketplacePublicationModel.account_email == account_email)
        .where(MarketplacePublicationModel.status.in_(["active", "pending"]))
    )
    query = query.where(ProductModel.id.not_in(published_subq))

    query = query.limit(limit)

    # ponytail: add org fields for badge display
    query = query.add_columns(OrganizationModel.code, OrganizationModel.color)

    result = await db.execute(query)
    rows = result.all()  # tuples: (ProductModel, org_code, org_color)

    # Build response with signed URLs
    pending = []
    for p, org_code, org_color in rows:
        # Sign image URLs. `image_urls` entries may be a bare storage key
        # (`orgs/<uuid>/...`) or a legacy full URL (`http://host/<bucket>/<key>`,
        # possibly already signed) — normalize to the bare key first. Feeding
        # a full URL straight into generate_download_url treats it as the S3
        # object key and produces a doubled, invalid presigned URL.
        signed_urls = []
        for raw_url in p.image_urls or []:
            key = extract_storage_key_from_value(raw_url)
            if not key:
                logger.warning(
                    "Skipping image URL for product %s: no usable storage key in %r",
                    p.id,
                    raw_url,
                )
                continue
            try:
                signed = await spaces.generate_download_url(key, expires_in=SIGNED_URL_TTL)
                signed_urls.append(signed)
            except (ValueError, OSError, KeyError) as exc:
                # Storage client can fail in many ways (missing key, network,
                # malformed URL). Skip but log so ops can investigate.
                logger.warning("Skipping image URL for product %s: %s", p.id, exc)
                continue

        # Narrow product attributes JSONB to typed vehicle keys. We trust the
        # static shape (TypedDict) for pyright but validate each value with
        # isinstance at runtime since JSONB can hold anything.
        attrs = cast(_VehicleAttributes, p.attributes or {})

        # Derive vehicle_type from body_type
        body_type = _str_attr(attrs, "body_type") or ""
        vehicle_type = BODY_TYPE_TO_VEHICLE_TYPE.get(body_type, "Car")

        # Combine location
        city = p.location_city or ""
        state = p.location_state or ""
        location = f"{city}, {state}".strip(", ") if city or state else "Florida"

        # Map condition to FB state
        condition_map = {"new": "Nuevo", "used": "Usado", "certified_pre_owned": "Usado"}
        fb_state = condition_map.get(p.condition, "Usado")

        # Clean title: must be an actual bool (not "false" string from JSONB)
        _clean_title = attrs.get("clean_title")
        clean_title = isinstance(_clean_title, bool) and _clean_title

        pending.append(
            PendingProduct(
                id=p.id,
                title=p.title,
                price=p.price_cents // 100,  # cents → dollars
                type=vehicle_type,
                location=location,
                year=_int_attr(attrs, "year"),
                make=_str_attr(attrs, "make"),
                model=_str_attr(attrs, "model"),
                mileage=_int_attr(attrs, "mileage"),
                body_style=body_type,
                exterior_color=_str_attr(attrs, "exterior_color"),
                interior_color=_str_attr(attrs, "interior_color"),
                clean_title=clean_title,
                state=fb_state,
                fuel_type=_str_attr(attrs, "fuel_type"),
                transmission=_str_attr(attrs, "transmission"),
                description=p.description,
                vin=_str_attr(attrs, "vin"),
                option="",  # ponytail: not in ProSell yet
                image_urls=signed_urls,
                organization_code=org_code,
                organization_color=org_color,
            )
        )

    return PendingProductsResponse(products=pending)


@router.post(
    "/callback",
    response_model=SyncCallbackResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_bot_token)],
)
async def sync_callback(
    request: SyncCallbackRequest,
    db: DbSession,
) -> SyncCallbackResponse:
    """Bot reports publication result (success or failure).

    Creates records in:
    - fb_publication_history (immutable event log)
    - fb_publication_status (consolidated state)
    - marketplace_publications (legacy, kept for backwards compat)
    """
    # Get product to fetch tenant_id
    product = await db.get(ProductModel, request.product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product {request.product_id} not found",
        )

    # Resolve the account, then require an explicit product assignment and an
    # active marketplace agreement for cross-tenant dealer inventory.
    account_query = select(FBAccountModel).where(FBAccountModel.email == request.account_email)
    account_result = await db.execute(account_query)
    fb_account = account_result.scalar_one_or_none()
    if fb_account is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="FB account not found",
        )
    if fb_account.status != "active":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"FB account is {fb_account.status}, cannot create publication",
        )
    if not await _account_can_publish_product(db, fb_account, product):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="FB account is not authorized to publish this product",
        )

    now = datetime.now(UTC)
    publication_id = uuid4()
    history_id = uuid4()

    if request.status == "published":
        pub_status = "active"
        event_type = "published"
        expires_at = now + timedelta(days=7)
        error_msg = None
    else:
        pub_status = "failed"
        event_type = "failed"
        expires_at = now
        error_msg = request.error

    # Build groups posted JSON
    groups_posted = [g.model_dump() for g in request.fb_groups] if request.fb_groups else None
    groups_count = len(request.fb_groups) if request.fb_groups else len(request.fb_group_positions)

    # === NEW: Write to fb_publication_history ===
    if fb_account:
        history = FBPublicationHistoryModel(
            id=history_id,
            tenant_id=product.tenant_id,
            product_id=request.product_id,
            fb_account_id=fb_account.id,
            event_type=event_type,
            fb_post_id=request.fb_post_id,
            fb_groups_posted=groups_posted,
            groups_count=groups_count,
            error_message=error_msg,
            error_code=request.error_code,
            event_at=now,
            expires_at=expires_at if event_type == "published" else None,
        )
        db.add(history)

        # === NEW: Upsert fb_publication_status ===
        status_query = select(FBPublicationStatusModel).where(
            FBPublicationStatusModel.product_id == request.product_id,
            FBPublicationStatusModel.fb_account_id == fb_account.id,
        )
        status_result = await db.execute(status_query)
        pub_status_row = status_result.scalar_one_or_none()

        if pub_status_row:
            # Update existing
            pub_status_row.status = pub_status
            pub_status_row.last_event_id = history_id
            pub_status_row.last_event_at = now
            if event_type == "published":
                pub_status_row.publication_count += 1
                pub_status_row.last_published_at = now
                if not pub_status_row.first_published_at:
                    pub_status_row.first_published_at = now
            else:
                pub_status_row.failure_count += 1
        else:
            # Create new
            pub_status_row = FBPublicationStatusModel(
                id=uuid4(),
                tenant_id=product.tenant_id,
                product_id=request.product_id,
                fb_account_id=fb_account.id,
                status=pub_status,
                last_event_id=history_id,
                last_event_at=now,
                publication_count=1 if event_type == "published" else 0,
                failure_count=0 if event_type == "published" else 1,
                first_published_at=now if event_type == "published" else None,
                last_published_at=now if event_type == "published" else None,
            )
            db.add(pub_status_row)

        # Update account metrics
        fb_account.last_used_at = now
        if event_type == "published":
            fb_account.total_publications += 1
        else:
            fb_account.total_failures += 1
            fb_account.last_error = error_msg
            fb_account.last_error_at = now

    # === LEGACY: Write to marketplace_publications (backwards compat) ===
    # ponytail: keep until dashboard migrates to new tables
    if request.fb_groups:
        legacy_groups = [g.position for g in request.fb_groups]
    else:
        legacy_groups = request.fb_group_positions
    publication = MarketplacePublicationModel(
        id=publication_id,
        product_id=request.product_id,
        tenant_id=product.tenant_id,
        platform="facebook",
        account_email=request.account_email,
        account_alias=request.account_alias,
        fb_groups=legacy_groups,
        fb_post_id=request.fb_post_id,
        published_at=now,
        expires_at=expires_at,
        status=pub_status,
        error_message=error_msg,
    )
    db.add(publication)

    await db.commit()

    return SyncCallbackResponse(
        publication_id=publication_id,
        status=pub_status,
    )


# =============================================================================
# FB ACCOUNTS ENDPOINTS (for bot to fetch credentials)
# =============================================================================


class FBGroupSummary(BaseModel):
    """Group summary for bot."""

    fb_group_id: str | None
    name: str | None
    category: str


class FBAccountSummary(BaseModel):
    """Account summary for bot listing."""

    id: UUID
    tenant_id: UUID  # for scoping /pending calls without account_email
    email: str
    alias: str | None
    status: str
    groups_count: int
    fb_groups: list[FBGroupSummary]


class FBAccountsResponse(BaseModel):
    """Response for GET /accounts."""

    accounts: list[FBAccountSummary]


class FBGroupConfig(BaseModel):
    """Group config for bot."""

    position: int
    fb_group_id: str | None
    name: str | None
    category: str


class FBAccountConfig(BaseModel):
    """Full account config with decrypted password for bot."""

    id: UUID
    email: str
    password: str  # decrypted
    browser: str
    language: str
    time_to_sleep: Decimal
    groups: list[FBGroupConfig]


@router.get(
    "/accounts",
    response_model=FBAccountsResponse,
    dependencies=[Depends(verify_bot_token)],
)
async def get_accounts(db: DbSession) -> FBAccountsResponse:
    """List active FB accounts for bot to iterate.

    ponytail: no auth for now, bot uses internal network.
    Add X-Bot-Token header auth when exposed externally.
    """
    query = (
        select(FBAccountModel)
        .where(FBAccountModel.status == "active")
        .options(selectinload(FBAccountModel.groups))
    )
    result = await db.execute(query)
    accounts = result.scalars().all()

    return FBAccountsResponse(
        accounts=[
            FBAccountSummary(
                id=a.id,
                tenant_id=a.tenant_id,
                email=a.email,
                alias=a.alias,
                status=a.status,
                groups_count=len([g for g in a.groups if g.is_active]),
                fb_groups=[
                    FBGroupSummary(
                        fb_group_id=g.fb_group_id,
                        name=g.name,
                        category=g.category.value if g.category else "general",
                    )
                    for g in a.groups
                    if g.is_active
                ],
            )
            for a in accounts
        ]
    )


class OrganizationSummary(BaseModel):
    """Organization summary for bot filtering."""

    id: UUID
    name: str
    code: str | None


class OrganizationsResponse(BaseModel):
    """Response for GET /organizations."""

    organizations: list[OrganizationSummary]


class VerticalSummary(BaseModel):
    """Product vertical available for an account's current publication queue."""

    slug: str
    name: str


class VerticalsResponse(BaseModel):
    """Available product verticals for a publishing account."""

    verticals: list[VerticalSummary]


@router.get(
    "/organizations",
    response_model=OrganizationsResponse,
    dependencies=[Depends(verify_bot_token)],
)
async def get_organizations(
    db: DbSession,
    account_email: EmailStr = Query(..., description="FB account used to resolve inventory access"),
) -> OrganizationsResponse:
    """List the operator organization and dealer organizations it may publish for.

    The account's operator organization is resolved server-side; callers
    cannot enumerate arbitrary tenants by providing an organization ID.
    """
    account_result = await db.execute(
        select(FBAccountModel).where(FBAccountModel.email == account_email)
    )
    account = account_result.scalar_one_or_none()
    if account is None or account.status != "active":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Active FB account {account_email} not found",
        )

    authorized_dealer_orgs = select(
        OrganizationMarketplaceAccessModel.inventory_owner_organization_id
    ).where(
        OrganizationMarketplaceAccessModel.operator_organization_id == account.tenant_id,
        OrganizationMarketplaceAccessModel.status == "active",
        OrganizationMarketplaceAccessModel.can_publish_marketplace.is_(True),
    )
    query = (
        select(OrganizationModel)
        .where(
            or_(
                OrganizationModel.id == account.tenant_id,
                OrganizationModel.id.in_(authorized_dealer_orgs),
            )
        )
        .order_by(OrganizationModel.name)
    )
    result = await db.execute(query)
    orgs = result.scalars().all()

    return OrganizationsResponse(
        organizations=[OrganizationSummary(id=o.id, name=o.name, code=o.code) for o in orgs]
    )


@router.get(
    "/verticals",
    response_model=VerticalsResponse,
    dependencies=[Depends(verify_bot_token)],
)
async def get_verticals(
    db: DbSession,
    account_email: EmailStr = Query(..., description="FB account used to resolve inventory access"),
) -> VerticalsResponse:
    """List only verticals with products the selected account can publish now."""
    account_result = await db.execute(
        select(FBAccountModel).where(FBAccountModel.email == account_email)
    )
    account = account_result.scalar_one_or_none()
    if account is None or account.status != "active":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Active FB account {account_email} not found",
        )

    authorized_dealer_orgs = select(
        OrganizationMarketplaceAccessModel.inventory_owner_organization_id
    ).where(
        OrganizationMarketplaceAccessModel.operator_organization_id == account.tenant_id,
        OrganizationMarketplaceAccessModel.status == "active",
        OrganizationMarketplaceAccessModel.can_publish_marketplace.is_(True),
    )
    published_subq = (
        select(MarketplacePublicationModel.product_id)
        .where(MarketplacePublicationModel.account_email == account_email)
        .where(MarketplacePublicationModel.status.in_(["active", "pending"]))
    )

    # ponytail: same fallback logic as /pending — explicit assignment OR org defaults
    has_explicit_assignment = exists(
        select(product_fb_account_assignments.c.product_id).where(
            product_fb_account_assignments.c.product_id == ProductModel.id,
            product_fb_account_assignments.c.fb_account_id == account.id,
        )
    )
    has_any_assignment = exists(
        select(product_fb_account_assignments.c.product_id).where(
            product_fb_account_assignments.c.product_id == ProductModel.id
        )
    )

    result = await db.execute(
        select(ProductModel.category_id)
        .join(OrganizationModel, ProductModel.organization_id == OrganizationModel.id)
        .where(
            or_(
                has_explicit_assignment,
                and_(
                    ~has_any_assignment,
                    or_(
                        OrganizationModel.default_fb_account_ids.is_(None),
                        OrganizationModel.default_fb_account_ids.contains([account.id]),
                    ),
                ),
            )
        )
        .where(
            or_(
                ProductModel.tenant_id == account.tenant_id,
                ProductModel.organization_id.in_(authorized_dealer_orgs),
            )
        )
        .where(ProductModel.status == ProductStatus.PUBLISHED)
        .where(ProductModel.published_to_marketplace.is_(True))
        .where(ProductModel.id.not_in(published_subq))
        .distinct()
    )
    verticals = await _root_verticals(db, list(result.scalars().all()))
    return VerticalsResponse(
        verticals=[VerticalSummary(slug=slug, name=name) for slug, name in verticals]
    )


@router.get(
    "/account-config",
    response_model=FBAccountConfig,
    dependencies=[Depends(verify_bot_token)],
)
async def get_account_config(
    db: DbSession,
    encryption: FBEncryption,
    email: EmailStr = Query(..., description="FB account email"),
    category: str | None = Query(
        None,
        description="Filter groups by vertical/category (vehicles, real_estate, etc). "
        "If omitted, returns all active groups.",
    ),
    include_pending_verification: bool = Query(
        False,
        description="Allow the migration verifier to retrieve a pending migrated credential.",
    ),
) -> FBAccountConfig:
    """Get full account config with decrypted password for bot.

    Bot calls this to login to FB with stored credentials. The optional
    `category` filter lets the bot request only the groups relevant to the
    vertical of the product being published (e.g. `vehicles` for a car),
    so the bot doesn't try to post a vehicle into a real-estate group.
    """
    account_status = (
        or_(
            FBAccountModel.status == "active",
            and_(
                FBAccountModel.status.in_(["pending_verification", "verification_failed"]),
                FBAccountModel.migration_token_id.is_not(None),
                FBAccountModel.tenant_id == settings.service_organization_id,
            ),
        )
        if include_pending_verification
        else FBAccountModel.status == "active"
    )
    query = (
        select(FBAccountModel)
        .where(FBAccountModel.email == email)
        .where(account_status)
        .options(selectinload(FBAccountModel.groups))
    )
    result = await db.execute(query)
    account = result.scalar_one_or_none()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Eligible account with email {email} not found",
        )

    # Validate the category filter so a typo doesn't silently return nothing.
    valid_category: str | None = None
    if category:
        try:
            valid_category = FBGroupCategory(category).value
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown category {category!r}. "
                f"Valid: {[c.value for c in FBGroupCategory]}",
            ) from exc

    # Decrypt password via injected service
    password = encryption.decrypt(account.password_encrypted, str(account.tenant_id))

    return FBAccountConfig(
        id=account.id,
        email=account.email,
        password=password,
        browser=account.browser,
        language=account.language,
        time_to_sleep=account.time_to_sleep,
        groups=[
            FBGroupConfig(
                position=g.position,
                fb_group_id=g.fb_group_id,
                name=g.name,
                category=g.category.value,
            )
            for g in account.groups
            if g.is_active and (valid_category is None or g.category.value == valid_category)
        ],
    )


class AccountStatusRequest(BaseModel):
    """Bot reports account health.

    Tenant scope is derived server-side from the resolved FB account —
    never trusted from the client (per project tenant-isolation rule).
    """

    account_email: EmailStr
    status: Literal["active", "suspended", "restricted"]
    error: str | None = None


class AccountStatusResponse(BaseModel):
    """Response for POST /account-status."""

    status: str
    account_email: EmailStr
    updated_at: datetime


@router.post(
    "/account-status",
    response_model=AccountStatusResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(verify_bot_token)],
)
async def report_account_status(
    request: AccountStatusRequest,
    db: DbSession,
) -> AccountStatusResponse:
    """Bot reports account status (suspended, restricted, etc).

    Resolves the account by email and uses its tenant_id for the scope —
    the request body never carries a tenant_id.
    """
    query = select(FBAccountModel).where(FBAccountModel.email == request.account_email)
    result = await db.execute(query)
    account = result.scalar_one_or_none()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Account {request.account_email} not found",
        )

    now = datetime.now(UTC)
    account.status = request.status
    if request.error:
        account.last_error = request.error
        account.last_error_at = now
    account.updated_at = now

    await db.commit()

    return AccountStatusResponse(
        status="updated",
        account_email=account.email,
        updated_at=now,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Group Sync — bot reports the groups it discovered from FB
# ─────────────────────────────────────────────────────────────────────────────


class SyncGroupItem(BaseModel):
    """Single group reported by the bot after scraping FB."""

    fb_group_id: str = Field(..., min_length=1, max_length=50)
    name: str | None = Field(default=None, max_length=255)
    # Bot pre-classifies by name heuristic (`vehicles`, `real_estate`, etc).
    # If it sends a bogus value we fall back to `general` so the row still
    # lands — the admin can override later from the UI.
    category: str = "general"


class SyncGroupsRequest(BaseModel):
    """Bot reports the groups it found while logged in to FB."""

    account_email: EmailStr
    groups: list[SyncGroupItem] = Field(default_factory=list)


class SyncGroupsResponse(BaseModel):
    """Summary of changes applied by the sync."""

    account_email: EmailStr
    groups_seen: int
    groups_created: int
    groups_updated: int
    groups_deactivated: int
    total_active: int


def _normalize_category(raw: str) -> FBGroupCategory:
    """Map a bot-supplied category to the enum, with a safe fallback.

    The bot infers categories from group names via heuristics. Real-world
    group names can be noisy ("Cars & Trucks 🚗 Florida") so we never raise
    — an unknown category just becomes `general`. The admin can override.
    """
    try:
        return FBGroupCategory(raw)
    except ValueError:
        return FBGroupCategory.GENERAL


@router.post(
    "/sync-groups",
    response_model=SyncGroupsResponse,
    dependencies=[Depends(verify_bot_token)],
)
async def sync_groups(
    request: SyncGroupsRequest,
    db: DbSession,
) -> SyncGroupsResponse:
    """Sync the groups a FB account is subscribed to.

    The bot logs into FB, scrapes the list of groups the account has joined,
    and POSTs them here. We UPSERT by `fb_group_id`:

    - **New** `fb_group_id` → INSERT with the next free position.
    - **Existing** `fb_group_id` → UPDATE name + category, force `is_active=true`.
    - **Existing but absent from this batch** → soft-delete (`is_active=false`)
      so historical `total_posts` and `last_post_at` are kept. If the
      operator wants a hard delete, they can do it from the admin UI.

    Tenant scope is derived server-side from the resolved account — never
    trusted from the client (per project tenant-isolation rule).
    """
    # Resolve account by email, scoped tenant is implicit on the row.
    account_query = select(FBAccountModel).where(
        FBAccountModel.email == request.account_email,
    )
    account_result = await db.execute(account_query)
    account = account_result.scalar_one_or_none()
    if account is None or account.status != "active":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Active FB account {request.account_email} not found",
        )

    # Load current groups for diffing.
    groups_query = select(FBAccountGroupModel).where(
        FBAccountGroupModel.fb_account_id == account.id,
    )
    groups_result = await db.execute(groups_query)
    existing: dict[str, FBAccountGroupModel] = {
        g.fb_group_id: g for g in groups_result.scalars().all() if g.fb_group_id
    }

    # Index reported groups by fb_group_id so duplicates in the payload collapse
    # to the last occurrence — same behavior as Sets in most sync APIs.
    reported: dict[str, SyncGroupItem] = {}
    for item in request.groups:
        reported[item.fb_group_id] = item

    # Determine next free position for new groups.
    next_position = max((g.position for g in existing.values()), default=0) + 1

    created = updated = deactivated = 0

    # UPSERT reported groups.
    for fb_group_id, item in reported.items():
        category = _normalize_category(item.category)
        if fb_group_id in existing:
            row = existing[fb_group_id]
            row.name = item.name
            row.category = category
            row.is_active = True
            updated += 1
        else:
            db.add(
                FBAccountGroupModel(
                    fb_account_id=account.id,
                    position=next_position,
                    fb_group_id=fb_group_id,
                    name=item.name,
                    category=category,
                    is_active=True,
                    total_posts=0,
                ),
            )
            next_position += 1
            created += 1

    # Soft-delete the ones missing from this batch.
    for fb_group_id, row in existing.items():
        if fb_group_id not in reported and row.is_active:
            row.is_active = False
            deactivated += 1

    await db.commit()

    # Recount active groups for the response — cheap, and avoids a race with
    # the caller reading right after.
    active_count = sum(1 for g in existing.values() if g.is_active)
    active_count += created  # new rows are active by default

    logger.info(
        "sync-groups for %s: seen=%d created=%d updated=%d deactivated=%d",
        request.account_email,
        len(reported),
        created,
        updated,
        deactivated,
    )

    return SyncGroupsResponse(
        account_email=request.account_email,
        groups_seen=len(reported),
        groups_created=created,
        groups_updated=updated,
        groups_deactivated=deactivated,
        total_active=active_count,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Token Generation (requires user auth, not bot auth)
# ─────────────────────────────────────────────────────────────────────────────


class GenerateTokenResponse(BaseModel):
    """Response for generate-bot-token endpoint."""

    token: str
    message: str


@router.post(
    "/generate-bot-token",
    response_model=GenerateTokenResponse,
    summary="Generate a new bot token",
    description="Generates a secure token for bot authentication. "
    "Requires user JWT auth (not bot token). "
    "Copy the token to FB_BOT_API_KEY on the server and to the bot's .env file.",
)
async def generate_bot_token(
    current_user: Annotated[User, Depends(get_current_auth_user_from_cookie)],
) -> GenerateTokenResponse:
    """Generate a new bot token for fb-sync authentication.

    This endpoint requires USER authentication (JWT cookie), not bot token.
    The generated token should be:
    1. Set as FB_BOT_API_KEY on the ProSell server
    2. Set as FB_PROSELL_BOT_TOKEN on the bot's .env file

    Both sides must use the same token for authentication to work.
    """
    import secrets

    token = secrets.token_urlsafe(32)

    logger.info(
        "Bot token generated by user %s (tenant: %s)",
        current_user.id,
        current_user.tenant_id,
    )

    return GenerateTokenResponse(
        token=token,
        message="Set as FB_BOT_API_KEY (server) and FB_PROSELL_BOT_TOKEN (bot).",
    )


__all__ = ["router"]
