"""Facebook Account entity for Marketplace integration.

This entity represents a vendedor's connected Facebook account
for publishing to Facebook Marketplace and managing pages.
"""

from datetime import UTC, datetime, timedelta
from enum import StrEnum
from uuid import UUID, uuid4

from prosell.domain.base import DomainModel, Field, field_validator


class FacebookAccountStatus(StrEnum):
    """Facebook account status enum.

    Status flow:
    - ACTIVE: Account connected and functional
    - EXPIRED: Access token expired and refresh failed
    - REVOKED: User revoked permissions on Facebook
    - ERROR: Temporary error (API down, network issue)
    """

    ACTIVE = "active"
    EXPIRED = "expired"
    REVOKED = "revoked"
    ERROR = "error"

    def is_active(self) -> bool:
        """Check if status is active."""
        return self == FacebookAccountStatus.ACTIVE

    def can_publish(self) -> bool:
        """Check if account can publish listings."""
        return self == FacebookAccountStatus.ACTIVE

    def __str__(self) -> str:
        return self.value


class FacebookAccount(DomainModel):
    """Facebook OAuth account entity for Marketplace.

    Represents a vendedor's connected Facebook account for publishing listings.
    Stores encrypted access token and page information.

    Business Rules:
    - Access tokens must be encrypted at rest
    - Tokens expire after 60 days (long-lived)
    - Tokens should refresh 48 hours before expiry
    - Account status changes when tokens fail to refresh

    Security:
    - access_token_encrypted is AES-256 encrypted token
    - Never log access tokens in plain text
    - Use encryption_service to decrypt before use
    """

    # Primary key
    id: UUID = Field(description="Facebook account unique identifier")

    # Foreign key to ProSell user (vendedor)
    seller_user_id: UUID = Field(description="ProSell vendedor user ID")

    # Facebook account info
    facebook_user_id: str = Field(description="Facebook user ID from Graph API")
    facebook_name: str | None = Field(default=None, description="Facebook user name")

    # Encrypted access token
    access_token_encrypted: str = Field(
        description="AES-256 encrypted long-lived access token (60-day)"
    )

    # Token metadata
    token_expires_at: datetime | None = Field(
        default=None, description="Token expiry timestamp (60 days from issue)"
    )
    scopes: list[str] = Field(
        default_factory=list, description="Granted Facebook permissions (pages_manage_posts, etc.)"
    )

    # Account status
    status: FacebookAccountStatus = Field(
        default=FacebookAccountStatus.ACTIVE, description="Account connection status"
    )

    # Metadata
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    # Retry tracking for token refresh
    refresh_failure_count: int = Field(default=0, description="Consecutive refresh failures")

    @field_validator("seller_user_id", "id", mode="before")
    @classmethod
    def validate_uuid(cls, v: str | UUID) -> UUID:
        """Validate and convert UUID strings."""
        if isinstance(v, str):
            return UUID(v)
        return v

    def is_expired(self) -> bool:
        """Check if access token is expired.

        Returns:
            True if token is expired or expiry is unknown
        """
        if not self.token_expires_at:
            # No expiry info means we can't determine status
            # Assume expired to force refresh attempt
            return True
        return self.token_expires_at < datetime.now(UTC)

    def should_refresh(self, hours_before: int = 48) -> bool:
        """Check if token should be refreshed.

        Args:
            hours_before: How many hours before expiry to refresh (default: 48)

        Returns:
            True if token expires soon or is already expired
        """
        if not self.token_expires_at:
            # No expiry info - should attempt refresh
            return True

        threshold = datetime.now(UTC) + timedelta(hours=hours_before)
        return self.token_expires_at < threshold

    def refresh_token(self, new_token: str, expires_at: datetime) -> None:
        """Update access token after successful refresh.

        Args:
            new_token: New access token (plain text - will be encrypted by use case)
            expires_at: New token expiry timestamp

        Note:
            This method updates the entity but doesn't handle encryption.
            Encryption is the responsibility of the use case/repository layer.
        """
        self.access_token_encrypted = new_token  # Will be encrypted by caller
        self.token_expires_at = expires_at
        self.updated_at = datetime.now(UTC)
        self.refresh_failure_count = 0  # Reset on success

        # Reactivate if was expired
        if self.status != FacebookAccountStatus.ACTIVE:
            self.status = FacebookAccountStatus.ACTIVE

    def mark_expired(self) -> None:
        """Mark account as expired (token refresh failed).

        Sets status to EXPIRED and updates timestamp.
        Vendedor will need to re-authorize.
        """
        self.status = FacebookAccountStatus.EXPIRED
        self.updated_at = datetime.now(UTC)

    def revoke(self) -> None:
        """Mark account as revoked (user removed permissions on Facebook).

        Called when webhook receives permission revocation notification.
        Vendedor will need to re-authorize.
        """
        self.status = FacebookAccountStatus.REVOKED
        self.updated_at = datetime.now(UTC)

    def mark_error(self) -> None:
        """Mark account as having temporary error.

        Used when Facebook API is temporarily down or network fails.
        Account can be recovered on next successful refresh.
        """
        self.status = FacebookAccountStatus.ERROR
        self.updated_at = datetime.now(UTC)

    def can_retry_refresh(self, max_retries: int = 5) -> bool:
        """Check if token refresh should be retried.

        Args:
            max_retries: Maximum consecutive failures before giving up

        Returns:
            True if refresh attempts are below max_retries
        """
        return self.refresh_failure_count < max_retries

    def increment_refresh_failure(self) -> None:
        """Increment refresh failure counter.

        After max_retries consecutive failures, account is marked as EXPIRED.
        """
        self.refresh_failure_count += 1
        self.updated_at = datetime.now(UTC)

    @classmethod
    def create(
        cls,
        seller_user_id: UUID,
        facebook_user_id: str,
        access_token_encrypted: str,
        facebook_name: str | None = None,
        token_expires_at: datetime | None = None,
        scopes: list[str] | None = None,
    ) -> "FacebookAccount":
        """Factory method to create new Facebook account connection.

        Args:
            seller_user_id: ProSell vendedor user ID
            facebook_user_id: Facebook user ID from Graph API
            access_token_encrypted: Encrypted long-lived access token
            facebook_name: Optional Facebook user name
            token_expires_at: Token expiry timestamp
            scopes: Granted Facebook permissions

        Returns:
            New FacebookAccount entity
        """
        return cls(
            id=uuid4(),
            seller_user_id=seller_user_id,
            facebook_user_id=facebook_user_id,
            facebook_name=facebook_name,
            access_token_encrypted=access_token_encrypted,
            token_expires_at=token_expires_at,
            scopes=scopes or [],
            status=FacebookAccountStatus.ACTIVE,
            refresh_failure_count=0,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
