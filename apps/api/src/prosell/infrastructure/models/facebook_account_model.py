"""FacebookAccount model for Marketplace integration.

Separate from OAuthAccount used for authentication.
This model stores Facebook accounts for Marketplace publishing.
"""

from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from prosell.infrastructure.database.base import Base


class FacebookAccountModel(Base):
    """Model for Facebook Marketplace accounts.

    Stores vendedor's connected Facebook account for publishing listings.
    Separate from oauth_accounts which is for user authentication.

    Security:
    - access_token_encrypted is AES-256 encrypted
    - Never log access tokens in plain text
    """

    __tablename__ = "facebook_accounts"

    # Primary key
    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid4,
    )

    # Foreign key to ProSell user (vendedor)
    seller_user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    # Facebook account info
    facebook_user_id: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,  # For fast lookups during OAuth callback
    )
    facebook_name: Mapped[str | None] = mapped_column(
        String(255),
        default=None,
        nullable=True,
    )

    # Encrypted access token
    access_token_encrypted: Mapped[str] = mapped_column(
        Text,  # Encrypted tokens can be long
        nullable=False,
    )

    # Token metadata
    token_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        default=None,
        nullable=True,
        index=True,  # For scheduled token refresh queries
    )

    # Scopes stored as JSON string (comma-separated)
    scopes: Mapped[str] = mapped_column(
        String(1000),
        default="",
        nullable=False,
    )

    # Account status
    status: Mapped[str] = mapped_column(
        String(50),
        default="active",
        nullable=False,
        index=True,  # For filtering active accounts
    )

    # Retry tracking for token refresh
    refresh_failure_count: Mapped[int] = mapped_column(
        default=0,
        nullable=False,
    )

    # Metadata
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


class FacebookPageModel(Base):
    """Model for Facebook Pages.

    Stores Facebook pages managed by a vendedor.
    Each page has its own access token for publishing.
    """

    __tablename__ = "facebook_pages"

    # Primary key
    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid4,
    )

    # Foreign key to parent Facebook account
    facebook_account_id: Mapped[UUID] = mapped_column(
        ForeignKey("facebook_accounts.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    # Facebook page info
    page_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,  # For fast lookups
    )
    page_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    # Encrypted page access token
    page_access_token_encrypted: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    # Page metadata
    category: Mapped[str | None] = mapped_column(
        String(255),
        default=None,
        nullable=True,
    )
    picture_url: Mapped[str | None] = mapped_column(
        String(500),
        default=None,
        nullable=True,
    )

    # Publishing settings
    is_default: Mapped[bool] = mapped_column(
        default=False,
        nullable=False,
        index=True,  # For finding default page
    )

    # Metadata
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
