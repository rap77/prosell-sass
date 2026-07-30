"""FB Account models for bot login credentials.

Separate from FacebookAccountModel which handles OAuth tokens.
These store email/password for the scraping bot.
"""

from datetime import datetime
from decimal import Decimal
from enum import Enum
from uuid import UUID

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    LargeBinary,
    Numeric,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from prosell.infrastructure.database.base import Base


class FBGroupCategory(str, Enum):
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
    groups: Mapped[list["FBAccountGroupModel"]] = relationship(
        "FBAccountGroupModel",
        back_populates="account",
        cascade="all, delete-orphan",
        lazy="selectin",
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
