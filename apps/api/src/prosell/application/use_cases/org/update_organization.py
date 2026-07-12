"""Update organization use case."""

from uuid import UUID

from prosell.application.dto.org import OrganizationResponse, UpdateOrganizationRequest
from prosell.domain.exceptions.org_exceptions import OrganizationNotFoundException
from prosell.domain.repositories.organization_repository import AbstractOrganizationRepository


class UpdateOrganizationUseCase:
    """Update organization basic info, logo, banner, or settings."""

    def __init__(self, org_repository: AbstractOrganizationRepository) -> None:
        self.org_repository = org_repository

    async def execute(
        self,
        org_id: UUID,
        tenant_id: UUID,
        request: UpdateOrganizationRequest,
    ) -> OrganizationResponse:
        """
        Update organization fields.

        Args:
            org_id: Organization UUID
            tenant_id: Tenant UUID for isolation
            request: UpdateOrganizationRequest DTO

        Returns:
            Updated OrganizationResponse DTO

        Raises:
            OrganizationNotFoundException: If not found
        """
        org = await self.org_repository.get_by_id(org_id, tenant_id)
        if not org:
            raise OrganizationNotFoundException(str(org_id))

        # Apply only provided fields
        org.update_basic_info(
            name=request.name,
            code=request.code,
            description=request.description,
            website=request.website,
            phone=request.phone,
            email=request.email,
            whatsapp=request.whatsapp,
            street_address=request.street_address,
            city=request.city,
            state=request.state,
            postal_code=request.postal_code,
            country=request.country,
            tax_id=request.tax_id,
            instagram=request.instagram,
            facebook=request.facebook,
        )

        if request.logo_url is not None:
            org.update_logo(request.logo_url)

        if request.banner_url is not None:
            org.update_banner(request.banner_url)

        if request.settings is not None:
            org.update_settings(request.settings)

        updated = await self.org_repository.update(org)
        return OrganizationResponse.from_entity(updated)
