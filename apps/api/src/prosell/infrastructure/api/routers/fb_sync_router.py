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
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from prosell.application.ports.ido_spaces import IDOSpacesService
from prosell.domain.entities.user import User
from prosell.domain.value_objects.product_status import ProductStatus
from prosell.infrastructure.api.dependencies import (
    FBEncryption,
    get_current_auth_user_from_cookie,
    get_spaces_service,
    verify_bot_token,
)
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.models.fb_account_model import (
    FBAccountModel,
    FBPublicationHistoryModel,
    FBPublicationStatusModel,
)
from prosell.infrastructure.models.marketplace_publication_model import (
    MarketplacePublicationModel,
)
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


@router.get(
    "/pending",
    response_model=PendingProductsResponse,
    dependencies=[Depends(verify_bot_token)],
)
async def get_pending_products(
    db: DbSession,
    spaces: SpacesService,
    account_email: EmailStr = Query(..., description="FB account email"),
    limit: int = Query(10, ge=1, le=50),
) -> PendingProductsResponse:
    """Get products pending publication for a specific FB account.

    Returns products that:
    - Are published in ProSell (status=published)
    - Are marked for marketplace (published_to_marketplace=true)
    - Have NOT been published by this account yet
    - Belong to the SAME tenant as the FB account (multi-tenant scoping)
    """
    # Resolve FB account first to scope by tenant. Refuse if account is missing
    # or inactive — a bot hitting an unknown email is a misconfiguration, not
    # an empty result.
    account_query = select(FBAccountModel).where(FBAccountModel.email == account_email)
    account_result = await db.execute(account_query)
    fb_account = account_result.scalar_one_or_none()
    if not fb_account or fb_account.status != "active":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Active FB account {account_email} not found",
        )

    # Subquery: products already published by this account
    published_subq = (
        select(MarketplacePublicationModel.product_id)
        .where(MarketplacePublicationModel.account_email == account_email)
        .where(MarketplacePublicationModel.status.in_(["active", "pending"]))
    )

    # Main query: tenant-scoped published products not in subquery
    query = (
        select(ProductModel)
        .where(ProductModel.tenant_id == fb_account.tenant_id)
        .where(ProductModel.status == ProductStatus.PUBLISHED)
        .where(ProductModel.published_to_marketplace.is_(True))
        .where(ProductModel.id.not_in(published_subq))
        .limit(limit)
    )

    result = await db.execute(query)
    products = result.scalars().all()

    # Build response with signed URLs
    pending = []
    for p in products:
        # Sign image URLs
        signed_urls = []
        for url in p.image_urls or []:
            # ponytail: assume URLs are storage keys, sign them
            try:
                signed = await spaces.generate_download_url(url, expires_in=SIGNED_URL_TTL)
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

    # Verify the FB account exists, is active, AND belongs to the same
    # tenant as the product. This prevents a bot token from being used to
    # cross-post publications across tenants.
    account_query = select(FBAccountModel).where(FBAccountModel.email == request.account_email)
    account_result = await db.execute(account_query)
    fb_account = account_result.scalar_one_or_none()
    if fb_account is None or fb_account.tenant_id != product.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="FB account does not belong to the product's tenant",
        )
    if fb_account.status != "active":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"FB account is {fb_account.status}, cannot create publication",
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


class FBAccountSummary(BaseModel):
    """Account summary for bot listing."""

    id: UUID
    email: str
    alias: str | None
    status: str
    groups_count: int


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
                email=a.email,
                alias=a.alias,
                status=a.status,
                groups_count=len([g for g in a.groups if g.is_active]),
            )
            for a in accounts
        ]
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
) -> FBAccountConfig:
    """Get full account config with decrypted password.

    Bot calls this to login to FB with stored credentials.
    """
    query = (
        select(FBAccountModel)
        .where(FBAccountModel.email == email)
        .where(FBAccountModel.status == "active")
        .options(selectinload(FBAccountModel.groups))
    )
    result = await db.execute(query)
    account = result.scalar_one_or_none()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Active account with email {email} not found",
        )

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
            if g.is_active
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
