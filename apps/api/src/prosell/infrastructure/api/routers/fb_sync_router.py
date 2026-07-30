"""Facebook Marketplace sync router.

Endpoints for fb-auto-post bot to sync product publications.
"""

from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import Annotated, Any, Literal, cast
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from prosell.application.ports.ido_spaces import IDOSpacesService
from prosell.domain.value_objects.product_status import ProductStatus
from prosell.infrastructure.api.dependencies import get_spaces_service
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.models.fb_account_model import FBAccountModel
from prosell.infrastructure.models.marketplace_publication_model import (
    MarketplacePublicationModel,
)
from prosell.infrastructure.models.product_model import ProductModel
from prosell.infrastructure.services.fb_encryption_service import get_fb_encryption_service

router = APIRouter(prefix="/fb-sync", tags=["fb-sync"])

DbSession = Annotated[AsyncSession, Depends(get_async_session)]
SpacesService = Annotated[IDOSpacesService, Depends(get_spaces_service)]

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


class SyncCallbackRequest(BaseModel):
    """Bot reports publication result."""

    product_id: UUID
    status: Literal["published", "failed"]
    account_email: EmailStr
    account_alias: str | None = None
    fb_groups: list[int] = []
    fb_post_id: str | None = None  # if published
    error: str | None = None  # if failed


class SyncCallbackResponse(BaseModel):
    """Response for POST /callback."""

    publication_id: UUID
    status: str


@router.get("/pending", response_model=PendingProductsResponse)
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
    """
    # Subquery: products already published by this account
    published_subq = (
        select(MarketplacePublicationModel.product_id)
        .where(MarketplacePublicationModel.account_email == account_email)
        .where(MarketplacePublicationModel.status.in_(["active", "pending"]))
    )

    # Main query: published products not in subquery
    query = (
        select(ProductModel)
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
            except Exception:
                # Skip broken URLs
                continue

        # Extract attributes for FB (cast to Any to satisfy pyright)
        attrs = cast(dict[str, Any], p.attributes or {})

        # Derive vehicle_type from body_type
        body_type = attrs.get("body_type") or ""
        vehicle_type = BODY_TYPE_TO_VEHICLE_TYPE.get(body_type, "Car")

        # Combine location
        city = p.location_city or ""
        state = p.location_state or ""
        location = f"{city}, {state}".strip(", ") if city or state else "Florida"

        # Map condition to FB state
        condition_map = {"new": "Nuevo", "used": "Usado", "certified_pre_owned": "Usado"}
        fb_state = condition_map.get(p.condition, "Usado")

        # Clean title: 1 = has clean title, 0 = no
        clean_title = bool(attrs.get("clean_title"))

        pending.append(
            PendingProduct(
                id=p.id,
                title=p.title,
                price=p.price_cents // 100,  # cents → dollars
                type=vehicle_type,
                location=location,
                year=attrs.get("year"),
                make=attrs.get("make"),
                model=attrs.get("model"),
                mileage=attrs.get("mileage"),
                body_style=body_type,
                exterior_color=attrs.get("exterior_color"),
                interior_color=attrs.get("interior_color"),
                clean_title=clean_title,
                state=fb_state,
                fuel_type=attrs.get("fuel_type"),
                transmission=attrs.get("transmission"),
                description=p.description,
                vin=attrs.get("vin"),
                option="",  # ponytail: not in ProSell yet
                image_urls=signed_urls,
            )
        )

    return PendingProductsResponse(products=pending)


@router.post("/callback", response_model=SyncCallbackResponse, status_code=status.HTTP_201_CREATED)
async def sync_callback(
    request: SyncCallbackRequest,
    db: DbSession,
) -> SyncCallbackResponse:
    """Bot reports publication result (success or failure).

    Creates a marketplace_publications record tracking the result.
    """
    # Get product to fetch tenant_id
    product = await db.get(ProductModel, request.product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product {request.product_id} not found",
        )

    now = datetime.now(UTC)
    publication_id = uuid4()

    if request.status == "published":
        pub_status = "active"
        expires_at = now + timedelta(days=7)
        error_msg = None
    else:
        pub_status = "failed"
        expires_at = now  # doesn't matter for failed
        error_msg = request.error

    publication = MarketplacePublicationModel(
        id=publication_id,
        product_id=request.product_id,
        tenant_id=product.tenant_id,
        platform="facebook",
        account_email=request.account_email,
        account_alias=request.account_alias,
        fb_groups=request.fb_groups,
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


@router.get("/accounts", response_model=FBAccountsResponse)
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


@router.get("/account-config", response_model=FBAccountConfig)
async def get_account_config(
    db: DbSession,
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

    # Decrypt password
    encryption = get_fb_encryption_service()
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
    """Bot reports account health."""

    account_email: EmailStr
    status: Literal["active", "suspended", "restricted"]
    error: str | None = None


@router.post("/account-status", status_code=status.HTTP_200_OK)
async def report_account_status(
    request: AccountStatusRequest,
    db: DbSession,
) -> dict[str, str]:
    """Bot reports account status (suspended, restricted, etc)."""
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

    return {"status": "updated"}


__all__ = ["router"]
