"""Public product router - no authentication required."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.application.dto.product import (
    ProductImageUrlResponse,
    ProductImageUrlsResponse,
    ProductResponse,
)
from prosell.application.ports.ido_spaces import IDOSpacesService
from prosell.domain.value_objects.product_status import ProductStatus
from prosell.infrastructure.api.dependencies import get_spaces_service
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.models.product_model import ProductModel

router = APIRouter()

DbSession = Annotated[AsyncSession, Depends(get_async_session)]
SpacesService = Annotated[IDOSpacesService, Depends(get_spaces_service)]

# Default expiration for signed URLs (1 hour)
SIGNED_URL_EXPIRES_IN = 3600


async def _increment_view_count(product_id: UUID, db: AsyncSession) -> None:
    """Increment view_count. Fails silently - analytics shouldn't break the page."""
    try:
        stmt = (
            update(ProductModel)
            .where(ProductModel.id == product_id)
            .values(view_count=ProductModel.view_count + 1)
        )
        await db.execute(stmt)
        # ponytail: no commit here - let the request's transaction handle it
    except Exception:
        pass


@router.get("/{slug}", response_model=ProductResponse)
async def get_public_product(
    slug: str,
    db: DbSession,
) -> ProductResponse:
    """Get a published product by slug. No authentication required.

    Only returns products that are:
    - status = 'published'
    - published_to_marketplace = True

    Increments view_count for analytics.
    """
    stmt = select(ProductModel).where(
        ProductModel.slug == slug,
        ProductModel.status == ProductStatus.PUBLISHED.value,
        ProductModel.published_to_marketplace.is_(True),
    )
    result = await db.execute(stmt)
    model = result.scalar_one_or_none()

    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found or not published",
        )

    # Track view (fire-and-forget, <1ms)
    await _increment_view_count(model.id, db)

    return ProductResponse(
        id=model.id,
        tenant_id=model.tenant_id,
        organization_id=model.organization_id,
        category_id=model.category_id,
        title=model.title,
        slug=model.slug,
        description=model.description,
        price_cents=model.price_cents,
        currency=model.currency,
        condition=model.condition,
        status=model.status,
        attributes=model.attributes or {},
        image_urls=model.image_urls or [],
        cover_image_key=model.cover_image_key,
        location_city=model.location_city,
        location_state=model.location_state,
        location_zip=model.location_zip,
        is_featured=model.is_featured,
        published_to_marketplace=model.published_to_marketplace,
        view_count=model.view_count + 1,  # Return incremented value
        favorite_count=model.favorite_count,
        submitted_for_approval_at=model.submitted_for_approval_at,
        submitted_by=model.submitted_by,
        approved_at=model.approved_at,
        approved_by=model.approved_by,
        rejection_reason=model.rejection_reason,
        published_at=model.published_at,
        sold_at=model.sold_at,
        archived_at=model.archived_at,
        created_at=model.created_at,
        updated_at=model.updated_at,
    )


@router.get("/{slug}/image-urls", response_model=ProductImageUrlsResponse)
async def get_public_product_image_urls(
    slug: str,
    db: DbSession,
    spaces: SpacesService,
) -> ProductImageUrlsResponse:
    """Get signed image URLs for a published product. No authentication required."""
    stmt = select(ProductModel).where(
        ProductModel.slug == slug,
        ProductModel.status == ProductStatus.PUBLISHED.value,
        ProductModel.published_to_marketplace.is_(True),
    )
    result = await db.execute(stmt)
    model = result.scalar_one_or_none()

    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found or not published",
        )

    # Generate signed download URLs for all images
    images: list[ProductImageUrlResponse] = []
    for key in model.image_urls or []:
        if key:
            signed_url = await spaces.generate_download_url(key, SIGNED_URL_EXPIRES_IN)
            images.append(
                ProductImageUrlResponse(
                    key=key,
                    url=signed_url,
                    expires_in=SIGNED_URL_EXPIRES_IN,
                )
            )

    # Add cover image if different from the list
    if model.cover_image_key and model.cover_image_key not in (model.image_urls or []):
        signed_url = await spaces.generate_download_url(
            model.cover_image_key, SIGNED_URL_EXPIRES_IN
        )
        images.insert(
            0,
            ProductImageUrlResponse(
                key=model.cover_image_key,
                url=signed_url,
                expires_in=SIGNED_URL_EXPIRES_IN,
            ),
        )

    return ProductImageUrlsResponse(
        product_id=model.id,
        images=images,
    )
