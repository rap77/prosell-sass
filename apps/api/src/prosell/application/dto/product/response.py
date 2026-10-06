"""Product response DTOs."""

from datetime import datetime
from typing import cast
from uuid import UUID

from pydantic import BaseModel, Field

from prosell.domain.entities.product import Product


class ProductSummaryForLead(BaseModel):
    """Lightweight product summary embedded in lead responses."""

    id: UUID
    title: str
    price_cents: int
    currency: str
    status: str
    attributes: dict[str, object] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime


class _ProductPublicSafeResponse(BaseModel):
    """Fields safe to expose to ANY consumer, public or authenticated — no
    tenant/organization identifier of any kind.

    Shared base for `ProductResponse` (authenticated) and
    `PublicProductResponse` (anonymous): a field added HERE is safe-by-default
    for both. A field that must stay authenticated-only (tenant/org
    identifiers, internal FB account assignment) goes on `ProductResponse`
    instead, never here — same "safe by construction" principle this file
    already applies to the organization phone number (see
    `PublicProductResponse`'s docstring).
    """

    id: UUID
    category_id: UUID
    # Note: the legacy `vehicle_code` field no longer lives at the top
    # level of this DTO — it moved into `attributes["internal_code"]`
    # after migration `20260927_0001_move_vehicle_code_to_attributes_jsonb.py`
    # (renamed from `vehicle_code` in
    # `20261002_0001_rename_vehicle_code_to_internal_code.py`).
    # Consumers that want the value should read it from `attributes`
    # directly; vehicle categories are the only ones that carry it.
    title: str
    slug: str | None = None
    description: str | None = None
    price_cents: int
    currency: str
    condition: str
    status: str
    attributes: dict[str, object] = Field(default_factory=dict)
    # Image URLs at product level (moved from VehicleAttributes)
    image_urls: list[str] = Field(default_factory=list)
    # First-class pointer to the cover image. Single source of truth
    # for "which image is the cover" — used by the catalog grid, the
    # detail view hero, and any thumbnail surface. Settable
    # independently from upload order so the seller can pick any
    # image as the cover. Nullable: a product with no images has no
    # cover (the renderer falls back to the placeholder).
    cover_image_key: str | None = None
    # Storage key of the private 600x600 thumbnail derivative
    # (catalog-card surface). Independent from `cover_image_key`:
    # allows the catalog grid to fetch one small signed URL without
    # signing the whole gallery. Nullable: legacy products fall back
    # to the first gallery entry at read time.
    thumbnail_image_key: str | None = None
    stock_number: str | None = None
    location_city: str | None = None
    location_state: str | None = None
    location_zip: str | None = None
    is_featured: bool
    published_to_marketplace: bool
    view_count: int
    favorite_count: int
    submitted_for_approval_at: datetime | None = None
    approved_at: datetime | None = None
    published_at: datetime | None = None
    sold_at: datetime | None = None
    archived_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    # Optimistic locking. Clients must read this and echo it back via the
    # If-Match header on reverse/resubmit/restore.
    version: int

    @property
    def price_dollars(self) -> float:
        """Get price in dollars."""
        return self.price_cents / 100


class ProductResponse(_ProductPublicSafeResponse):
    """DTO for product responses (authenticated endpoints only).

    Adds every field that identifies the owning tenant/organization, plus
    the internal FB-account assignment — none of these may reach an
    unauthenticated consumer. `PublicProductResponse` intentionally does
    NOT extend this class (see its own docstring) so a field added here
    can never leak to the public DTO by accident.
    """

    tenant_id: UUID
    organization_id: UUID
    # ponytail: derived directly from products.organization_id JOIN organizations.
    # Single source of truth for who owns the product — the tenant column.
    # The old `owner_org_*` fields came from a JOIN with product_ownership
    # type=organization that duplicated this intent; that table now only
    # stores broker (user) shares.
    org_code: str | None = None
    org_color: str | None = None
    # FB accounts assigned to publish this product. Empty = any account.
    fb_account_ids: list[UUID] = Field(default_factory=list)
    # Moderation workflow — internal reviewer identity + notes. Caught by
    # GGA (2026-10-06) as a real active leak: these were populated with
    # REAL values (not null, unlike org_code/org_color/fb_account_ids
    # above) for every public product response until this fix.
    submitted_by: UUID | None = None
    approved_by: UUID | None = None
    rejection_reason: str | None = None

    @classmethod
    def from_entity(
        cls,
        product: Product,
        *,
        org_code: str | None = None,
        org_color: str | None = None,
    ) -> "ProductResponse":
        """Build response from domain entity."""
        return cls(
            id=product.id,
            tenant_id=product.tenant_id,
            organization_id=product.organization_id,
            org_code=org_code,
            org_color=org_color,
            category_id=product.category_id,
            title=product.title,
            slug=product.slug,
            description=product.description,
            price_cents=product.price_cents,
            currency=product.currency,
            condition=product.condition.value,
            status=product.status.value,
            attributes=product.attributes,
            image_urls=product.image_urls,
            cover_image_key=product.cover_image_key,
            thumbnail_image_key=product.thumbnail_image_key,
            stock_number=cast(str | None, product.attributes.get("stock_number"))
            if product.attributes
            else None,
            location_city=product.location_city,
            location_state=product.location_state,
            location_zip=product.location_zip,
            is_featured=product.is_featured,
            published_to_marketplace=product.published_to_marketplace,
            view_count=product.view_count,
            favorite_count=product.favorite_count,
            submitted_for_approval_at=product.submitted_for_approval_at,
            submitted_by=product.submitted_by,
            approved_at=product.approved_at,
            approved_by=product.approved_by,
            rejection_reason=product.rejection_reason,
            published_at=product.published_at,
            sold_at=product.sold_at,
            archived_at=product.archived_at,
            created_at=product.created_at,
            updated_at=product.updated_at,
            version=product.version,
        )


class PublicProductResponse(_ProductPublicSafeResponse):
    """DTO for the public (unauthenticated) product page.

    Extends `_ProductPublicSafeResponse` directly — NOT `ProductResponse` —
    so it structurally cannot carry `tenant_id`/`organization_id`/`org_code`/
    `org_color`/`fb_account_ids`, regardless of what the entity holds.
    Adds the organization contact fields needed for the "message the
    seller on WhatsApp" flow (FR5). Deliberately does NOT include a
    phone field either — the organization's phone must never reach this
    DTO, by construction, regardless of what `OrganizationContact.phone`
    holds. Built only by `public_product_router.get_public_product`; the
    `ProductResponse` used by authenticated endpoints is untouched.
    """

    contact_name: str | None = None
    contact_whatsapp: str | None = None
    contact_address: str | None = None


class ProductListResponse(BaseModel):
    """DTO for paginated product list."""

    products: list[ProductResponse]
    total: int
    skip: int
    limit: int
