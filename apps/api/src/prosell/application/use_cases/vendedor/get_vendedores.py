"""Get vendedores (salespersons) use case for ProSell SaaS."""

from uuid import UUID

from prosell.application.dto.vendedor import VendedorListResponse, VendedorResponse
from prosell.domain.exceptions.org_exceptions import OrgDomainException
from prosell.domain.repositories.user_repository import AbstractUserRepository




class GetVendedoresUseCase:
    """
    Get all vendedores (salespersons) in an organization.

    This use case retrieves all users with the 'vendedor' role
    within a tenant (organization).
    """

    def __init__(self, user_repository: AbstractUserRepository) -> None:
        """
        Initialize GetVendedoresUseCase.

        Args:
            user_repository: Repository for user data access
        """
        self._user_repository = user_repository

    async def execute(
        self,
        tenant_id: UUID,
        skip: int = 0,
        limit: int = 100,
    ) -> VendedorListResponse:
        """
        Get all vendedores in the organization.

        Args:
            tenant_id: Organization/tenant ID
            skip: Number of records to skip (pagination)
            limit: Maximum number of records to return

        Returns:
            VendedorListResponse with list of vendedores

        Raises:
            OrgDomainException: If tenant_id is invalid
        """
        if not tenant_id:
            raise OrgDomainException("Tenant ID is required")

        # Get all users with 'vendedor' role in this tenant
        users = await self._user_repository.get_users_by_tenant_and_role(
            tenant_id=tenant_id,
            role="vendedor",
            skip=skip,
            limit=limit,
        )  # type: ignore[call-arg]

        # Get total count
        total = await self._user_repository.count_users_by_tenant_and_role(
            tenant_id=tenant_id,
            role="vendedor",
        )  # type: ignore[call-arg]

        # Transform to DTOs
        items = [
            VendedorResponse(
                id=str(user.id),  # type: ignore[attr-defined]
                user_id=str(user.id),  # type: ignore[attr-defined]
                tenant_id=str(user.tenant_id),  # type: ignore[attr-defined]
                name=user.full_name,  # type: ignore[attr-defined]
                email=user.email,  # type: ignore[attr-defined]
                role=user.roles[0] if user.roles and len(user.roles) > 0 else "vendedor",  # type: ignore[index]
                created_at=user.created_at.isoformat(),  # type: ignore[attr-defined]
                updated_at=user.updated_at.isoformat(),  # type: ignore[attr-defined]
            )
            for user in users  # type: ignore[assignment]
        ]

        return VendedorListResponse(
            items=items,  # type: ignore[arg-type]
            total=total,
            limit=limit,
            offset=skip,
        )
