"""Authorize Facebook Account use case.

Handles initiation of Facebook OAuth flow for Marketplace publishing.
"""

from uuid import uuid4

from prosell.application.dto.facebook import (
    AuthorizeFacebookAccountRequest,
    AuthorizeFacebookAccountResponse,
)
from prosell.domain.exceptions.facebook_exceptions import FacebookNotConfiguredException
from prosell.domain.ports.i_facebook_marketplace_service import (
    IFacebookMarketplaceOAuthService,
)
from prosell.domain.ports.i_redis_service import IRedisService


class AuthorizeFacebookAccountUseCase:
    """Use case for initiating Facebook OAuth flow.

    Flow:
    1. Generate state token (UUID)
    2. Store state token in Redis (10-minute expiry)
    3. Generate authorization URL with required scopes
    4. Return URL for frontend to redirect user
    """

    def __init__(
        self,
        facebook_service: IFacebookMarketplaceOAuthService,
        redis: IRedisService,
    ) -> None:
        self.facebook_service = facebook_service
        self.redis = redis

    async def execute(
        self,
        request: AuthorizeFacebookAccountRequest,
    ) -> AuthorizeFacebookAccountResponse:
        """
        Execute Facebook OAuth authorization initiation.

        Args:
            request: Authorization request with seller_user_id

        Returns:
            Authorization response with authorization URL and state token

        Raises:
            FacebookNotConfiguredException: If Facebook OAuth credentials missing
        """
        # 1. Generate state token for CSRF protection
        state_token = str(uuid4())

        # 2. Store state token in Redis (10-minute expiry)
        # Key format: oauth:facebook:state:{state_token}
        # Value: seller_user_id (to link callback to user)
        await self.redis.set(
            f"oauth:facebook:state:{state_token}",
            str(request.seller_user_id),
            ex=600,  # 10 minutes
        )

        # 3. Generate authorization URL
        try:
            authorization_url = await self.facebook_service.get_authorization_url(
                state_token=state_token
            )
        except Exception as e:
            # Check if it's a configuration error
            if "not configured" in str(e).lower():
                raise FacebookNotConfiguredException("missing_credentials") from e
            raise

        return AuthorizeFacebookAccountResponse(
            authorization_url=authorization_url,
            state_token=state_token,
        )
