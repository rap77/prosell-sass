"""ListLeadsUseCase — role-based lead listing with product data."""

from uuid import UUID

from prosell.application.dto.lead.request import ListLeadsRequest
from prosell.application.dto.lead.response import LeadListResponse, LeadResponse
from prosell.application.dto.product.response import ProductSummaryForLead
from prosell.domain.entities.role import RoleType
from prosell.domain.entities.user import User
from prosell.domain.repositories.lead_repository import AbstractLeadRepository


class ListLeadsUseCase:
    """
    List leads with role-based filtering and product data.

    Business rules:
    - SALES_AGENT (vendedor): sees only leads assigned to themselves
    - MANAGER, SUPER_ADMIN, ADMIN: see all leads in the tenant
    - All queries are scoped to tenant_id from JWT
    - Product data is included via LEFT JOIN (null if no product)
    """

    _MANAGER_ROLES = {
        RoleType.SUPER_ADMIN,
        RoleType.ADMIN,
        RoleType.MANAGER,
    }

    def __init__(self, lead_repository: AbstractLeadRepository) -> None:
        self.lead_repository = lead_repository

    def _is_manager(self, user: User) -> bool:
        if not user.roles:
            return False
        return any(role.role_type in self._MANAGER_ROLES for role in user.roles)

    async def execute(
        self,
        user: User,
        request: ListLeadsRequest,
    ) -> LeadListResponse:
        tenant_id: UUID = user.tenant_id

        if self._is_manager(user):
            leads_with_products, total = await self.lead_repository.list_by_manager(
                tenant_id=tenant_id,
                limit=request.limit,
                offset=request.offset,
                status=request.status,
                vendedor_id=request.vendedor_id,
                include_products=True,
            )
        else:
            leads_with_products, total = await self.lead_repository.list_by_vendedor(
                tenant_id=tenant_id,
                vendedor_id=user.id,
                limit=request.limit,
                offset=request.offset,
                status=request.status,
                include_products=True,
            )

        items = []
        for item in leads_with_products:
            lead = item.lead
            product_model = item.product_model

            product = None
            if product_model:
                product = ProductSummaryForLead(
                    id=product_model.id,
                    title=product_model.title,
                    price_cents=product_model.price_cents,
                    currency=product_model.currency,
                    status=product_model.status,
                    attributes=product_model.attributes or {},
                    created_at=product_model.created_at,
                    updated_at=product_model.updated_at,
                )

            items.append(LeadResponse.from_entity(lead, product=product))

        return LeadListResponse(
            items=items,
            total=total,
            limit=request.limit,
            offset=request.offset,
        )
