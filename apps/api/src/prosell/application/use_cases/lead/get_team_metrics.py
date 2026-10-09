"""Get team metrics use case."""

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import ClassVar
from uuid import UUID

from prosell.application.dto.lead.response import TeamMetricsResponse, VendedorMetricsBreakdown
from prosell.domain.entities.lead import Lead, LeadStatus
from prosell.domain.entities.role import RoleType
from prosell.domain.entities.user import User
from prosell.domain.repositories.lead_repository import AbstractLeadRepository
from prosell.domain.repositories.user_repository import AbstractUserRepository
from prosell.domain.value_objects.permission_scope import (
    AllScope,
    ExplicitOrgsScope,
    OwnScope,
)


@dataclass(frozen=True)
class _LeadCounts:
    """Total/new/conversion-rate for one scope (tenant-wide, or one vendedor)."""

    total: int
    new_last_24h: int
    conversion_rate: float


def _compute_lead_counts(leads: list[Lead], cutoff_time: datetime) -> _LeadCounts:
    """Compute total/new/conversion-rate for a set of leads.

    Called once tenant-wide and once per vendedor — collapses what used to
    be six near-identical list comprehensions (backend decomposition Stage 2.2)
    into one reused helper.
    """
    total = len(leads)
    new_last_24h = len([lead for lead in leads if lead.created_at >= cutoff_time])
    converted = len([lead for lead in leads if lead.status == LeadStatus.APPOINTMENT_SET])
    conversion_rate = converted / total if total > 0 else 0.0
    return _LeadCounts(total=total, new_last_24h=new_last_24h, conversion_rate=conversion_rate)


class GetTeamMetricsUseCase:
    """Use case for getting team lead metrics."""

    _MANAGER_ROLES: ClassVar[frozenset] = frozenset(
        {
            RoleType.SUPER_ADMIN,
            RoleType.ADMIN,
            RoleType.MANAGER,
        }
    )

    def __init__(
        self,
        lead_repo: AbstractLeadRepository,
        user_repo: AbstractUserRepository,
    ) -> None:
        """Initialize GetTeamMetricsUseCase."""
        self.lead_repo = lead_repo
        self.user_repo = user_repo

    def _is_manager(self, user: User) -> bool:
        """Check if user has manager-level access."""
        if not user.roles:
            return False
        return any(role.role_type in self._MANAGER_ROLES for role in user.roles)

    async def execute(
        self,
        tenant_id: UUID,
        user: User,
        scope: AllScope | ExplicitOrgsScope | OwnScope | None = None,
    ) -> TeamMetricsResponse:
        # If scope not provided, infer from user roles (backward compatibility)
        if scope is None:
            scope = AllScope() if self._is_manager(user) else OwnScope()
        """
        Get team lead metrics.

        Args:
            tenant_id: The tenant ID to filter by
            user: The authenticated user (for authorization)
            scope: User's effective ROLE_SCOPE (only AllScope users should reach here)

        Returns:
            TeamMetricsResponse with aggregated metrics

        Raises:
            PermissionError: If user is not a manager or admin, or if
                tenant_id does not match the authenticated user's own tenant
        """
        # Only managers and admins can view team metrics
        if not self._is_manager(user):
            raise PermissionError("Only managers and admins can view team metrics")

        # Defense in depth: never trust a caller-supplied tenant_id that
        # diverges from the authenticated user's own tenant, even though the
        # current router always passes current_user.tenant_id.
        if user.tenant_id != tenant_id:
            raise PermissionError("tenant_id does not match the authenticated user's tenant")

        # Get all leads for the tenant (managers have AllScope, so no additional filtering needed)
        if isinstance(scope, AllScope):
            leads, _ = await self.lead_repo.list_by_tenant(tenant_id)
        else:
            # Non-manager shouldn't reach here due to _is_manager check, but defensively:
            leads, _ = await self.lead_repo.list_by_vendedor(
                tenant_id=tenant_id,
                vendedor_id=user.id,
            )

        cutoff_time = datetime.now(UTC) - timedelta(days=1)
        tenant_counts = _compute_lead_counts(leads, cutoff_time)

        # Get vendedores for breakdown
        vendedores = await self.user_repo.get_users_by_tenant_and_role(
            tenant_id=tenant_id,
            role="sales_agent",
        )

        # Calculate breakdown per vendedor
        vendedor_breakdown = []
        for vendedor in vendedores:
            vendedor_leads = [lead for lead in leads if lead.vendedor_id == vendedor.id]
            vendedor_counts = _compute_lead_counts(vendedor_leads, cutoff_time)

            vendedor_breakdown.append(
                VendedorMetricsBreakdown(
                    vendedor_id=vendedor.id,
                    vendedor_name=vendedor.full_name,
                    total_leads=vendedor_counts.total,
                    new_leads=vendedor_counts.new_last_24h,
                    conversion_rate=vendedor_counts.conversion_rate,
                )
            )

        # Sort by total leads descending
        vendedor_breakdown.sort(key=lambda x: x.total_leads, reverse=True)

        return TeamMetricsResponse(
            total_leads=tenant_counts.total,
            new_leads_last_24h=tenant_counts.new_last_24h,
            conversion_rate=tenant_counts.conversion_rate,
            vendedor_breakdown=vendedor_breakdown,
        )
