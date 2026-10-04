"""Characterization tests for GetTeamMetricsUseCase — backend decomposition
Stage 2.2. Zero test coverage existed for this file despite computing
manager-facing numbers (conversion rate, per-vendedor breakdown) that a human
may act on. Pins current behavior before the DRY extraction in this same pass,
plus a GGA-flagged defense-in-depth fix: execute() now rejects a caller-supplied
tenant_id that diverges from the authenticated user's own tenant_id.
"""

from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import pytest

from prosell.application.use_cases.lead.get_team_metrics import GetTeamMetricsUseCase
from prosell.domain.entities.lead import Lead, LeadStatus
from prosell.domain.entities.role import Role, RoleType
from prosell.domain.entities.user import User
from prosell.domain.repositories.lead_repository import AbstractLeadRepository
from prosell.domain.repositories.user_repository import AbstractUserRepository


def _make_user(
    role_type: RoleType | None, tenant_id: UUID | None, full_name: str = "Test User"
) -> User:
    roles = [Role.create_system_role(role_type)] if role_type is not None else None
    return User(
        id=uuid4(),
        email="user@example.com",
        full_name=full_name,
        roles=roles,
        tenant_id=tenant_id,
    )


def _make_lead(
    tenant_id,
    *,
    vendedor_id=None,
    status: LeadStatus = LeadStatus.NEW,
    created_at: datetime | None = None,
) -> Lead:
    return Lead(
        id=uuid4(),
        tenant_id=tenant_id,
        buyer_name="Buyer",
        vendedor_id=vendedor_id,
        status=status,
        created_at=created_at or datetime.now(UTC),
    )


def _fake_lead_repo(leads: list[Lead]) -> AbstractLeadRepository:
    repo = AsyncMock(spec=AbstractLeadRepository)
    repo.list_by_tenant.return_value = (leads, len(leads))
    return repo


def _fake_user_repo(vendedores: list[User]) -> AbstractUserRepository:
    repo = AsyncMock(spec=AbstractUserRepository)
    repo.get_users_by_tenant_and_role.return_value = vendedores
    return repo


class TestAuthorization:
    @pytest.mark.asyncio
    async def test_raises_permission_error_for_a_user_with_no_roles(self):
        tenant_id = uuid4()
        use_case = GetTeamMetricsUseCase(_fake_lead_repo([]), _fake_user_repo([]))
        user = _make_user(role_type=None, tenant_id=tenant_id)

        with pytest.raises(PermissionError):
            await use_case.execute(tenant_id=tenant_id, user=user)

    @pytest.mark.asyncio
    async def test_raises_permission_error_for_a_sales_agent(self):
        tenant_id = uuid4()
        use_case = GetTeamMetricsUseCase(_fake_lead_repo([]), _fake_user_repo([]))
        user = _make_user(role_type=RoleType.SALES_AGENT, tenant_id=tenant_id)

        with pytest.raises(PermissionError):
            await use_case.execute(tenant_id=tenant_id, user=user)

    @pytest.mark.asyncio
    async def test_manager_role_is_authorized(self):
        tenant_id = uuid4()
        use_case = GetTeamMetricsUseCase(_fake_lead_repo([]), _fake_user_repo([]))
        user = _make_user(role_type=RoleType.MANAGER, tenant_id=tenant_id)

        result = await use_case.execute(tenant_id=tenant_id, user=user)

        assert result.total_leads == 0

    @pytest.mark.asyncio
    async def test_raises_permission_error_when_tenant_id_does_not_match_user(self):
        """Regression guard for a GGA finding: the use case used to trust a
        caller-supplied tenant_id with no check against the authenticated
        user's own tenant at all. The current router always passes
        current_user.tenant_id, but nothing in the use case itself enforced
        that — a future caller could have passed any tenant_id."""
        use_case = GetTeamMetricsUseCase(_fake_lead_repo([]), _fake_user_repo([]))
        user = _make_user(role_type=RoleType.MANAGER, tenant_id=uuid4())

        with pytest.raises(PermissionError):
            await use_case.execute(tenant_id=uuid4(), user=user)

    @pytest.mark.asyncio
    async def test_raises_permission_error_when_user_has_no_tenant(self):
        use_case = GetTeamMetricsUseCase(_fake_lead_repo([]), _fake_user_repo([]))
        user = _make_user(role_type=RoleType.MANAGER, tenant_id=None)

        with pytest.raises(PermissionError):
            await use_case.execute(tenant_id=uuid4(), user=user)


class TestMetricsComputation:
    @pytest.mark.asyncio
    async def test_total_and_conversion_rate_across_all_leads(self):
        tenant_id = uuid4()
        leads = [
            _make_lead(tenant_id, status=LeadStatus.APPOINTMENT_SET),
            _make_lead(tenant_id, status=LeadStatus.NEW),
            _make_lead(tenant_id, status=LeadStatus.CONTACTED),
            _make_lead(tenant_id, status=LeadStatus.APPOINTMENT_SET),
        ]
        use_case = GetTeamMetricsUseCase(_fake_lead_repo(leads), _fake_user_repo([]))
        manager = _make_user(role_type=RoleType.ADMIN, tenant_id=tenant_id)

        result = await use_case.execute(tenant_id=tenant_id, user=manager)

        assert result.total_leads == 4
        assert result.conversion_rate == 0.5  # 2 of 4 reached APPOINTMENT_SET

    @pytest.mark.asyncio
    async def test_conversion_rate_is_zero_when_there_are_no_leads(self):
        """Guards the total_leads > 0 ternary — a naive refactor could
        introduce a ZeroDivisionError here."""
        tenant_id = uuid4()
        use_case = GetTeamMetricsUseCase(_fake_lead_repo([]), _fake_user_repo([]))
        manager = _make_user(role_type=RoleType.MANAGER, tenant_id=tenant_id)

        result = await use_case.execute(tenant_id=tenant_id, user=manager)

        assert result.conversion_rate == 0.0

    @pytest.mark.asyncio
    async def test_new_leads_last_24h_excludes_older_leads(self):
        tenant_id = uuid4()
        now = datetime.now(UTC)
        leads = [
            _make_lead(tenant_id, created_at=now - timedelta(hours=1)),
            _make_lead(tenant_id, created_at=now - timedelta(hours=23)),
            _make_lead(tenant_id, created_at=now - timedelta(days=2)),
        ]
        use_case = GetTeamMetricsUseCase(_fake_lead_repo(leads), _fake_user_repo([]))
        manager = _make_user(role_type=RoleType.MANAGER, tenant_id=tenant_id)

        result = await use_case.execute(tenant_id=tenant_id, user=manager)

        assert result.new_leads_last_24h == 2

    @pytest.mark.asyncio
    async def test_per_vendedor_breakdown_only_counts_that_vendedors_leads(self):
        tenant_id = uuid4()
        vendedor_a = uuid4()
        vendedor_b = uuid4()
        leads = [
            _make_lead(tenant_id, vendedor_id=vendedor_a, status=LeadStatus.APPOINTMENT_SET),
            _make_lead(tenant_id, vendedor_id=vendedor_a, status=LeadStatus.NEW),
            _make_lead(tenant_id, vendedor_id=vendedor_b, status=LeadStatus.NEW),
            _make_lead(tenant_id, vendedor_id=None),  # unassigned — counted in totals only
        ]
        vendedores = [
            User(id=vendedor_a, email="a@example.com", full_name="Agent A"),
            User(id=vendedor_b, email="b@example.com", full_name="Agent B"),
        ]
        use_case = GetTeamMetricsUseCase(_fake_lead_repo(leads), _fake_user_repo(vendedores))
        manager = _make_user(role_type=RoleType.MANAGER, tenant_id=tenant_id)

        result = await use_case.execute(tenant_id=tenant_id, user=manager)

        assert result.total_leads == 4
        by_id = {b.vendedor_id: b for b in result.vendedor_breakdown}
        assert by_id[vendedor_a].total_leads == 2
        assert by_id[vendedor_a].conversion_rate == 0.5
        assert by_id[vendedor_b].total_leads == 1
        assert by_id[vendedor_b].conversion_rate == 0.0

    @pytest.mark.asyncio
    async def test_vendedor_breakdown_sorted_by_total_leads_descending(self):
        tenant_id = uuid4()
        vendedor_low = uuid4()
        vendedor_high = uuid4()
        leads = [
            _make_lead(tenant_id, vendedor_id=vendedor_low),
            _make_lead(tenant_id, vendedor_id=vendedor_high),
            _make_lead(tenant_id, vendedor_id=vendedor_high),
        ]
        vendedores = [
            User(id=vendedor_low, email="low@example.com", full_name="Low"),
            User(id=vendedor_high, email="high@example.com", full_name="High"),
        ]
        use_case = GetTeamMetricsUseCase(_fake_lead_repo(leads), _fake_user_repo(vendedores))
        manager = _make_user(role_type=RoleType.MANAGER, tenant_id=tenant_id)

        result = await use_case.execute(tenant_id=tenant_id, user=manager)

        assert [b.vendedor_id for b in result.vendedor_breakdown] == [
            vendedor_high,
            vendedor_low,
        ]

    @pytest.mark.asyncio
    async def test_vendedor_with_zero_leads_has_zero_conversion_rate(self):
        """Guards the per-vendedor total > 0 ternary."""
        tenant_id = uuid4()
        vendedor = uuid4()
        vendedores = [User(id=vendedor, email="v@example.com", full_name="V")]
        use_case = GetTeamMetricsUseCase(_fake_lead_repo([]), _fake_user_repo(vendedores))
        manager = _make_user(role_type=RoleType.MANAGER, tenant_id=tenant_id)

        result = await use_case.execute(tenant_id=tenant_id, user=manager)

        assert result.vendedor_breakdown[0].total_leads == 0
        assert result.vendedor_breakdown[0].conversion_rate == 0.0
