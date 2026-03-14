"""Disconnect Facebook Account use case."""

import logging

from prosell.application.dto.facebook import (
    DisconnectFacebookAccountRequest,
    DisconnectFacebookAccountResponse,
)
from prosell.domain.exceptions.facebook_exceptions import FacebookAccountNotFoundException
from prosell.domain.repositories.facebook_account_repository import (
    IFacebookAccountRepository,
)
from prosell.domain.repositories.facebook_page_repository import (
    IFacebookPageRepository,
)

logger = logging.getLogger(__name__)


class DisconnectFacebookAccountUseCase:
    """Use case for disconnecting Facebook account.

    Deletes the Facebook account and all associated pages.
    """

    def __init__(
        self,
        account_repository: IFacebookAccountRepository,
        page_repository: IFacebookPageRepository,
    ) -> None:
        self.account_repository = account_repository
        self.page_repository = page_repository

    async def execute(
        self,
        request: DisconnectFacebookAccountRequest,
    ) -> DisconnectFacebookAccountResponse:
        """
        Execute Facebook account disconnection.

        Args:
            request: Disconnect request with account_id and seller_user_id

        Returns:
            Disconnect response with account_id and pages_deleted count

        Raises:
            FacebookAccountNotFoundException: If account not found
        """
        # Verify account exists
        account = await self.account_repository.get_by_id(request.account_id)
        if not account:
            raise FacebookAccountNotFoundException(str(request.account_id))

        # Verify ownership (seller_user_id matches)
        if account.seller_user_id != request.seller_user_id:
            raise FacebookAccountNotFoundException(str(request.account_id))

        # Delete all pages first (cascade delete)
        pages_deleted = await self.page_repository.delete_by_facebook_account_id(
            facebook_account_id=request.account_id
        )

        # Delete account
        await self.account_repository.delete(request.account_id)

        logger.info(
            f"Disconnected Facebook account: {request.account_id}, pages deleted: {pages_deleted}"
        )

        return DisconnectFacebookAccountResponse(
            account_id=request.account_id,
            pages_deleted=pages_deleted,
        )
