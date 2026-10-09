"""ListLeadsUseCase — role-based lead listing with product data."""

from datetime import datetime
from typing import ClassVar, NamedTuple, Protocol
from uuid import UUID

from prosell.application.dto.lead.request import ListLeadsRequest
from prosell.application.dto.lead.response import LeadListResponse, LeadResponse
from prosell.application.dto.product.response import ProductSummaryForLead
from prosell.domain.entities.lead import Lead
from prosell.domain.entities.role import RoleType
from prosell.domain.entities.user import User
from prosell.domain.repositories.lead_repository import AbstractLeadRepository
from prosell.domain.value_objects.permission_scope import (
    AllScope,
    ExplicitOrgsScope,
    OwnScope,
)


class SupportsLeadProductSummary(Protocol):
    """Minimal product shape needed to build ProductSummaryForLead."""

    id: UUID
    title: str
    price_cents: int
    currency: str
    status: str
    attributes: dict[str, object] | None
    created_at: datetime
    updated_at: datetime


class LeadWithProduct(NamedTuple):
    """Lead entity with optional product model."""

    lead: Lead
    product_model: SupportsLeadProductSummary | None = None


class ListLeadsUseCase:
    """
    List leads with role-based filtering and product data.

    Business rules:
    - SALES_AGENT (vendedor): sees only leads assigned to themselves (OwnScope)
    - MANAGER, SUPER_ADMIN, ADMIN: see all leads in the tenant (AllScope)
    - ExplicitOrgsScope: sees leads from explicitly assigned organizations
    - All queries are scoped to tenant_id from JWT + ROLE_SCOPE
    - Product data is included via LEFT JOIN (null if no product)
    """

    _MANAGER_ROLES: ClassVar[frozenset] = frozenset(
        {
            RoleType.SUPER_ADMIN,
            RoleType.ADMIN,
            RoleType.MANAGER,
        }
    )

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
        scope: AllScope | ExplicitOrgsScope | OwnScope | None = None,
    ) -> LeadListResponse:
        tenant_id: UUID | None = user.tenant_id
        if tenant_id is None:
            raise ValueError("User must have a tenant_id")

        # If scope not provided, infer from user roles (backward compatibility)
        if scope is None:
            scope = AllScope() if self._is_manager(user) else OwnScope()

        # Determine effective organization filter based on scope
        if isinstance(scope, OwnScope):
            # OwnScope: user sees only their assigned leads
            leads, total = await self.lead_repository.list_by_vendedor(
                tenant_id=tenant_id,
                vendedor_id=user.id,
                limit=request.limit,
                offset=request.offset,
                status=request.status,
                include_products=True,
            )
        elif isinstance(scope, AllScope):
            # AllScope: user sees all leads in tenant (manager/admin)
            leads, total = await self.lead_repository.list_by_manager(
                tenant_id=tenant_id,
                limit=request.limit,
                offset=request.offset,
                status=request.status,
                vendedor_id=request.vendedor_id,
                include_products=True,
            )
        elif isinstance(scope, ExplicitOrgsScope):
            if not scope.permits(organization_id=tenant_id, actor_organization_id=tenant_id):
                leads, total = [], 0
            else:
                leads, total = await self.lead_repository.list_by_manager(
                    tenant_id=tenant_id,
                    limit=request.limit,
                    offset=request.offset,
                    status=request.status,
                    vendedor_id=request.vendedor_id,
                    include_products=True,
                )
        else:
            # Unknown scope type - deny access
            leads, total = [], 0

        items = []
        for item in leads:
            lead = getattr(item, "lead", item)
            product_model = getattr(item, "product_model", None)

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
