"""DTOs for Facebook Marketplace OAuth.

Data Transfer Objects for Facebook account connection and management.
"""

from datetime import datetime
from uuid import UUID

from pydantic import Field

from prosell.domain.base import DomainModel

# =============================================================================
# REQUEST DTOs
# =============================================================================


class AuthorizeFacebookAccountRequest(DomainModel):
    """DTO for Facebook account authorization request."""

    seller_user_id: UUID = Field(description="ProSell vendedor user ID")


class AuthorizeFacebookAccountResponse(DomainModel):
    """DTO for Facebook account authorization response."""

    authorization_url: str = Field(description="Facebook OAuth authorization URL")
    state_token: str = Field(description="OAuth state token for CSRF validation")


class FacebookOAuthCallbackRequest(DomainModel):
    """DTO for Facebook OAuth callback request."""

    code: str = Field(description="Authorization code from Facebook")
    state: str = Field(description="OAuth state token for CSRF validation")


class FacebookOAuthCallbackResponse(DomainModel):
    """DTO for Facebook OAuth callback response."""

    account_id: UUID = Field(description="Created Facebook account ID")
    facebook_user_id: str = Field(description="Facebook user ID")
    facebook_name: str | None = Field(description="Facebook user name")
    pages_count: int = Field(description="Number of pages discovered")
    pages: list["FacebookPageDTO"] = Field(description="Discovered Facebook pages")


class DisconnectFacebookAccountRequest(DomainModel):
    """DTO for disconnecting Facebook account."""

    account_id: UUID = Field(description="Facebook account ID to disconnect")
    seller_user_id: UUID = Field(description="ProSell vendedor user ID (for authorization)")


class DisconnectFacebookAccountResponse(DomainModel):
    """DTO for disconnect response."""

    account_id: UUID = Field(description="Disconnected account ID")
    pages_deleted: int = Field(description="Number of pages deleted")


class SetDefaultPageRequest(DomainModel):
    """DTO for setting default Facebook page."""

    account_id: UUID = Field(description="Facebook account ID")
    page_id: UUID = Field(description="Page ID to set as default")
    seller_user_id: UUID = Field(description="ProSell vendedor user ID (for authorization)")


# =============================================================================
# RESPONSE DTOs
# =============================================================================


class FacebookAccountDTO(DomainModel):
    """DTO for Facebook account."""

    id: UUID = Field(description="Facebook account ID")
    facebook_user_id: str = Field(description="Facebook user ID")
    facebook_name: str | None = Field(description="Facebook user name")
    status: str = Field(description="Account status (active, expired, revoked, error)")
    token_expires_at: datetime | None = Field(description="Token expiry timestamp")
    created_at: datetime = Field(description="Account creation date")
    updated_at: datetime = Field(description="Last update date")


class FacebookPageDTO(DomainModel):
    """DTO for Facebook page."""

    id: UUID = Field(description="Facebook page ID (UUID)")
    page_id: str = Field(description="Facebook page ID from Graph API")
    page_name: str = Field(description="Facebook page name")
    category: str | None = Field(description="Page category")
    picture_url: str | None = Field(description="Page profile picture URL")
    is_default: bool = Field(description="Whether this is the default publishing page")


class ListFacebookAccountsResponse(DomainModel):
    """DTO for listing Facebook accounts."""

    accounts: list[FacebookAccountDTO] = Field(description="Connected Facebook accounts")


class ListFacebookPagesResponse(DomainModel):
    """DTO for listing Facebook pages."""

    pages: list[FacebookPageDTO] = Field(description="Facebook pages")


class RefreshTokenResponse(DomainModel):
    """DTO for token refresh response."""

    total: int = Field(description="Total accounts checked for refresh")
    refreshed: int = Field(description="Number of accounts successfully refreshed")
    failed: int = Field(description="Number of accounts that failed to refresh")
    results: list[dict[str, str]] = Field(description="Detailed refresh results")
