"""Facebook Marketplace sync router.

Endpoints for fb-auto-post bot to sync product publications.
"""

from datetime import UTC, datetime, timedelta
from typing import Annotated, Any, Literal, cast
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.application.ports.ido_spaces import IDOSpacesService
from prosell.domain.value_objects.product_status import ProductStatus
from prosell.infrastructure.api.dependencies import get_spaces_service
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.models.marketplace_publication_model import (
    MarketplacePublicationModel,
)
from prosell.infrastructure.models.product_model import ProductModel

router = APIRouter(prefix="/fb-sync", tags=["fb-sync"])

DbSession = Annotated[AsyncSession, Depends(get_async_session)]
SpacesService = Annotated[IDOSpacesService, Depends(get_spaces_service)]

# ponytail: DTOs inline, single use
SIGNED_URL_TTL = 3600  # 1 hour


class ProductAttributes(BaseModel):
    """Attributes subset for FB posting."""

    year: int | None = None
    make: str | None = None
    model: str | None = None
    mileage: int | None = None
    body_type: str | None = None
    exterior_color: str | None = None
    interior_color: str | None = None
    fuel_type: str | None = None
    transmission: str | None = None
    clean_title: bool | None = None
    vin: str | None = None


class PendingProduct(BaseModel):
    """Product ready for FB publication."""

    id: UUID
    title: str
    price: int  # cents
    currency: str
    description: str | None
    location_city: str | None
    location_state: str | None
    attributes: ProductAttributes
    image_urls: list[str]  # signed URLs


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
        pending.append(
            PendingProduct(
                id=p.id,
                title=p.title,
                price=p.price_cents,
                currency=p.currency,
                description=p.description,
                location_city=p.location_city,
                location_state=p.location_state,
                attributes=ProductAttributes(
                    year=attrs.get("year"),
                    make=attrs.get("make"),
                    model=attrs.get("model"),
                    mileage=attrs.get("mileage"),
                    body_type=attrs.get("body_type"),
                    exterior_color=attrs.get("exterior_color"),
                    interior_color=attrs.get("interior_color"),
                    fuel_type=attrs.get("fuel_type"),
                    transmission=attrs.get("transmission"),
                    clean_title=attrs.get("clean_title"),
                    vin=attrs.get("vin"),
                ),
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


__all__ = ["router"]
