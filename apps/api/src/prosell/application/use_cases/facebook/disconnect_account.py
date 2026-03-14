"""Disconnect Facebook Account use case."""

import logging
from uuid import UUID

from prosell.application.dto.facebook import (
    DisconnectFacebookAccountRequest,
    DisconnectFacebookAccountResponse,
    FacebookAccountDTO,
    FacebookPageDTO,
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


class FetchPagesUseCase:
    """Use case for fetching Facebook pages.

    Re-fetches pages from Facebook using stored access token.
    """

    def __init__(
        self,
        page_repository: IFacebookPageRepository,
    ) -> None:
        self.page_repository = page_repository

    async def execute(
        self,
        account_id: UUID,
    ) -> list[FacebookPageDTO]:
        """
        Execute fetch pages.

        Args:
            account_id: Facebook account ID

        Returns:
            List of FacebookPageDTOs
        """
        pages = await self.page_repository.get_by_facebook_account_id(account_id)

        return [
            FacebookPageDTO(
                id=page.id,
                page_id=page.page_id,
                page_name=page.page_name,
                category=page.category,
                picture_url=page.picture_url,
                is_default=page.is_default,
            )
            for page in pages
        ]


class SetDefaultPageUseCase:
    """Use case for setting default Facebook page."""

    def __init__(
        self,
        page_repository: IFacebookPageRepository,
        account_repository: IFacebookAccountRepository,
    ) -> None:
        self.page_repository = page_repository
        self.account_repository = account_repository

    async def execute(
        self,
        account_id: UUID,
        page_id: UUID,
        seller_user_id: UUID,
    ) -> None:
        """
        Execute set default page.

        Args:
            account_id: Facebook account ID
            page_id: Page ID to set as default
            seller_user_id: ProSell vendedor user ID (for authorization)

        Raises:
            FacebookAccountNotFoundException: If account not found
            FacebookPageNotFoundException: If page not found
        """
        # Verify account exists and belongs to seller
        account = await self.account_repository.get_by_id(account_id)
        if not account:
            raise FacebookAccountNotFoundException(str(account_id))

        if account.seller_user_id != seller_user_id:
            raise FacebookAccountNotFoundException(str(account_id))

        # Set default page (repository handles unsetting other pages)
        # Set default page (repository handles unsetting other pages)
        await self.page_repository.set_default_page(
            facebook_account_id=account_id,
            page_id=page_id,
        )


class ListAccountsUseCase:
    """Use case for listing Facebook accounts."""

    def __init__(
        self,
        account_repository: IFacebookAccountRepository,
    ) -> None:
        self.account_repository = account_repository

    async def execute(
        self,
        seller_user_id: UUID,
    ) -> list[FacebookAccountDTO]:
        """
        Execute list accounts.

        Args:
            seller_user_id: ProSell vendedor user ID

        Returns:
            List of FacebookAccountDTOs
        """
        accounts = await self.account_repository.get_by_seller_user_id(seller_user_id)

        return [
            FacebookAccountDTO(
                id=account.id,
                facebook_user_id=account.facebook_user_id,
                facebook_name=account.facebook_name,
                status=account.status.value,
                token_expires_at=account.token_expires_at,
                created_at=account.created_at,
                updated_at=account.updated_at,
            )
            for account in accounts
        ]
