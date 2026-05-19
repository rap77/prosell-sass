"""CompleteSetupUseCase — marks organization onboarding as complete."""

from uuid import UUID

from prosell.application.dto.org import OrganizationResponse
from prosell.domain.exceptions.org_exceptions import OrganizationNotFoundException
from prosell.domain.repositories.organization_repository import AbstractOrganizationRepository


class CompleteSetupUseCase:
    """Mark the onboarding wizard as complete (or reset it) for an organization."""

    def __init__(self, org_repository: AbstractOrganizationRepository) -> None:
        self.org_repository = org_repository

    async def execute(self, tenant_id: UUID, setup_complete: bool = True) -> OrganizationResponse:
        """
        Set setup_complete flag on the organization.

        Args:
            tenant_id: Tenant UUID (derived from authenticated user's JWT)
            setup_complete: True to mark onboarding done, False to reset

        Returns:
            Updated OrganizationResponse

        Raises:
            OrganizationNotFoundException: If no org exists for this tenant
        """
        org = await self.org_repository.get_by_tenant_id(tenant_id)
        if org is None:
            raise OrganizationNotFoundException(str(tenant_id))

        org.setup_complete = setup_complete
        updated = await self.org_repository.update(org)
        return OrganizationResponse.from_entity(updated)
