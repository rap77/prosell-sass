"""Product entity - Pure domain logic for products."""

from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from pydantic import Field

from prosell.domain.base import DomainModel
from prosell.domain.value_objects.product_condition import ProductCondition
from prosell.domain.value_objects.product_status import ProductStatus


class Product(DomainModel):
    """
    Product entity with status workflow.

    Pure domain logic - no external dependencies.
    Supports multi-category products with flexible attributes.
    """

    # Required fields
    id: UUID
    tenant_id: UUID  # For multi-tenant isolation
    organization_id: UUID  # Owner organization
    category_id: UUID

    # Basic info
    title: str = Field(..., min_length=1, max_length=500)
    slug: str | None = None  # Optional SEO-friendly URL slug
    description: str | None = None

    # Pricing (in cents)
    price_cents: int = Field(..., ge=0)
    currency: str = Field(default="USD", min_length=3, max_length=3)

    # Condition and status
    condition: ProductCondition = ProductCondition.USED
    status: ProductStatus = ProductStatus.DRAFT

    # Flexible attributes (category-specific)
    # e.g., {"year": 2020, "make": "Toyota", "model": "Camry"}
    attributes: dict[str, object] = Field(default_factory=dict)

    # Image URLs at product level (moved from VehicleAttributes). The
    # ordered list, used for the gallery view. `cover_image_key` (below) is
    # the SINGLE source of truth for which entry is the cover — settable
    # independently from upload order.
    image_urls: list[str] = Field(default_factory=list)
    # Storage key of the cover image. Must reference an entry in
    # `image_urls`; the DTO layer enforces this invariant. Nullable: a
    # product with no images has no cover.
    cover_image_key: str | None = None

    # Location (for shipping/pickup)
    location_city: str | None = None
    location_state: str | None = None
    location_zip: str | None = None

    # Visibility and search
    is_featured: bool = False
    view_count: int = Field(default=0, ge=0)
    favorite_count: int = Field(default=0, ge=0)

    # Approval workflow
    submitted_for_approval_at: datetime | None = None
    submitted_by: UUID | None = None  # User who submitted
    approved_at: datetime | None = None
    approved_by: UUID | None = None  # User who approved
    rejection_reason: str | None = None

    # Publication
    published_at: datetime | None = None
    sold_at: datetime | None = None
    archived_at: datetime | None = None

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    @classmethod
    def create(
        cls,
        title: str,
        price_cents: int,
        tenant_id: UUID,
        organization_id: UUID,
        category_id: UUID,
        condition: ProductCondition = ProductCondition.USED,
        **kwargs: Any,
    ) -> "Product":
        """
        Factory method for new product creation.

        Args:
            title: Product title
            price_cents: Price in cents (e.g., $10.00 = 1000)
            tenant_id: Unique tenant identifier
            organization_id: Owner organization ID
            category_id: Category ID
            condition: Product condition
            **kwargs: Additional optional fields

        Returns:
            New Product entity in DRAFT status
        """
        return cls(
            id=uuid4(),
            title=title,
            price_cents=price_cents,
            tenant_id=tenant_id,
            organization_id=organization_id,
            category_id=category_id,
            condition=condition,
            status=ProductStatus.DRAFT,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
            **kwargs,
        )

    # ==================== Status Transition Methods ====================

    def submit_for_approval(self, user_id: UUID) -> None:
        """
        Submit product for approval.

        Args:
            user_id: ID of user submitting for approval

        Raises:
            ValueError: If product cannot be submitted
        """
        if not self.status.can_submit_for_approval():
            raise ValueError(
                f"Cannot submit product with status {self.status.value} for approval. "
                f"Only DRAFT and REJECTED products can be submitted."
            )

        self.status = ProductStatus.PENDING
        self.submitted_for_approval_at = datetime.now(UTC)
        self.submitted_by = user_id
        self.updated_at = datetime.now(UTC)

    def approve(self, user_id: UUID) -> None:
        """
        Approve product (auto-publishes).

        Args:
            user_id: ID of user approving

        Raises:
            ValueError: If product cannot be approved
        """
        if not self.status.can_approve():
            raise ValueError(
                f"Cannot approve product with status {self.status.value}. "
                f"Only PENDING products can be approved."
            )

        self.status = ProductStatus.PUBLISHED
        self.approved_at = datetime.now(UTC)
        self.approved_by = user_id
        self.published_at = datetime.now(UTC)
        self.updated_at = datetime.now(UTC)

    def reject(self, user_id: UUID, reason: str) -> None:
        """
        Reject product approval.

        Args:
            user_id: ID of user rejecting
            reason: Rejection reason

        Raises:
            ValueError: If product cannot be rejected
        """
        if not self.status.can_reject():
            raise ValueError(
                f"Cannot reject product with status {self.status.value}. "
                f"Only PENDING products can be rejected."
            )

        self.status = ProductStatus.REJECTED
        self.approved_by = user_id
        self.rejection_reason = reason
        self.updated_at = datetime.now(UTC)

    def publish(self) -> None:
        """
        Publish product directly (skip approval - admin only).

        Raises:
            ValueError: If product cannot be published
        """
        if not self.status.can_publish():
            raise ValueError(
                f"Cannot publish product with status {self.status.value}. "
                f"Only PENDING products can be published."
            )

        self.status = ProductStatus.PUBLISHED
        self.published_at = datetime.now(UTC)
        self.updated_at = datetime.now(UTC)

    def pause(self) -> None:
        """
        Pause product (temporarily hide).

        Raises:
            ValueError: If product cannot be paused
        """
        if not self.status.can_pause():
            raise ValueError(
                f"Cannot pause product with status {self.status.value}. "
                f"Only PUBLISHED products can be paused."
            )

        self.status = ProductStatus.PAUSED
        self.updated_at = datetime.now(UTC)

    def resume(self) -> None:
        """
        Resume a paused product.

        Raises:
            ValueError: If product cannot be resumed
        """
        if self.status != ProductStatus.PAUSED:
            raise ValueError(
                f"Cannot resume product with status {self.status.value}. "
                f"Only PAUSED products can be resumed."
            )

        self.status = ProductStatus.PUBLISHED
        self.updated_at = datetime.now(UTC)

    def reserve(self) -> None:
        """
        Mark product as reserved (on hold for buyer).

        Raises:
            ValueError: If product cannot be reserved
        """
        if self.status != ProductStatus.PUBLISHED:
            raise ValueError(
                f"Cannot reserve product with status {self.status.value}. "
                f"Only PUBLISHED products can be reserved."
            )

        self.status = ProductStatus.RESERVED
        self.updated_at = datetime.now(UTC)

    def mark_sold(self) -> None:
        """
        Mark product as sold.

        Raises:
            ValueError: If product cannot be marked sold
        """
        if not self.status.can_mark_sold():
            raise ValueError(
                f"Cannot mark product with status {self.status.value} as sold. "
                f"Only PUBLISHED and RESERVED products can be marked sold."
            )

        self.status = ProductStatus.SOLD
        self.sold_at = datetime.now(UTC)
        self.updated_at = datetime.now(UTC)

    def archive(self) -> None:
        """
        Archive product (soft delete).

        Raises:
            ValueError: If product cannot be archived
        """
        if not self.status.can_archive():
            raise ValueError(
                f"Cannot archive product with status {self.status.value}. "
                f"ARCHIVED products cannot be archived again."
            )

        # Store previous status for potential restore
        self.status = ProductStatus.ARCHIVED
        self.archived_at = datetime.now(UTC)
        self.updated_at = datetime.now(UTC)

    # ==================== Update Methods ====================

    def update_basic_info(
        self,
        title: str | None = None,
        description: str | None = None,
        price_cents: int | None = None,
        condition: ProductCondition | None = None,
    ) -> None:
        """
        Update basic product information.

        Args:
            title: New title (optional)
            description: New description (optional)
            price_cents: New price in cents (optional)
            condition: New condition (optional)
        """
        if not self.status.can_edit():
            raise ValueError(
                f"Cannot edit product with status {self.status.value}. "
                f"Only DRAFT, REJECTED, and PAUSED products can be edited."
            )

        if title is not None:
            self.title = title
        if description is not None:
            self.description = description
        if price_cents is not None:
            if price_cents < 0:
                raise ValueError("price_cents must be >= 0")
            self.price_cents = price_cents
        if condition is not None:
            self.condition = condition

        self.updated_at = datetime.now(UTC)

    def update_attributes(self, attributes: dict[str, object]) -> None:
        """
        Update product attributes (category-specific fields).

        Args:
            attributes: New attributes dict (merged with existing)
        """
        if not self.status.can_edit():
            raise ValueError(
                f"Cannot edit product with status {self.status.value}. "
                f"Only DRAFT, REJECTED, and PAUSED products can be edited."
            )

        self.attributes = {**self.attributes, **attributes}
        self.updated_at = datetime.now(UTC)

    def set_attribute(self, key: str, value: object) -> None:
        """
        Set a single attribute.

        Args:
            key: Attribute key
            value: Attribute value
        """
        if not self.status.can_edit():
            raise ValueError(
                f"Cannot edit product with status {self.status.value}. "
                f"Only DRAFT, REJECTED, and PAUSED products can be edited."
            )

        self.attributes[key] = value
        self.updated_at = datetime.now(UTC)

    def remove_attribute(self, key: str) -> None:
        """
        Remove an attribute.

        Args:
            key: Attribute key to remove
        """
        if not self.status.can_edit():
            raise ValueError(
                f"Cannot edit product with status {self.status.value}. "
                f"Only DRAFT, REJECTED, and PAUSED products can be edited."
            )

        self.attributes.pop(key, None)
        self.updated_at = datetime.now(UTC)

    def update_location(
        self,
        city: str | None = None,
        state: str | None = None,
        zip: str | None = None,
    ) -> None:
        """
        Update product location.

        Args:
            city: City name (optional)
            state: State name (optional)
            zip: ZIP code (optional)
        """
        if city is not None:
            self.location_city = city
        if state is not None:
            self.location_state = state
        if zip is not None:
            self.location_zip = zip

        self.updated_at = datetime.now(UTC)

    def increment_view_count(self) -> None:
        """Increment view count."""
        self.view_count += 1
        # Don't update updated_at for view count

    def increment_favorite_count(self) -> None:
        """Increment favorite count."""
        self.favorite_count += 1
        # Don't update updated_at for favorite count

    def decrement_favorite_count(self) -> None:
        """Decrement favorite count (won't go below 0)."""
        self.favorite_count = max(0, self.favorite_count - 1)
        # Don't update updated_at for favorite count

    def set_featured(self, featured: bool) -> None:
        """
        Set featured status.

        Args:
            featured: Whether product is featured
        """
        self.is_featured = featured
        self.updated_at = datetime.now(UTC)

    def merged_image_keys(self) -> list[str]:
        """Return the merged, order-preserving, deduped list of image keys.

        Pre-migration, image URLs lived in the legacy nested
        ``attributes.image_urls`` field. Post-migration, they live in the
        top-level ``image_urls`` column. Both surfaces that operate on a
        product's image set — the sign endpoint AND the cover-image
        validator — must read from BOTH sources so that:

          - Legacy products (no top-level entries) still display their
            images and still accept a cover change.
          - Modern products keep working unchanged.
          - A key present in both sources is counted ONCE (order-preserving
            dedupe so the cover pick is stable across reads).

        Mirrors the frontend ``getProductImageKeys(product)`` helper so the
        two layers agree on "what images does this product have".
        """
        raw_keys: list[str] = list(self.image_urls or [])
        attributes = self.attributes or {}
        if isinstance(attributes, dict):
            attr_keys = attributes.get("image_urls")
            if isinstance(attr_keys, list):
                raw_keys.extend(k for k in attr_keys if isinstance(k, str))
        seen: set[str] = set()
        merged: list[str] = []
        for key in raw_keys:
            if key in seen:
                continue
            seen.add(key)
            merged.append(key)
        return merged

    # ==================== Properties ====================

    @property
    def price_dollars(self) -> float:
        """Get price in dollars."""
        return self.price_cents / 100

    @property
    def is_published(self) -> bool:
        """Check if product is published."""
        return self.status.is_published()

    @property
    def is_visible(self) -> bool:
        """Check if product is visible in marketplace."""
        return self.status.is_visible()

    @property
    def can_be_edited(self) -> bool:
        """Check if product can be edited."""
        return self.status.can_edit()

    @property
    def days_since_creation(self) -> int:
        """Calculate days since product was created."""
        return (datetime.now(UTC) - self.created_at).days

    @property
    def is_new(self) -> bool:
        """Check if product is less than 7 days old."""
        return self.days_since_creation < 7
