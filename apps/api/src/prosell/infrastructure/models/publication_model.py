"""PublicationModel — SQLAlchemy ORM for the publications table.

Stores Facebook Marketplace listing lifecycle data.
Indexed for scheduler queries (expires_at) and seller dashboard (status, product_id).
"""

from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from prosell.infrastructure.database.base import Base


class PublicationModel(Base):
    """ORM model for the publications table.

    Multi-tenant: all queries must filter by tenant_id.
    One product can have multiple publications (history of attempts).
    """

    __tablename__ = "publications"

    # Primary key
    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid4,
    )

    # Tenant isolation (required for all queries)
    tenant_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    # Parent product
    product_id: Mapped[UUID] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    # Seller who initiated the publication
    seller_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )

    # Facebook page used for publishing (UUID without FK until table is created)
    facebook_page_id: Mapped[UUID | None] = mapped_column(
        index=True,
        nullable=True,
    )

    # Publication state machine
    status: Mapped[str] = mapped_column(
        String(50),
        default="pending",
        nullable=False,
        index=True,
    )
    strategy_used: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )
    engine_version: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    # Facebook listing identifier (set after successful publish)
    fb_listing_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        index=True,
    )

    # Listing content
    title: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    price_cents: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    zip_code: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )
    image_urls: Mapped[list[str]] = mapped_column(
        JSONB,
        default=list,
        nullable=False,
    )
    hero_shot_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    # Lifecycle timestamps
    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,  # Scheduler queries this to find approaching-expiry listings
    )
    sold_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Error tracking
    error_category: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )
    error_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    error_detail: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    retry_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    last_retry_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    blocked_until_confirmed: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    # Audit timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )
