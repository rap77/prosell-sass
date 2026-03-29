"""RemoveUserDealerUseCase - Remove a user-dealer assignment."""

from uuid import UUID

from prosell.domain.repositories.user_dealer_repository import (
    AbstractUserDealerRepository,
)


class RemoveUserDealerUseCase:
    """Remove a user-dealer assignment."""

    def __init__(
        self,
        user_dealer_repository: AbstractUserDealerRepository,
    ) -> None:
        self.user_dealer_repository = user_dealer_repository

    async def execute(
        self,
        user_id: UUID,
        dealer_id: UUID,
        tenant_id: UUID,
    ) -> None:
        """
        Remove user-dealer assignment.

        Args:
            user_id: User UUID
            dealer_id: Dealer UUID
            tenant_id: Tenant UUID for isolation

        Returns:
            None (204 No Content in API)
        """
        await self.user_dealer_repository.remove(
            user_id=user_id,
            dealer_id=dealer_id,
            tenant_id=tenant_id,
        )
