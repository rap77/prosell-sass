"""List Facebook Accounts use case."""

from uuid import UUID

from prosell.application.dto.facebook import FacebookAccountDTO
from prosell.domain.repositories.facebook_account_repository import IFacebookAccountRepository


class ListAccountsUseCase:
    """Use case for listing Facebook accounts."""

    def __init__(self, account_repository: IFacebookAccountRepository) -> None:
        self.account_repository = account_repository

    async def execute(self, seller_user_id: UUID) -> list[FacebookAccountDTO]:
        """List all Facebook accounts for a seller."""
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
