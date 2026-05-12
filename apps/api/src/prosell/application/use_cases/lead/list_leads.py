"""ListLeadsUseCase — role-based lead listing with product data."""

from typing import TYPE_CHECKING

from uuid import UUID

from prosell.application.dto.lead.request import ListLeadsRequest
from prosell.application.dto.lead.response import LeadListResponse, LeadResponse
from prosell.application.dto.product.response import ProductSummaryForLead
from prosell.domain.entities.role import RoleType
from prosell.domain.entities.user import User
from prosell.domain.repositories.lead_repository import AbstractLeadRepository

if TYPE_CHECKING:
    from prosell.infrastructure.models.product_model import ProductModel


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
        tenant_id: UUID | None = user.tenant_id
        if tenant_id is None:
            raise ValueError("User must have a tenant_id")

        if self._is_manager(user):
            leads_with_products, total = await self.lead_repository.list_by_manager(  # type: ignore[call-arg]
                tenant_id=tenant_id,  # type: ignore[arg-type]
                limit=request.limit,
                offset=request.offset,
                status=request.status,
                vendedor_id=request.vendedor_id,
            )
        else:
            leads_with_products, total = await self.lead_repository.list_by_vendedor(  # type: ignore[call-arg]
                tenant_id=tenant_id,  # type: ignore[arg-type]
                vendedor_id=user.id,
                limit=request.limit,
                offset=request.offset,
                status=request.status,
            )

        items = []
        for item in leads_with_products:  # type: ignore[assignment]
            lead = item.lead  # type: ignore[attr-defined]
            product_model: ProductModel | None = item.product_model  # type: ignore[attr-defined]

            product = None
            if product_model:
                product = ProductSummaryForLead(
                    id=product_model.id,  # type: ignore[attr-defined]
                    title=product_model.title,  # type: ignore[attr-defined]
                    price_cents=product_model.price_cents,  # type: ignore[attr-defined]
                    currency=product_model.currency,  # type: ignore[attr-defined]
                    status=product_model.status,  # type: ignore[attr-defined]
                    attributes=product_model.attributes or {},  # type: ignore[attr-defined]
                    created_at=product_model.created_at,  # type: ignore[attr-defined]
                    updated_at=product_model.updated_at,  # type: ignore[attr-defined]
                )

            items.append(LeadResponse.from_entity(lead, product=product))  # type: ignore[arg-type]

        return LeadListResponse(
            items=items,  # type: ignore[arg-type]
            total=total,
            limit=request.limit,
            offset=request.offset,
        )
