"""Refresh Facebook Token use case.

Scheduled task to refresh expiring Facebook access tokens.
"""

import logging
from datetime import UTC, datetime, timedelta
from typing import TypedDict
from uuid import UUID

from prosell.domain.entities.facebook_account import FacebookAccount, FacebookAccountStatus
from prosell.domain.exceptions.facebook_exceptions import (
    FacebookAccountNotFoundException,
    FacebookTokenRefreshException,
)
from prosell.domain.ports.i_encryption_service import IEncryptionService
from prosell.domain.ports.i_facebook_marketplace_service import (
    IFacebookMarketplaceOAuthService,
)
from prosell.domain.repositories.facebook_account_repository import (
    IFacebookAccountRepository,
)

logger = logging.getLogger(__name__)


class RefreshTokenResult(TypedDict):
    """Result of RefreshTokenUseCase.execute()."""

    total: int
    refreshed: int
    failed: int
    results: list[dict[str, str]]


class RefreshTokenUseCase:
    """Use case for refreshing Facebook access tokens.

    Scheduled task that:
    1. Finds accounts expiring in 48 hours
    2. Refreshes tokens using Facebook API
    3. Updates encrypted tokens in database
    4. Handles failures with circuit breaker logic
    """

    def __init__(
        self,
        account_repository: IFacebookAccountRepository,
        facebook_service: IFacebookMarketplaceOAuthService,
        encryption_service: IEncryptionService,
    ) -> None:
        self.account_repository = account_repository
        self.facebook_service = facebook_service
        self.encryption_service = encryption_service

    async def execute(
        self,
        hours_before: int = 48,
    ) -> RefreshTokenResult:
        """
        Execute token refresh for all expiring accounts.

        Args:
            hours_before: How many hours before expiry to refresh (default: 48)

        Returns:
            Refresh results with counts and details
        """
        # Find accounts expiring soon
        threshold = datetime.now(UTC) + timedelta(hours=hours_before)
        expiring_accounts = await self.account_repository.get_accounts_expiring_before(
            threshold=threshold
        )

        logger.info(f"Found {len(expiring_accounts)} accounts expiring before {threshold}")

        results: list[dict[str, str]] = []
        refreshed_count = 0
        failed_count = 0

        for account in expiring_accounts:
            try:
                await self.refresh_account(account)
                refreshed_count += 1
                results.append(
                    {
                        "account_id": str(account.id),
                        "status": "refreshed",
                    }
                )
            except Exception as e:
                failed_count += 1
                logger.error(f"Failed to refresh token for account {account.id}: {e}")
                results.append(
                    {
                        "account_id": str(account.id),
                        "status": "failed",
                        "error": str(e),
                    }
                )

                # Handle failure: increment counter and mark as expired if needed
                account.increment_refresh_failure()

                if not account.can_retry_refresh(max_retries=5):
                    # Max retries reached - mark as expired
                    account.mark_expired()
                    logger.warning(
                        f"Account {account.id} marked as expired "
                        f"after {account.refresh_failure_count} failures"
                    )

                await self.account_repository.update(account)

        return {
            "total": len(expiring_accounts),
            "refreshed": refreshed_count,
            "failed": failed_count,
            "results": results,
        }

    async def refresh_account(self, account: FacebookAccount) -> None:
        """Refresh a single account's token.

        Args:
            account: FacebookAccount entity

        Raises:
            FacebookTokenRefreshException: If refresh fails
        """
        # Decrypt current token
        try:
            current_token = self.encryption_service.decrypt(account.access_token_encrypted)
        except Exception as e:
            raise FacebookTokenRefreshException(
                account_id=str(account.id),
                reason=f"decrypt_failed: {e}",
            ) from e

        # Exchange for new long-lived token
        try:
            new_token_result = await self.facebook_service.exchange_for_long_lived_token(
                short_lived_token=current_token
            )
        except Exception as e:
            raise FacebookTokenRefreshException(
                account_id=str(account.id),
                reason=f"exchange_failed: {e}",
            ) from e

        # Update account with new encrypted token
        account.access_token_encrypted = self.encryption_service.encrypt(
            new_token_result.access_token
        )
        account.token_expires_at = new_token_result.expires_at
        account.updated_at = datetime.now(UTC)
        account.refresh_failure_count = 0  # Reset on success

        # Ensure account is active
        if account.status != FacebookAccountStatus.ACTIVE:
            account.status = FacebookAccountStatus.ACTIVE

        await self.account_repository.update(account)

        logger.info(f"Successfully refreshed token for account {account.id}")


class RefreshSingleTokenUseCase:
    """Use case for refreshing a single Facebook account token."""

    def __init__(
        self,
        account_repository: IFacebookAccountRepository,
        refresh_use_case: RefreshTokenUseCase,
    ) -> None:
        self.account_repository = account_repository
        self.refresh_use_case = refresh_use_case

    async def execute(self, account_id: UUID) -> FacebookAccount:
        """
        Execute token refresh for a single account.

        Args:
            account_id: Facebook account ID

        Returns:
            Updated FacebookAccount

        Raises:
            FacebookAccountNotFoundException: If account not found
            FacebookTokenRefreshException: If refresh fails
        """
        account = await self.account_repository.get_by_id(account_id)
        if not account:
            raise FacebookAccountNotFoundException(str(account_id))

        await self.refresh_use_case.refresh_account(account)

        # Return updated account
        updated = await self.account_repository.get_by_id(account_id)
        if not updated:
            raise FacebookAccountNotFoundException(str(account_id))
        return updated
