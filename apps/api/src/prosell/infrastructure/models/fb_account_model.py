"""FB Account models for bot login credentials.

Separate from FacebookAccountModel which handles OAuth tokens.
These store email/password for the scraping bot.
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from typing import TYPE_CHECKING, TypedDict
from uuid import UUID

if TYPE_CHECKING:
    from prosell.infrastructure.models.product_model import ProductModel

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    LargeBinary,
    Numeric,
    String,
    Table,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from prosell.infrastructure.database.base import Base


class _FBGroupPostedJSON(TypedDict):
    """TypedDict for fb_groups_posted JSONB payload.

    Mirrors FBGroupPosted (Pydantic) in fb_sync_router to avoid cross-layer imports.
    """

    position: int
    fb_group_id: str | None
    name: str | None


# Association table for product ↔ fb_account many-to-many
product_fb_account_assignments = Table(
    "product_fb_account_assignments",
    Base.metadata,
    Column(
        "product_id",
        PG_UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "fb_account_id",
        PG_UUID(as_uuid=True),
        ForeignKey("fb_accounts.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column("assigned_at", DateTime(timezone=True), server_default=text("now()"), nullable=False),
)


class FBGroupCategory(StrEnum):
    """Category for FB groups to filter product types."""

    VEHICLES = "vehicles"
    GENERAL = "general"
    REAL_ESTATE = "real_estate"
    ELECTRONICS = "electronics"
    OTHER = "other"


class FBAccountModel(Base):
    """Bot login credentials for FB Marketplace publishing.

    Security: password_encrypted uses Fernet (AES-128).
    """

    __tablename__ = "fb_accounts"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    tenant_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    broker_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("organization_brokers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    email: Mapped[str] = mapped_column(String(255), nullable=False)
    alias: Mapped[str | None] = mapped_column(String(100), nullable=True)
    password_encrypted: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)

    # Bot config
    browser: Mapped[str] = mapped_column(String(20), nullable=False, server_default="chrome")
    language: Mapped[str] = mapped_column(String(10), nullable=False, server_default="es")
    time_to_sleep: Mapped[Decimal] = mapped_column(
        Numeric(3, 1), nullable=False, server_default="0.7"
    )

    # Status: active, disabled, suspended, restricted
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="active", index=True
    )

    # Metrics
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_error_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    total_publications: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    total_failures: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")

    # Audit
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    # Relationships
    groups: Mapped[list[FBAccountGroupModel]] = relationship(
        "FBAccountGroupModel",
        back_populates="account",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    # Products assigned to this account (many-to-many)
    assigned_products: Mapped[list[ProductModel]] = relationship(
        "ProductModel",
        secondary=product_fb_account_assignments,
        back_populates="assigned_fb_accounts",
        lazy="noload",
    )


class FBAccountGroupModel(Base):
    """FB groups associated with an account."""

    __tablename__ = "fb_account_groups"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    fb_account_id: Mapped[UUID] = mapped_column(
        ForeignKey("fb_accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    position: Mapped[int] = mapped_column(Integer, nullable=False)  # 1, 2, 3...
    fb_group_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    category: Mapped[FBGroupCategory] = mapped_column(
        PG_ENUM(FBGroupCategory, name="fb_group_category", create_type=False),
        nullable=False,
        server_default="general",
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")

    # Metrics
    total_posts: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    last_post_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    account: Mapped[FBAccountModel] = relationship("FBAccountModel", back_populates="groups")


class FBPublicationHistoryModel(Base):
    """Immutable event log for FB publications."""

    __tablename__ = "fb_publication_history"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    tenant_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    product_id: Mapped[UUID] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    fb_account_id: Mapped[UUID] = mapped_column(
        ForeignKey("fb_accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Event type: published, failed, deleted, expired, republished
    event_type: Mapped[str] = mapped_column(String(20), nullable=False)
    fb_post_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    fb_groups_posted: Mapped[list[_FBGroupPostedJSON] | None] = mapped_column(JSONB, nullable=True)
    groups_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")

    # Error info
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Timestamps
    event_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()"), index=True
    )
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Republication tracking
    publication_number: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")
    previous_publication_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("fb_publication_history.id", ondelete="SET NULL"),
        nullable=True,
    )


class FBPublicationStatusModel(Base):
    """Consolidated current state per product+account."""

    __tablename__ = "fb_publication_status"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    tenant_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    product_id: Mapped[UUID] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    fb_account_id: Mapped[UUID] = mapped_column(
        ForeignKey("fb_accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Status: pending, active, deleted, expired, failed
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="pending", index=True
    )

    # Reference to last event
    last_event_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("fb_publication_history.id", ondelete="SET NULL"),
        nullable=True,
    )
    last_event_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Counters
    publication_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    failure_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")

    # Timestamps
    first_published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
