"""BulkAssignUseCase - Assign multiple users to multiple dealers."""

from uuid import UUID

from prosell.application.dto.user_dealer import BulkAssignRequest
from prosell.domain.exceptions.user_dealer_exceptions import (
    UserDealerAlreadyAssignedError,
)
from prosell.domain.repositories.user_dealer_repository import (
    AbstractUserDealerRepository,
)


class BulkAssignUseCase:
    """Bulk assign users to dealers (Cartesian product)."""

    def __init__(
        self,
        user_dealer_repository: AbstractUserDealerRepository,
    ) -> None:
        self.user_dealer_repository = user_dealer_repository

    async def execute(
        self,
        request: BulkAssignRequest,
        tenant_id: UUID,
        assigned_by: UUID,
    ) -> dict[str, int]:
        """
        Execute bulk assignment (Cartesian product of user_ids x dealer_ids).

        Args:
            request: BulkAssignRequest with user_ids and dealer_ids lists
            tenant_id: Tenant UUID for isolation
            assigned_by: UUID of user making the assignment

        Returns:
            Dict with "assigned_count" key
        """
        assigned_count = 0

        # Cartesian product: assign each user to each dealer
        for user_id in request.user_ids:
            for dealer_id in request.dealer_ids:
                try:
                    # Check if already exists
                    exists = await self.user_dealer_repository.exists(
                        user_id=user_id,
                        dealer_id=dealer_id,
                        tenant_id=tenant_id,
                    )

                    if not exists:
                        # Create assignment
                        await self.user_dealer_repository.assign(
                            user_id=user_id,
                            dealer_id=dealer_id,
                            tenant_id=tenant_id,
                            assigned_by=assigned_by,
                        )
                        assigned_count += 1
                except UserDealerAlreadyAssignedError:
                    # Skip duplicates (idempotent)
                    pass

        return {"assigned_count": assigned_count}
