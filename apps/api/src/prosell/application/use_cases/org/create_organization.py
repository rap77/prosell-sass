"""Create organization use case."""

from uuid import UUID

from prosell.application.dto.org import CreateOrganizationRequest, OrganizationResponse
from prosell.domain.entities.organization import Organization
from prosell.domain.entities.wallet import Wallet
from prosell.domain.exceptions.org_exceptions import OrganizationAlreadyExistsException
from prosell.domain.repositories.organization_repository import AbstractOrganizationRepository
from prosell.domain.repositories.wallet_repository import AbstractWalletRepository


class CreateOrganizationUseCase:
    """Create a new organization and its default wallet."""

    def __init__(
        self,
        org_repository: AbstractOrganizationRepository,
        wallet_repository: AbstractWalletRepository,
    ) -> None:
        self.org_repository = org_repository
        self.wallet_repository = wallet_repository

    async def execute(
        self,
        request: CreateOrganizationRequest,
        creator_id: UUID,
    ) -> OrganizationResponse:
        """
        Execute organization creation.

        Creates org in PENDING_VERIFICATION status and provisions a wallet.

        Args:
            request: CreateOrganizationRequest DTO
            creator_id: User ID creating the organization

        Returns:
            OrganizationResponse DTO

        Raises:
            OrganizationAlreadyExistsException: If name already taken for tenant
        """
        # 1. Check uniqueness within tenant
        exists = await self.org_repository.exists_by_name(request.name, request.tenant_id)
        if exists:
            raise OrganizationAlreadyExistsException(request.name)

        # 2. Create organization entity
        org = Organization.create(
            name=request.name,
            tenant_id=request.tenant_id,
            creator_id=creator_id,
        )

        # Apply optional fields
        if request.description is not None:
            org.description = request.description
        if request.website is not None:
            org.website = request.website
        if request.phone is not None:
            org.phone = request.phone

        # 3. Persist organization
        org = await self.org_repository.create(org)

        # 4. Create default wallet for org
        wallet = Wallet.create(org_id=org.id, tenant_id=org.tenant_id)
        wallet = await self.wallet_repository.create(wallet)

        # 5. Link wallet back to org
        org.wallet_id = wallet.id
        org = await self.org_repository.update(org)

        return OrganizationResponse.from_entity(org)
