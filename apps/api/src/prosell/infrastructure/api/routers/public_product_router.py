"""Public product router - no authentication required."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.application.dto.product import (
    ProductImageUrlResponse,
    ProductImageUrlsResponse,
    PublicProductListItem,
    PublicProductListResponse,
    PublicProductResponse,
)
from prosell.domain.entities.organization import Organization
from prosell.domain.entities.product import Product
from prosell.domain.ports.ido_spaces import IDOSpacesService
from prosell.domain.repositories.organization_repository import (
    AbstractOrganizationRepository,
)
from prosell.domain.services.storage_keys import extract_storage_key_from_value
from prosell.domain.value_objects.organization_contact import OrganizationContact
from prosell.domain.value_objects.product_condition import ProductCondition
from prosell.domain.value_objects.product_status import ProductStatus
from prosell.infrastructure.api.dependencies import (
    get_organization_repository,
    get_spaces_service,
)
from prosell.infrastructure.api.routers.product_router import (
    _merged_image_url_candidates,
)
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.models.product_model import ProductModel
from prosell.infrastructure.repositories.product_repository_impl import (
    SqlAlchemyProductRepository,
)

router = APIRouter()

DbSession = Annotated[AsyncSession, Depends(get_async_session)]
SpacesService = Annotated[IDOSpacesService, Depends(get_spaces_service)]
OrgRepository = Annotated[AbstractOrganizationRepository, Depends(get_organization_repository)]


def _compose_address(org: Organization) -> str | None:
    """Join an organization's address fields into one display string.

    FR5.1/FR5.2: the public WhatsApp message needs a full address, not
    individual fields — and this composition happens ONLY for the public
    response, never touching the phone.
    """
    parts = [org.street_address, org.city, org.state, org.postal_code, org.country]
    joined = ", ".join(p for p in parts if p)
    return joined or None


def _pick_contact(org: Organization) -> OrganizationContact | None:
    """Pick the organization contact to expose publicly (FR5.1).

    Prefers the first contact that has a whatsapp number set — that is
    the one actually usable for the "message the seller" flow. Falls
    back to the first contact overall so a name still shows even when
    no contact has whatsapp configured.
    """
    if not org.contacts:
        return None
    return next((c for c in org.contacts if c.whatsapp), org.contacts[0])


# Max expiration for signed URLs (7 days - S3 SigV4 protocol limit)
# URLs renew automatically when page is re-scraped (share again in WhatsApp)
SIGNED_URL_EXPIRES_IN = 604800


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
    except SQLAlchemyError:
        pass  # ponytail: analytics failure should not break the page


@router.get("/{slug}", response_model=PublicProductResponse)
async def get_public_product(
    slug: str,
    db: DbSession,
    org_repository: OrgRepository,
) -> PublicProductResponse:
    """Get a product by slug. No authentication required.

    Returns any product with a slug (draft, published, etc.). The slug acts as
    a secret link — only people who have the link can access the product.

    Includes the organization's public WhatsApp contact (FR5): a contact
    name, its whatsapp number, and the organization's full address. The
    organization's phone is intentionally never included — see
    `PublicProductResponse`.

    Increments view_count for analytics.
    """
    # ponytail: any product with slug is shareable — slug is the "secret link"
    stmt = select(ProductModel).where(ProductModel.slug == slug)
    result = await db.execute(stmt)
    model = result.scalar_one_or_none()

    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    # ponytail: capture BEFORE increment — identity map may sync the UPDATE
    view_count_to_return = model.view_count + 1
    await _increment_view_count(model.id, db)

    org = await org_repository.get_by_id(model.organization_id, model.tenant_id)
    contact = _pick_contact(org) if org else None

    return PublicProductResponse(
        contact_name=contact.name if contact else None,
        contact_whatsapp=contact.whatsapp if contact else None,
        contact_address=_compose_address(org) if org else None,
        id=model.id,
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
        view_count=view_count_to_return,
        favorite_count=model.favorite_count,
        submitted_for_approval_at=model.submitted_for_approval_at,
        approved_at=model.approved_at,
        published_at=model.published_at,
        sold_at=model.sold_at,
        archived_at=model.archived_at,
        created_at=model.created_at,
        updated_at=model.updated_at,
        version=model.version,
    )


@router.get("/{slug}/image-urls", response_model=ProductImageUrlsResponse)
async def get_public_product_image_urls(
    slug: str,
    db: DbSession,
    spaces: SpacesService,
) -> ProductImageUrlsResponse:
    """Get signed image URLs for a product. No authentication required."""
    # ponytail: any product with slug is shareable — slug is the "secret link"
    stmt = select(ProductModel).where(ProductModel.slug == slug)
    result = await db.execute(stmt)
    model = result.scalar_one_or_none()

    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    # ponytail: reorder so cover is always first — frontend expects images[0] = cover
    raw_keys = model.image_urls or []
    cover_key = model.cover_image_key
    if cover_key and cover_key in raw_keys:
        ordered_keys = [cover_key, *(k for k in raw_keys if k != cover_key)]
    elif cover_key:
        ordered_keys = [cover_key, *raw_keys]
    else:
        ordered_keys = list(raw_keys)

    images: list[ProductImageUrlResponse] = []
    for idx, key in enumerate(ordered_keys):
        if key:
            signed_url = await spaces.generate_download_url(key, SIGNED_URL_EXPIRES_IN)
            # ponytail: OG URL only for cover (first image), derived from key convention
            # OG images are public (no signed URL) for WhatsApp/Facebook compatibility
            og_url = None
            if idx == 0 and key.endswith(".webp"):
                og_key = key.replace(".webp", "-og.jpg")
                og_url = spaces.get_public_url(og_key)
            images.append(
                ProductImageUrlResponse(
                    key=key,
                    url=signed_url,
                    og_url=og_url,
                    expires_in=SIGNED_URL_EXPIRES_IN,
                )
            )

    return ProductImageUrlsResponse(
        product_id=model.id,
        images=images,
        cover_image_key=cover_key,
    )


async def _public_cover_url(product: Product, spaces: IDOSpacesService) -> str | None:
    """Pick and sign ONE cover URL for a public catalog listing item.

    Same selection rule as the internal batch endpoint: the thumbnail
    derivative when present, the gallery-cover selection (`cover_image_key`)
    when null, and the first merged gallery candidate as the last fallback
    (legacy bulk-import products that only populate `image_urls`).

    Defense in depth: the signed key MUST live under the product's own
    tenant prefix — a corrupted cross-tenant key never gets signed here.
    No admin relaxation: the public endpoint has no caller to relax for.
    """
    candidate_key: str | None = product.thumbnail_image_key
    if not candidate_key:
        candidate_key = product.cover_image_key
    if not candidate_key:
        merged = _merged_image_url_candidates(product)
        candidate_key = merged[0] if merged else None
    if not candidate_key:
        return None

    # Normalize once — raw values may be bare keys OR full URLs; the
    # tenant-prefix check AND the CDN signer both need the bare key.
    normalized_key = extract_storage_key_from_value(candidate_key)
    if not normalized_key:
        return None

    valid_prefixes = (
        f"orgs/{product.tenant_id}/",
        f"vehicles/{product.tenant_id}/",
    )
    if not any(normalized_key.startswith(p) for p in valid_prefixes):
        return None

    return await spaces.generate_cdn_download_url(normalized_key, SIGNED_URL_EXPIRES_IN)


@router.get("", response_model=PublicProductListResponse)
async def list_public_products(
    db: DbSession,
    spaces: SpacesService,
    category_id: UUID | None = None,
    condition: str | None = None,
    search: str | None = None,
    min_price: int | None = None,
    max_price: int | None = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=24, ge=1, le=100),
) -> PublicProductListResponse:
    """List PUBLISHED products from every tenant — the public catalog (4.6).

    No authentication required, by design (§7 del diagnóstico): the public
    visitor never passes through the internal RBAC — this is the same
    separate mechanism as GET /{slug}, generalized to a listing.

    Reuses the exact same query engine as the internal `list_products`
    (`SqlAlchemyProductRepository.get_all`/`count`) with `tenant_id=None` —
    the documented public mechanism, same as the slug lookup which never
    tenant-checks. `status` is FORCED to PUBLISHED here so drafts, pending,
    or archived products can never leak, regardless of the query params.

    Filters: category_id, condition, search (title/description),
    min_price/max_price (cents), skip/limit pagination. Location and
    attr.* filters are not part of the shared engine's public surface
    (v1 scope — §7's engine reference).

    Each item carries one pre-signed cover URL routed through the
    configured CDN. The DTO structurally cannot carry
    tenant_id/organization_id (§4 sanitization from day one).
    """
    condition_enum = ProductCondition(condition) if condition else None

    repo = SqlAlchemyProductRepository(db)
    products = await repo.get_all(
        tenant_id=None,  # public catalog: every tenant's published products (documented mechanism)
        status=ProductStatus.PUBLISHED,
        category_id=category_id,
        condition=condition_enum,
        search_query=search,
        min_price_cents=min_price,
        max_price_cents=max_price,
        skip=skip,
        limit=limit,
    )
    total = await repo.count(
        tenant_id=None,
        status=ProductStatus.PUBLISHED,
        category_id=category_id,
        condition=condition_enum,
        search_query=search,
        min_price_cents=min_price,
        max_price_cents=max_price,
    )

    items: list[PublicProductListItem] = []
    for product in products:
        cover_url = await _public_cover_url(product, spaces)
        items.append(
            PublicProductListItem(
                id=product.id,
                category_id=product.category_id,
                title=product.title,
                slug=product.slug,
                description=product.description,
                price_cents=product.price_cents,
                currency=product.currency,
                condition=product.condition.value,
                status=product.status.value,
                attributes=product.attributes or {},
                image_urls=product.image_urls or [],
                cover_image_key=product.cover_image_key,
                thumbnail_image_key=product.thumbnail_image_key,
                location_city=product.location_city,
                location_state=product.location_state,
                location_zip=product.location_zip,
                is_featured=product.is_featured,
                published_to_marketplace=product.published_to_marketplace,
                view_count=product.view_count,
                favorite_count=product.favorite_count,
                published_at=product.published_at,
                created_at=product.created_at,
                updated_at=product.updated_at,
                version=product.version,
                cover_url=cover_url,
                expires_in=SIGNED_URL_EXPIRES_IN if cover_url else None,
            )
        )

    return PublicProductListResponse(items=items, total=total, skip=skip, limit=limit)
