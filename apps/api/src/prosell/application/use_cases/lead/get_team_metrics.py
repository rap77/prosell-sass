"""Get team metrics use case."""

from datetime import UTC, datetime, timedelta
from typing import ClassVar
from uuid import UUID

from prosell.application.dto.lead.response import TeamMetricsResponse, VendedorMetricsBreakdown
from prosell.domain.entities.lead import LeadStatus
from prosell.domain.entities.role import RoleType
from prosell.domain.entities.user import User
from prosell.domain.repositories.lead_repository import AbstractLeadRepository
from prosell.domain.repositories.user_repository import AbstractUserRepository


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
    ):
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
    ) -> TeamMetricsResponse:
        """
        Get team lead metrics.

        Args:
            tenant_id: The tenant ID to filter by
            user: The authenticated user (for authorization)

        Returns:
            TeamMetricsResponse with aggregated metrics

        Raises:
            PermissionError: If user is not a manager or admin
        """
        # Only managers and admins can view team metrics
        if not self._is_manager(user):
            raise PermissionError("Only managers and admins can view team metrics")

        # Get all leads for the tenant
        leads, _ = await self.lead_repo.list_by_tenant(tenant_id)

        # Calculate metrics
        total_leads = len(leads)

        # New leads in last 24 hours
        cutoff_time = datetime.now(UTC) - timedelta(days=1)
        new_leads_last_24h = len([lead for lead in leads if lead.created_at >= cutoff_time])

        # Conversion rate: leads that reached appointment_set status
        converted_leads = len([lead for lead in leads if lead.status == LeadStatus.APPOINTMENT_SET])
        conversion_rate = converted_leads / total_leads if total_leads > 0 else 0.0

        # Get vendedores for breakdown
        vendedores = await self.user_repo.get_users_by_tenant_and_role(
            tenant_id=tenant_id,
            role="sales_agent",
        )

        # Calculate breakdown per vendedor
        vendedor_breakdown = []
        for vendedor in vendedores:
            vendedor_leads = [lead for lead in leads if lead.vendedor_id == vendedor.id]
            vendedor_total = len(vendedor_leads)
            vendedor_new = len([lead for lead in vendedor_leads if lead.created_at >= cutoff_time])
            vendedor_converted = len(
                [lead for lead in vendedor_leads if lead.status == LeadStatus.APPOINTMENT_SET]
            )
            vendedor_conversion = vendedor_converted / vendedor_total if vendedor_total > 0 else 0.0

            vendedor_breakdown.append(
                VendedorMetricsBreakdown(
                    vendedor_id=vendedor.id,
                    vendedor_name=vendedor.full_name,
                    total_leads=vendedor_total,
                    new_leads=vendedor_new,
                    conversion_rate=vendedor_conversion,
                )
            )

        # Sort by total leads descending
        vendedor_breakdown.sort(key=lambda x: x.total_leads, reverse=True)

        return TeamMetricsResponse(
            total_leads=total_leads,
            new_leads_last_24h=new_leads_last_24h,
            conversion_rate=conversion_rate,
            vendedor_breakdown=vendedor_breakdown,
        )
