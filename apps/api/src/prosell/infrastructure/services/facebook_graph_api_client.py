"""Facebook Graph API client for lead data retrieval.

Implements buyer profile queries and token refresh for Facebook lead webhooks.
Follows the same pattern as FacebookMarketplaceOAuthServiceImpl.
"""

import logging
from dataclasses import dataclass

import httpx

from prosell.domain.exceptions.facebook_exceptions import (
    FacebookUserInfoFetchException,
)
from prosell.infrastructure.services.facebook_marketplace_oauth_service import (
    FacebookMarketplaceOAuthServiceImpl,
)

logger = logging.getLogger(__name__)

# Facebook Graph API version
GRAPH_API_VERSION = "v22.0"  # Latest stable version as of 2026

# Graph API base URL
GRAPH_API_BASE_URL = f"https://graph.facebook.com/{GRAPH_API_VERSION}"


# =============================================================================
# DATA MODELS
# =============================================================================


@dataclass
class FacebookBuyerProfile:
    """Facebook buyer profile information.

    Retrieved from Facebook Graph API for lead webhook processing.
    """

    sender_id: str
    name: str | None
    email: str | None
    profile_url: str | None


# =============================================================================
# FACEBOOK GRAPH API CLIENT
# =============================================================================


class FacebookGraphApiClient:
    """Facebook Graph API client for lead data retrieval.

    Architecture:
    - Adapter in Clean Architecture terminology
    - Uses httpx.AsyncClient for non-blocking HTTP requests
    - Delegates token refresh to existing OAuth service

    Methods:
    - get_buyer_profile(): Query buyer profile by sender_id
    - refresh_access_token(): Refresh page access token
    """

    # Graph API endpoints
    USER_INFO_URL = f"{GRAPH_API_BASE_URL}/{{sender_id}}"

    # Fields to query from buyer profile
    BUYER_PROFILE_FIELDS = "id,name,email,first_name,last_name,profile_pic"

    def __init__(self) -> None:
        """Initialize Facebook Graph API client."""
        # HTTP client with timeout
        self.client = httpx.AsyncClient(timeout=30.0)

        # OAuth service for token refresh (lazy initialization)
        self.oauth_service: FacebookMarketplaceOAuthServiceImpl | None = None

        logger.info("FacebookGraphApiClient initialized")

    async def get_buyer_profile(
        self,
        sender_id: str,
        page_access_token: str,
    ) -> FacebookBuyerProfile:
        """Get buyer profile from Facebook Graph API.

        Args:
            sender_id: Facebook sender ID (from webhook payload)
            page_access_token: Facebook page access token

        Returns:
            Facebook buyer profile

        Raises:
            FacebookUserInfoFetchException: If profile fetch fails
        """
        try:
            url = self.USER_INFO_URL.format(sender_id=sender_id)

            response = await self.client.get(
                url,
                params={
                    "fields": self.BUYER_PROFILE_FIELDS,
                    "access_token": page_access_token,
                },
            )
            response.raise_for_status()

            data = response.json()

            logger.info(f"Successfully fetched buyer profile for sender_id={sender_id}")

            return FacebookBuyerProfile(
                sender_id=data.get("id", sender_id),
                name=data.get("name"),
                email=data.get("email"),
                profile_url=data.get("profile_pic"),
            )

        except httpx.HTTPStatusError as e:
            logger.error(
                f"Facebook buyer profile fetch failed: {e.response.status_code} - {e.response.text}"
            )
            raise FacebookUserInfoFetchException("http_error") from e
        except Exception as e:
            logger.error(f"Unexpected error fetching buyer profile: {e}")
            raise FacebookUserInfoFetchException("unexpected_error") from e

    async def refresh_access_token(
        self,
        page_id: str,
        user_access_token: str,
    ) -> str:
        """Refresh a page access token.

        Delegates to the existing OAuth service to avoid code duplication.

        Args:
            page_id: Facebook page ID
            user_access_token: Valid user access token

        Returns:
            New page access token

        Raises:
            FacebookTokenExchangeException: If token refresh fails
        """
        # Lazy initialization of OAuth service
        if self.oauth_service is None:
            self.oauth_service = FacebookMarketplaceOAuthServiceImpl()

        # Delegate to OAuth service
        new_token = await self.oauth_service.refresh_page_token(page_id, user_access_token)

        logger.info(f"Successfully refreshed token for page {page_id}")

        return new_token

    async def close(self) -> None:
        """Close HTTP client.

        Should be called when client is no longer needed.
        """
        await self.client.aclose()
