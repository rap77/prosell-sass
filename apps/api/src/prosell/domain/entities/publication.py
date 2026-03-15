"""Publication entity — FB Marketplace listing state machine.

Tracks the full lifecycle of a vehicle listing published to Facebook Marketplace.
States: pending -> publishing -> published -> failed/expired/sold
"""

from datetime import UTC, datetime, timedelta
from enum import StrEnum
from uuid import UUID, uuid4

from pydantic import Field

from prosell.domain.base import DomainModel


class PublicationStatus(StrEnum):
    """State machine for a Facebook Marketplace listing."""

    PENDING = "pending"
    PUBLISHING = "publishing"
    PUBLISHED = "published"
    FAILED = "failed"
    EXPIRED = "expired"
    SOLD = "sold"


class PublicationErrorCategory(StrEnum):
    """Error severity for publication failures.

    A = transient (retryable — timeout, network error)
    B = blocking (requires human confirmation — captcha, policy violation)
    """

    A = "transient"
    B = "blocking"


class Publication(DomainModel):
    """Facebook Marketplace listing entity.

    Represents a single attempt to publish a product on Facebook Marketplace.
    One product can have multiple publications (e.g., after expiry/republication).

    Multi-tenant: all queries must filter by tenant_id.
    """

    # Identity
    id: UUID = Field(default_factory=uuid4)
    product_id: UUID
    tenant_id: UUID
    seller_user_id: UUID
    facebook_page_id: UUID

    # Publication state
    status: PublicationStatus = PublicationStatus.PENDING
    strategy_used: str | None = None  # "playwright" | "graph_api"
    engine_version: str | None = None  # e.g. "playwright_v1.42"
    fb_listing_id: str | None = None  # Facebook listing ID returned after publish

    # Listing content
    title: str = Field(..., min_length=1, max_length=500)
    description: str | None = None
    price_cents: int = Field(..., gt=0)
    zip_code: str = Field(..., min_length=5, max_length=10)
    image_urls: list[str] = Field(default_factory=list)
    hero_shot_url: str | None = None

    # Lifecycle timestamps
    published_at: datetime | None = None
    expires_at: datetime | None = None
    sold_at: datetime | None = None

    # Error tracking
    error_category: PublicationErrorCategory | None = None
    error_message: str | None = None
    error_detail: str | None = None
    retry_count: int = 0
    last_retry_at: datetime | None = None
    blocked_until_confirmed: bool = False

    # Audit timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    # ==================== State Transition Methods ====================

    def mark_publishing(self) -> None:
        """Transition to PUBLISHING state when job starts."""
        self.status = PublicationStatus.PUBLISHING
        self.updated_at = datetime.now(UTC)

    def mark_published(
        self,
        fb_listing_id: str,
        strategy: str,
        engine_version: str,
    ) -> None:
        """Transition to PUBLISHED state after successful FB listing creation.

        Sets expires_at = published_at + 7 days (FB Marketplace expiry window).

        Args:
            fb_listing_id: Facebook listing ID returned by the publisher
            strategy: Publisher used ("playwright" | "graph_api")
            engine_version: Exact version string for traceability
        """
        now = datetime.now(UTC)
        self.status = PublicationStatus.PUBLISHED
        self.fb_listing_id = fb_listing_id
        self.strategy_used = strategy
        self.engine_version = engine_version
        self.published_at = now
        self.expires_at = now + timedelta(days=7)
        self.updated_at = now

    def mark_failed(
        self,
        category: PublicationErrorCategory,
        message: str,
        detail: str = "",
    ) -> None:
        """Transition to FAILED state.

        Category B (blocking) sets blocked_until_confirmed=True,
        requiring explicit human action before retry.

        Args:
            category: Error category (A=transient, B=blocking)
            message: Short human-readable error message
            detail: Optional full error detail (stack trace, API response)
        """
        self.status = PublicationStatus.FAILED
        self.error_category = category
        self.error_message = message
        self.error_detail = detail
        self.blocked_until_confirmed = category == PublicationErrorCategory.B
        self.updated_at = datetime.now(UTC)

    def increment_retry(self) -> None:
        """Increment retry counter and record timestamp."""
        self.retry_count += 1
        self.last_retry_at = datetime.now(UTC)
        self.updated_at = datetime.now(UTC)

    def unlock_from_category_b(self) -> None:
        """Allow retry after human confirms Category B failure is resolved.

        Resets blocked_until_confirmed and returns status to PENDING.
        """
        self.blocked_until_confirmed = False
        self.status = PublicationStatus.PENDING
        self.updated_at = datetime.now(UTC)

    def mark_sold(self) -> None:
        """Transition to SOLD state when vehicle is confirmed sold."""
        self.status = PublicationStatus.SOLD
        self.sold_at = datetime.now(UTC)
        self.updated_at = datetime.now(UTC)

    def mark_expired(self) -> None:
        """Transition to EXPIRED state when listing exceeds 7-day window."""
        self.status = PublicationStatus.EXPIRED
        self.updated_at = datetime.now(UTC)

    # ==================== Query Methods ====================

    def is_approaching_expiry(self, hours_before: int = 48) -> bool:
        """Check if listing is approaching its expiry date.

        Used by the scheduler to trigger republication before FB removes the listing.

        Args:
            hours_before: Warning window in hours (default 48h)

        Returns:
            True if status is PUBLISHED and expires_at < now + hours_before
        """
        if self.status != PublicationStatus.PUBLISHED:
            return False
        if self.expires_at is None:
            return False
        threshold = datetime.now(UTC) + timedelta(hours=hours_before)
        return self.expires_at < threshold
