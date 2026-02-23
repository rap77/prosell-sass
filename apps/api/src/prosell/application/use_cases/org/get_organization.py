"""Get organization use cases."""

from uuid import UUID

from prosell.application.dto.org import OrganizationListResponse, OrganizationResponse
from prosell.domain.exceptions.org_exceptions import OrganizationNotFoundException
from prosell.domain.repositories.organization_repository import AbstractOrganizationRepository


class GetOrganizationUseCase:
    """Get a single organization by ID."""

    def __init__(self, org_repository: AbstractOrganizationRepository) -> None:
        self.org_repository = org_repository

    async def execute(self, org_id: UUID, tenant_id: UUID) -> OrganizationResponse:
        """
        Fetch organization by ID.

        Args:
            org_id: Organization UUID
            tenant_id: Tenant UUID for isolation

        Returns:
            OrganizationResponse DTO

        Raises:
            OrganizationNotFoundException: If not found
        """
        org = await self.org_repository.get_by_id(org_id, tenant_id)
        if not org:
            raise OrganizationNotFoundException(str(org_id))
        return OrganizationResponse.from_entity(org)


class GetOrganizationByTenantUseCase:
    """Get organization by tenant ID (current user's org)."""

    def __init__(self, org_repository: AbstractOrganizationRepository) -> None:
        self.org_repository = org_repository

    async def execute(self, tenant_id: UUID) -> OrganizationResponse:
        """
        Fetch organization by tenant ID.

        Args:
            tenant_id: Tenant UUID

        Returns:
            OrganizationResponse DTO

        Raises:
            OrganizationNotFoundException: If not found
        """
        org = await self.org_repository.get_by_tenant_id(tenant_id)
        if not org:
            raise OrganizationNotFoundException()
        return OrganizationResponse.from_entity(org)


class ListOrganizationsUseCase:
    """List organizations with pagination."""

    def __init__(self, org_repository: AbstractOrganizationRepository) -> None:
        self.org_repository = org_repository

    async def execute(
        self,
        tenant_id: UUID | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> OrganizationListResponse:
        """
        List organizations.

        Args:
            tenant_id: Optional tenant filter (None = all, for SUPER_ADMIN)
            skip: Pagination offset
            limit: Pagination limit

        Returns:
            OrganizationListResponse DTO
        """
        orgs = await self.org_repository.get_all(
            tenant_id=tenant_id,
            skip=skip,
            limit=limit,
        )
        total = await self.org_repository.count(tenant_id=tenant_id)

        return OrganizationListResponse(
            organizations=[OrganizationResponse.from_entity(o) for o in orgs],
            total=total,
            skip=skip,
            limit=limit,
        )
