"""ListLeadsUseCase — role-based lead listing with pagination."""

from uuid import UUID

from prosell.application.dto.lead.request import ListLeadsRequest
from prosell.application.dto.lead.response import LeadListResponse, LeadResponse
from prosell.domain.entities.role import RoleType
from prosell.domain.entities.user import User
from prosell.domain.repositories.lead_repository import AbstractLeadRepository


class ListLeadsUseCase:
    """
    List leads with role-based filtering.

    Business rules:
    - SALES_AGENT (vendedor): sees only leads assigned to themselves
    - MANAGER, SUPER_ADMIN, ADMIN: see all leads in the tenant
    - All queries are scoped to tenant_id from JWT
    """

    _MANAGER_ROLES = {
        RoleType.SUPER_ADMIN,
        RoleType.ADMIN,
        RoleType.MANAGER,
    }

    def __init__(self, lead_repository: AbstractLeadRepository) -> None:
        self.lead_repository = lead_repository

    def _is_manager(self, user: User) -> bool:
        """Check if user has manager-level access."""
        if not user.roles:
            return False
        return any(role.role_type in self._MANAGER_ROLES for role in user.roles)

    async def execute(
        self,
        user: User,
        request: ListLeadsRequest,
    ) -> LeadListResponse:
        """
        Execute lead listing.

        Args:
            user: Authenticated user (roles + tenant_id)
            request: ListLeadsRequest DTO with pagination params

        Returns:
            LeadListResponse DTO
        """
        tenant_id: UUID = user.tenant_id

        if self._is_manager(user):
            leads, total = await self.lead_repository.list_by_manager(
                tenant_id=tenant_id,
                limit=request.limit,
                offset=request.offset,
                status=request.status,
            )
        else:
            # Default: vendedor sees only their own leads
            leads, total = await self.lead_repository.list_by_vendedor(
                tenant_id=tenant_id,
                vendedor_id=user.id,
                limit=request.limit,
                offset=request.offset,
                status=request.status,
            )

        return LeadListResponse(
            items=[LeadResponse.from_entity(lead) for lead in leads],
            total=total,
            limit=request.limit,
            offset=request.offset,
        )
