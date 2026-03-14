"""Set Default Facebook Page use case."""

from uuid import UUID

from prosell.domain.exceptions.facebook_exceptions import FacebookAccountNotFoundException
from prosell.domain.repositories.facebook_account_repository import IFacebookAccountRepository
from prosell.domain.repositories.facebook_page_repository import IFacebookPageRepository


class SetDefaultPageUseCase:
    """Use case for setting default Facebook page for publishing."""

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
        """Set a page as the default for Marketplace publishing."""
        account = await self.account_repository.get_by_id(account_id)
        if not account:
            raise FacebookAccountNotFoundException(str(account_id))

        if account.seller_user_id != seller_user_id:
            raise FacebookAccountNotFoundException(str(account_id))

        await self.page_repository.set_default_page(
            facebook_account_id=account_id,
            page_id=page_id,
        )
