"""Fetch Facebook Pages use case."""

from uuid import UUID

from prosell.application.dto.facebook import FacebookPageDTO
from prosell.domain.exceptions.facebook_exceptions import FacebookAccountNotFoundException
from prosell.domain.repositories.facebook_account_repository import IFacebookAccountRepository
from prosell.domain.repositories.facebook_page_repository import IFacebookPageRepository


class FetchPagesUseCase:
    """Use case for fetching Facebook pages for an account."""

    def __init__(
        self,
        page_repository: IFacebookPageRepository,
        account_repository: IFacebookAccountRepository,
    ) -> None:
        self.page_repository = page_repository
        self.account_repository = account_repository

    async def execute(self, account_id: UUID, seller_user_id: UUID) -> list[FacebookPageDTO]:
        """Fetch all pages for a Facebook account, verifying ownership."""
        account = await self.account_repository.get_by_id(account_id)
        if not account:
            raise FacebookAccountNotFoundException(str(account_id))

        if account.seller_user_id != seller_user_id:
            raise FacebookAccountNotFoundException(str(account_id))

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
