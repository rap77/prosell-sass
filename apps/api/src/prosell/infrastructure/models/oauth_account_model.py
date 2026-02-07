"""OAuthAccount model for social login providers."""

from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from prosell.infrastructure.database.base import Base


class OAuthAccountModel(Base):
    """Model for OAuth provider accounts (Google, Facebook, etc.)."""

    __tablename__ = "oauth_accounts"

    id: Mapped[UUID] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )
    user_id: Mapped[UUID] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    provider: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )  # 'google', 'facebook', etc.
    provider_user_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )  # User ID from the OAuth provider
    provider_email: Mapped[str | None] = mapped_column(
        String(255),
        default=None,
        nullable=True,
    )
    access_token: Mapped[str | None] = mapped_column(
        String(500),
        default=None,
        nullable=True,
    )
    refresh_token: Mapped[str | None] = mapped_column(
        String(500),
        default=None,
        nullable=True,
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        default=None,
        nullable=True,
    )
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
