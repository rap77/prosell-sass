"""Unit tests for lead state transitions and use case business logic.

These tests use mock repositories — no database required.
"""

from datetime import UTC, datetime
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from prosell.application.dto.lead.request import (
    CreateLeadRequest,
    ListLeadsRequest,
    UpdateLeadStatusRequest,
)
from prosell.application.use_cases.lead.create_lead import CreateLeadUseCase
from prosell.application.use_cases.lead.get_lead_details import GetLeadDetailsUseCase
from prosell.application.use_cases.lead.list_leads import ListLeadsUseCase
from prosell.application.use_cases.lead.update_lead_status import UpdateLeadStatusUseCase
from prosell.domain.entities.lead import Lead, LeadStatus
from prosell.domain.entities.lead_audit_log import LeadAuditLog
from prosell.domain.entities.role import Role, RoleType
from prosell.domain.entities.user import User, UserStatus
from prosell.domain.exceptions.lead_exceptions import (
    DuplicateLeadException,
    LeadNotFoundException,
    LeadStateTransitionException,
)

# =============================================================================
# HELPERS
# =============================================================================


def make_lead(
    status: LeadStatus = LeadStatus.NEW,
    tenant_id=None,
    vendedor_id=None,
) -> Lead:
    """Create a test Lead entity."""
    tid = tenant_id or uuid4()
    return Lead(
        id=uuid4(),
        tenant_id=tid,
        buyer_name="Juan Pérez",
        buyer_email="juan@example.com",
        buyer_phone="+59899000000",
        product_id=uuid4(),
        vendedor_id=vendedor_id or uuid4(),
        message="Interested",
        source="manual",
        status=status,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )


def make_user(
    role_type: RoleType = RoleType.SALES_AGENT,
    tenant_id=None,
) -> User:
    """Create a test User entity."""
    tid = tenant_id or uuid4()
    role = Role(
        id=uuid4(),
        role_type=role_type,
        name=role_type.value,
        is_system_role=True,
    )
    return User(
        id=uuid4(),
        email="user@example.com",
        full_name="Test User",
        tenant_id=tid,
        status=UserStatus.ACTIVE,
        email_verified=True,
        roles=[role],
    )


def make_lead_with_product(lead: Lead):
    """Create a LeadWithProduct named tuple for testing."""
    from prosell.infrastructure.repositories.lead_repository_impl import LeadWithProduct
    return LeadWithProduct(lead=lead, product_model=None)


# =============================================================================
# CreateLeadUseCase unit tests
# =============================================================================


class TestCreateLeadUseCase:
    """Unit tests for CreateLeadUseCase."""

    @pytest.fixture
    def repo(self):
        """Mock lead repository."""
        r = AsyncMock()
        # Legacy method (kept for backward compat)
        r.get_by_buyer_and_product = AsyncMock(return_value=None)
        # LeadDuplicateDetector methods — return no duplicates by default
        r.find_by_email = AsyncMock(return_value=[])
        r.find_by_phone = AsyncMock(return_value=[])
        r.find_potential_duplicates = AsyncMock(return_value=[])
        r.create = AsyncMock(side_effect=lambda lead: lead)
        return r

    @pytest.mark.asyncio
    async def test_create_lead_success(self, repo):
        """Should create lead when no duplicate exists."""
        tenant_id = uuid4()
        lead = make_lead(tenant_id=tenant_id)
        request = CreateLeadRequest(
            buyer_name=lead.buyer_name,
            buyer_email=lead.buyer_email,
            buyer_phone=lead.buyer_phone,
            product_id=lead.product_id,
            vendedor_id=lead.vendedor_id,
            message=lead.message,
        )

        use_case = CreateLeadUseCase(repo)
        result = await use_case.execute(request, tenant_id)

        assert result.buyer_name == "Juan Pérez"
        assert result.status == LeadStatus.NEW

    @pytest.mark.asyncio
    async def test_create_lead_duplicate_raises(self, repo):
        """Should raise DuplicateLeadException when same buyer+product exists."""
        existing_lead = make_lead()

        # LeadDuplicateDetector will call find_by_email and find_by_phone.
        # Return the existing lead on the email lookup so duplicates are detected.
        repo.find_by_email = AsyncMock(return_value=[existing_lead])
        repo.find_by_phone = AsyncMock(return_value=[])
        repo.find_potential_duplicates = AsyncMock(return_value=[])
        # get_by_id is called to resolve the dup lead and check product_id
        repo.get_by_id = AsyncMock(return_value=existing_lead)

        use_case = CreateLeadUseCase(repo)
        request = CreateLeadRequest(
            buyer_name="Juan Pérez",
            buyer_email="juan@example.com",
            buyer_phone="+59899000000",
            product_id=existing_lead.product_id,  # same product → hard duplicate
            vendedor_id=existing_lead.vendedor_id,
            message="Interested",
        )

        with pytest.raises(DuplicateLeadException):
            await use_case.execute(request, existing_lead.tenant_id)


# =============================================================================
# UpdateLeadStatusUseCase unit tests
# =============================================================================


class TestUpdateLeadStatusUseCase:
    """Unit tests for UpdateLeadStatusUseCase."""

    @pytest.mark.asyncio
    async def test_valid_status_transition_succeeds(self):
        """Should allow valid status transitions."""
        from prosell.infrastructure.repositories.lead_repository_impl import LeadWithProduct
        lead = make_lead(status=LeadStatus.NEW)
        repo = AsyncMock()
        repo.get_by_id = AsyncMock(return_value=LeadWithProduct(lead=lead, product_model=None))
        repo.update_status = AsyncMock(return_value=Lead(
            id=lead.id,
            tenant_id=lead.tenant_id,
            buyer_name=lead.buyer_name,
            buyer_email=lead.buyer_email,
            buyer_phone=lead.buyer_phone,
            product_id=lead.product_id,
            vendedor_id=lead.vendedor_id,
            message=lead.message,
            source=lead.source,
            status=LeadStatus.CONTACTED,
            created_at=lead.created_at,
            updated_at=lead.updated_at,
        ))

        use_case = UpdateLeadStatusUseCase(repo)
        request = UpdateLeadStatusRequest(new_status=LeadStatus.CONTACTED)
        result = await use_case.execute(lead.id, request, lead.tenant_id)

        assert result.status == LeadStatus.CONTACTED

    @pytest.mark.asyncio
    async def test_invalid_status_transition_raises(self):
        """Should raise exception for invalid transitions."""
        from prosell.infrastructure.repositories.lead_repository_impl import LeadWithProduct
        lead = make_lead(status=LeadStatus.LOST)
        repo = AsyncMock()
        repo.get_by_id = AsyncMock(return_value=LeadWithProduct(lead=lead, product_model=None))

        use_case = UpdateLeadStatusUseCase(repo)
        request = UpdateLeadStatusRequest(new_status=LeadStatus.NEW)

        with pytest.raises(LeadStateTransitionException):
            await use_case.execute(lead.id, request, lead.tenant_id)

    @pytest.mark.asyncio
    async def test_update_nonexistent_lead_raises(self):
        """Should raise exception when lead not found."""
        repo = AsyncMock()
        repo.get_by_id = AsyncMock(return_value=None)

        use_case = UpdateLeadStatusUseCase(repo)
        request = UpdateLeadStatusRequest(new_status=LeadStatus.CONTACTED)

        with pytest.raises(LeadNotFoundException):
            await use_case.execute(uuid4(), request, uuid4())


# =============================================================================
# ListLeadsUseCase unit tests
# =============================================================================


class TestListLeadsUseCase:
    """Unit tests for ListLeadsUseCase role-based filtering."""

    @pytest.mark.asyncio
    async def test_sales_agent_sees_own_leads(self):
        """SALES_AGENT should only see leads assigned to themselves."""
        tenant_id = uuid4()
        user = make_user(RoleType.SALES_AGENT, tenant_id)
        leads = [make_lead(tenant_id=tenant_id, vendedor_id=user.id)]
        leads_with_vehicles = [make_lead_with_product(lead) for lead in leads]

        repo = AsyncMock()
        repo.list_by_vendedor = AsyncMock(return_value=(leads_with_vehicles, 1))
        repo.list_by_manager = AsyncMock(return_value=([], 0))

        use_case = ListLeadsUseCase(repo)
        request = ListLeadsRequest(limit=10, offset=0)
        result = await use_case.execute(user, request)

        repo.list_by_vendedor.assert_called_once_with(
            tenant_id=tenant_id,
            vendedor_id=user.id,
            limit=10,
            offset=0,
            status=None,
            include_products=True,
        )
        repo.list_by_manager.assert_not_called()
        assert result.total == 1

    @pytest.mark.asyncio
    async def test_manager_sees_all_leads(self):
        """MANAGER should see all tenant leads."""
        tenant_id = uuid4()
        user = make_user(RoleType.MANAGER, tenant_id)
        leads = [make_lead(tenant_id=tenant_id), make_lead(tenant_id=tenant_id)]
        leads_with_vehicles = [make_lead_with_product(lead) for lead in leads]

        repo = AsyncMock()
        repo.list_by_manager = AsyncMock(return_value=(leads_with_vehicles, 2))
        repo.list_by_vendedor = AsyncMock(return_value=([], 0))

        use_case = ListLeadsUseCase(repo)
        result = await use_case.execute(user, ListLeadsRequest())

        repo.list_by_manager.assert_called_once_with(
            tenant_id=tenant_id,
            limit=50,
            offset=0,
            status=None,
            vendedor_id=None,
            include_products=True,
        )
        repo.list_by_vendedor.assert_not_called()
        assert result.total == 2

    @pytest.mark.asyncio
    async def test_super_admin_sees_all_leads(self):
        """SUPER_ADMIN should see all tenant leads."""
        tenant_id = uuid4()
        user = make_user(RoleType.SUPER_ADMIN, tenant_id)

        repo = AsyncMock()
        repo.list_by_manager = AsyncMock(return_value=([], 0))
        repo.list_by_vendedor = AsyncMock(return_value=([], 0))

        use_case = ListLeadsUseCase(repo)
        await use_case.execute(user, ListLeadsRequest())

        repo.list_by_manager.assert_called_once()

    @pytest.mark.asyncio
    async def test_user_without_roles_treated_as_vendedor(self):
        """User with no roles defaults to vendedor filtering."""
        user = User(
            id=uuid4(),
            email="user@example.com",
            full_name="No Roles",
            tenant_id=uuid4(),
            status=UserStatus.ACTIVE,
            email_verified=True,
            roles=[],
        )

        repo = AsyncMock()
        repo.list_by_vendedor = AsyncMock(return_value=([], 0))
        repo.list_by_manager = AsyncMock(return_value=([], 0))

        use_case = ListLeadsUseCase(repo)
        await use_case.execute(user, ListLeadsRequest())

        repo.list_by_vendedor.assert_called_once()


# =============================================================================
# GetLeadDetailsUseCase unit tests
# =============================================================================


class TestGetLeadDetailsUseCase:
    """Unit tests for GetLeadDetailsUseCase."""

    @pytest.mark.asyncio
    async def test_get_lead_details_success(self):
        """Should return lead with audit logs."""
        lead = make_lead()
        audit_logs = [
            LeadAuditLog(
                id=uuid4(),
                lead_id=lead.id,
                tenant_id=lead.tenant_id,
                old_status="new",
                new_status="contacted",
                changed_by_user_id=uuid4(),
                timestamp=datetime.now(UTC),
            )
        ]

        from prosell.infrastructure.repositories.lead_repository_impl import LeadWithProduct
        
        repo = AsyncMock()
        repo.get_by_id = AsyncMock(return_value=LeadWithProduct(lead=lead, product_model=None))
        repo.get_audit_logs = AsyncMock(return_value=audit_logs)

        use_case = GetLeadDetailsUseCase(repo)
        result = await use_case.execute(lead.id, lead.tenant_id)

        assert result.lead.buyer_name == "Juan Pérez"
        assert len(result.audit_logs) == 1

    @pytest.mark.asyncio
    async def test_get_lead_details_empty_audit_logs(self):
        """Should return lead with empty audit log list."""
        lead = make_lead()

        from prosell.infrastructure.repositories.lead_repository_impl import LeadWithProduct
        
        repo = AsyncMock()
        repo.get_by_id = AsyncMock(return_value=LeadWithProduct(lead=lead, product_model=None))
        repo.get_audit_logs = AsyncMock(return_value=[])

        use_case = GetLeadDetailsUseCase(repo)
        result = await use_case.execute(lead.id, lead.tenant_id)

        assert result.lead.buyer_name == "Juan Pérez"
        assert len(result.audit_logs) == 0

    @pytest.mark.asyncio
    async def test_get_lead_details_not_found(self):
        """Should raise exception when lead not found."""
        repo = AsyncMock()
        repo.get_by_id = AsyncMock(return_value=None)

        use_case = GetLeadDetailsUseCase(repo)

        with pytest.raises(LeadNotFoundException):
            await use_case.execute(uuid4(), uuid4())
