"""Facebook Page entity for Marketplace publishing.

This entity represents a Facebook Page managed by a vendedor.
Pages are used to publish Marketplace listings on behalf of the page.
"""

from datetime import UTC, datetime
from uuid import UUID, uuid4

from prosell.domain.base import DomainModel, Field


class FacebookPage(DomainModel):
    """Facebook Page entity.

    Represents a Facebook Page that a vendedor manages.
    Each page has its own access token for publishing.

    Business Rules:
    - Page tokens are separate from user tokens
    - Page tokens have different permissions (pages_manage_posts, etc.)
    - Vendedor can select default page for publishing
    - Multiple pages can be connected per Facebook account

    Security:
    - page_access_token_encrypted is AES-256 encrypted
    - Never log page access tokens in plain text
    """

    # Primary key
    id: UUID = Field(description="Facebook page unique identifier")

    # Foreign key to parent Facebook account
    facebook_account_id: UUID = Field(
        description="Parent Facebook account ID (from FacebookAccount)"
    )

    # Facebook page info
    page_id: str = Field(description="Facebook page ID from Graph API")
    page_name: str = Field(description="Facebook page name")

    # Encrypted page access token
    page_access_token_encrypted: str = Field(description="AES-256 encrypted page access token")

    # Page metadata
    category: str | None = Field(
        default=None, description="Page category (e.g., 'Vehicle Branch', 'Automotive')"
    )
    picture_url: str | None = Field(default=None, description="Page profile picture URL")

    # Publishing settings
    is_default: bool = Field(
        default=False, description="Whether this is the default page for publishing"
    )

    # Metadata
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    def set_as_default(self) -> None:
        """Mark this page as the default for publishing.

        Note:
            This doesn't unset other pages' is_default flags.
            That logic should be handled at the repository/use case level.
        """
        self.is_default = True
        self.updated_at = datetime.now(UTC)

    def unset_default(self) -> None:
        """Remove default status from this page."""
        self.is_default = False
        self.updated_at = datetime.now(UTC)

    @classmethod
    def create(
        cls,
        facebook_account_id: UUID,
        page_id: str,
        page_name: str,
        page_access_token_encrypted: str,
        category: str | None = None,
        picture_url: str | None = None,
        is_default: bool = False,
    ) -> "FacebookPage":
        """Factory method to create new Facebook page.

        Args:
            facebook_account_id: Parent Facebook account ID
            page_id: Facebook page ID from Graph API
            page_name: Facebook page name
            page_access_token_encrypted: Encrypted page access token
            category: Optional page category
            picture_url: Optional page picture URL
            is_default: Whether this is the default page for publishing

        Returns:
            New FacebookPage entity
        """
        return cls(
            id=uuid4(),
            facebook_account_id=facebook_account_id,
            page_id=page_id,
            page_name=page_name,
            page_access_token_encrypted=page_access_token_encrypted,
            category=category,
            picture_url=picture_url,
            is_default=is_default,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
