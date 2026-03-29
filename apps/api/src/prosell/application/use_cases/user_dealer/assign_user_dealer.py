"""AssignUserDealer use case - Assign a dealer to a user with audit trail."""

from uuid import UUID

from prosell.application.dto.user_dealer import (
    AssignDealerRequest,
    UserDealerResponse,
)
from prosell.domain.entities.user_dealer import UserDealer
from prosell.domain.exceptions.dealer_exceptions import DealerNotFoundError
from prosell.domain.repositories.dealer_repository import AbstractDealerRepository
from prosell.domain.repositories.user_dealer_repository import (
    AbstractUserDealerRepository,
)


class AssignUserDealerUseCase:
    """Assign a dealer to a user with audit trail."""

    def __init__(
        self,
        user_dealer_repository: AbstractUserDealerRepository,
        dealer_repository: AbstractDealerRepository,
    ) -> None:
        self.user_dealer_repository = user_dealer_repository
        self.dealer_repository = dealer_repository

    async def execute(
        self,
        user_id: UUID,
        request: AssignDealerRequest,
        tenant_id: UUID,
        assigned_by: UUID,
    ) -> UserDealerResponse:
        """
        Execute user-dealer assignment.

        Args:
            user_id: User UUID to assign dealer to
            request: AssignDealerRequest with dealer_id
            tenant_id: Tenant UUID for isolation
            assigned_by: UUID of user making the assignment (audit trail)

        Returns:
            UserDealerResponse DTO

        Raises:
            DealerNotFoundError: If dealer does not exist
        """
        # 1. Validate dealer exists
        dealer = await self.dealer_repository.get_by_id(
            dealer_id=request.dealer_id,
            tenant_id=tenant_id,
        )
        if not dealer:
            raise DealerNotFoundError(dealer_id=request.dealer_id)

        # 2. Check for duplicate assignment
        exists = await self.user_dealer_repository.exists(
            user_id=user_id,
            dealer_id=request.dealer_id,
            tenant_id=tenant_id,
        )
        if exists:
            from prosell.domain.exceptions.user_dealer_exceptions import (
                UserDealerAlreadyAssignedError,
            )

            raise UserDealerAlreadyAssignedError(
                user_id=user_id,
                dealer_id=request.dealer_id,
            )

        # 3. Create assignment via entity factory
        user_dealer = UserDealer.assign(
            user_id=user_id,
            dealer_id=request.dealer_id,
            tenant_id=tenant_id,
            assigned_by=assigned_by,
        )

        # 4. Persist assignment
        user_dealer = await self.user_dealer_repository.assign(
            user_id=user_dealer.user_id,
            dealer_id=user_dealer.dealer_id,
            tenant_id=user_dealer.tenant_id,
            assigned_by=user_dealer.assigned_by,
        )

        # 5. Map to response DTO
        return UserDealerResponse(
            id=user_dealer.id,
            user_id=user_dealer.user_id,
            dealer_id=user_dealer.dealer_id,
            tenant_id=user_dealer.tenant_id,
            assigned_at=user_dealer.assigned_at,
            assigned_by=user_dealer.assigned_by,
        )
