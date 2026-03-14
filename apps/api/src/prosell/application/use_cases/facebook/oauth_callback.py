"""Facebook OAuth Callback use case.

Handles Facebook OAuth callback after user authorization.
"""

import logging
from datetime import UTC, datetime
from uuid import UUID

from prosell.application.dto.facebook import (
    FacebookOAuthCallbackRequest,
    FacebookOAuthCallbackResponse,
    FacebookPageDTO,
)
from prosell.domain.entities.facebook_account import FacebookAccount, FacebookAccountStatus
from prosell.domain.entities.facebook_page import FacebookPage
from prosell.domain.exceptions.facebook_exceptions import (
    FacebookStateException,
)
from prosell.domain.ports.i_encryption_service import IEncryptionService
from prosell.domain.ports.i_facebook_marketplace_service import (
    IFacebookMarketplaceOAuthService,
)
from prosell.domain.ports.i_redis_service import IRedisService
from prosell.domain.repositories.facebook_account_repository import (
    IFacebookAccountRepository,
)
from prosell.domain.repositories.facebook_page_repository import (
    IFacebookPageRepository,
)

logger = logging.getLogger(__name__)


class OAuthCallbackUseCase:
    """Use case for handling Facebook OAuth callback.

    Flow:
    1. Verify state token from Redis (CSRF protection)
    2. Exchange authorization code for short-lived token
    3. Exchange for long-lived token (60-day)
    4. Get user info from Facebook
    5. Get user pages
    6. Create account with encrypted token
    7. Store pages with encrypted tokens
    8. Cleanup state token
    """

    def __init__(
        self,
        facebook_service: IFacebookMarketplaceOAuthService,
        account_repository: IFacebookAccountRepository,
        page_repository: IFacebookPageRepository,
        encryption_service: IEncryptionService,
        redis: IRedisService,
    ) -> None:
        self.facebook_service = facebook_service
        self.account_repository = account_repository
        self.page_repository = page_repository
        self.encryption_service = encryption_service
        self.redis = redis

    async def execute(
        self,
        request: FacebookOAuthCallbackRequest,
    ) -> FacebookOAuthCallbackResponse:
        """
        Execute Facebook OAuth callback processing.

        Args:
            request: Callback request with code and state

        Returns:
            Callback response with account info and pages

        Raises:
            FacebookStateException: If state token is invalid or expired
            FacebookTokenExchangeException: If token exchange fails
            FacebookUserInfoFetchException: If user info fetch fails
            FacebookPageFetchException: If page fetch fails
        """
        # 1. Verify state token from Redis
        state_key = f"oauth:facebook:state:{request.state}"
        seller_user_id_str = await self.redis.get(state_key)

        if not seller_user_id_str:
            raise FacebookStateException()

        seller_user_id = UUID(seller_user_id_str)

        # 2. Exchange code for short-lived token
        logger.info(f"Exchanging code for short-lived token (state={request.state[:8]}...)")
        short_lived_result = await self.facebook_service.exchange_code_for_token(code=request.code)

        # 3. Exchange for long-lived token (60-day)
        logger.info("Exchanging for long-lived token (60-day)")
        long_lived_result = await self.facebook_service.exchange_for_long_lived_token(
            short_lived_token=short_lived_result.access_token
        )

        # 4. Get user info from Facebook
        logger.info("Fetching user info from Facebook")
        user_info = await self.facebook_service.get_user_info(
            access_token=long_lived_result.access_token
        )

        # 5. Check if account already exists
        existing_account = await self.account_repository.get_by_facebook_user_id(
            facebook_user_id=user_info.facebook_user_id
        )

        if existing_account:
            # Update existing account
            logger.info(f"Updating existing Facebook account: {existing_account.id}")
            existing_account.access_token_encrypted = self.encryption_service.encrypt(
                long_lived_result.access_token
            )
            existing_account.token_expires_at = long_lived_result.expires_at
            existing_account.status = FacebookAccountStatus.ACTIVE
            existing_account.updated_at = datetime.now(UTC)

            account = await self.account_repository.update(existing_account)

            # Delete old pages (will re-fetch)
            await self.page_repository.delete_by_facebook_account_id(account.id)
        else:
            # Create new account
            logger.info(f"Creating new Facebook account for user: {user_info.facebook_user_id}")

            # Check if account with same seller_user_id exists
            existing_accounts = await self.account_repository.get_by_seller_user_id(
                seller_user_id=seller_user_id
            )
            if existing_accounts:
                # Option: Allow multiple Facebook accounts per vendedor
                # or raise error if only one allowed
                pass

            account = FacebookAccount.create(
                seller_user_id=seller_user_id,
                facebook_user_id=user_info.facebook_user_id,
                facebook_name=user_info.name,
                access_token_encrypted=self.encryption_service.encrypt(
                    long_lived_result.access_token
                ),
                token_expires_at=long_lived_result.expires_at,
                scopes=long_lived_result.scopes,
            )

            account = await self.account_repository.create(account)

        # 6. Get user pages
        logger.info("Fetching user pages from Facebook")
        pages_data = await self.facebook_service.get_user_pages(
            access_token=long_lived_result.access_token
        )

        # 7. Store pages
        page_dtos: list[FacebookPageDTO] = []
        for page_data in pages_data:
            page = FacebookPage.create(
                facebook_account_id=account.id,
                page_id=page_data.page_id,
                page_name=page_data.page_name,
                page_access_token_encrypted=self.encryption_service.encrypt(page_data.access_token),
                category=page_data.category,
                picture_url=page_data.picture_url,
                is_default=False,  # First page is not automatically default
            )

            page = await self.page_repository.create(page)

            page_dtos.append(
                FacebookPageDTO(
                    id=page.id,
                    page_id=page.page_id,
                    page_name=page.page_name,
                    category=page.category,
                    picture_url=page.picture_url,
                    is_default=page.is_default,
                )
            )

        # 8. Cleanup state token (consume after successful use)
        await self.redis.delete(state_key)

        logger.info(
            f"Facebook OAuth callback successful: account={account.id}, pages={len(page_dtos)}"
        )

        return FacebookOAuthCallbackResponse(
            account_id=account.id,
            facebook_user_id=account.facebook_user_id,
            facebook_name=account.facebook_name,
            pages_count=len(page_dtos),
            pages=page_dtos,
        )
