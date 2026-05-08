"""Integration tests for lead use cases using real test database.

These tests use a real DB session and real repositories — no mocks for storage.
"""

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
from prosell.domain.entities.lead import LeadStatus
from prosell.domain.entities.role import Role, RoleType
from prosell.domain.entities.user import User, UserStatus
from prosell.domain.exceptions.lead_exceptions import (
    DuplicateLeadException,
)
from prosell.infrastructure.repositories.lead_repository_impl import SqlAlchemyLeadRepository

# =============================================================================
# HELPERS
# =============================================================================


def make_user(role_type: RoleType, tenant_id) -> User:
    """Build a User domain entity for testing."""
    role = Role(
        id=uuid4(),
        role_type=role_type,
        name=role_type.value,
        is_system_role=True,
    )
    return User(
        id=uuid4(),
        email=f"user-{uuid4().hex[:6]}@test.com",
        full_name="Test User",
        tenant_id=tenant_id,
        status=UserStatus.ACTIVE,
        email_verified=True,
        roles=[role],
    )


# =============================================================================
# CreateLeadUseCase integration tests
# =============================================================================


class TestCreateLeadUseCaseIntegration:
    """Integration tests for CreateLeadUseCase."""

    @pytest.mark.asyncio
    async def test_create_lead_persists_to_db(self, db_session, test_organization):
        """Should create lead in database and return correct response."""
        repo = SqlAlchemyLeadRepository(db_session)
        use_case = CreateLeadUseCase(repo)
        tenant_id = test_organization.tenant_id

        request = CreateLeadRequest(
            buyer_name="Integration Buyer",
            buyer_email=f"int-{uuid4().hex[:6]}@test.com",
        )
        result = await use_case.execute(request, tenant_id)

        assert result.id is not None
        assert result.tenant_id == tenant_id
        assert result.buyer_name == "Integration Buyer"
        assert result.status == LeadStatus.NEW

        # Verify persisted
        found = await repo.get_by_id(result.id, tenant_id)
        assert found is not None

    @pytest.mark.asyncio
    async def test_create_lead_duplicate_within_24h_raises(self, db_session, test_organization):
        """Should raise DuplicateLeadException for same buyer + vehicle within 24h."""
        repo = SqlAlchemyLeadRepository(db_session)
        use_case = CreateLeadUseCase(repo)
        tenant_id = test_organization.tenant_id
        email = f"dup-{uuid4().hex[:6]}@test.com"
        product_id = uuid4()

        request = CreateLeadRequest(
            buyer_name="Dup Buyer",
            buyer_email=email,
            product_id=product_id,
        )

        # First lead should succeed
        await use_case.execute(request, tenant_id)

        # Second lead in same 24h window should raise
        with pytest.raises(DuplicateLeadException):
            await use_case.execute(request, tenant_id)

    @pytest.mark.asyncio
    async def test_create_lead_different_tenants_allowed(self, db_session, test_organization):
        """Same buyer email in different tenants should not be a duplicate."""
        from prosell.infrastructure.models.organization_model import OrganizationModel

        tenant1 = test_organization.tenant_id
        tenant2 = uuid4()
        # Create second org so FK is satisfied
        org2 = OrganizationModel(
            id=tenant2,
            name=f"Org2-{uuid4().hex[:6]}",
            tenant_id=tenant2,
            status="active",
            description="Second test org",
            settings={},
        )
        db_session.add(org2)
        await db_session.flush()

        repo = SqlAlchemyLeadRepository(db_session)
        use_case = CreateLeadUseCase(repo)
        email = f"multi-{uuid4().hex[:6]}@test.com"
        product_id = uuid4()

        req = CreateLeadRequest(
            buyer_name="Multi Tenant Buyer",
            buyer_email=email,
            product_id=product_id,
        )

        result1 = await use_case.execute(req, tenant1)
        result2 = await use_case.execute(req, tenant2)

        assert result1.id != result2.id


# =============================================================================
# UpdateLeadStatusUseCase integration tests
# =============================================================================


class TestUpdateLeadStatusUseCaseIntegration:
    """Integration tests for UpdateLeadStatusUseCase."""

    @pytest.mark.asyncio
    async def test_update_status_full_lifecycle(self, db_session, test_organization):
        """Should advance lead through full lifecycle: new→contacted→qualified→appointment_set→lost."""
        repo = SqlAlchemyLeadRepository(db_session)
        use_case = CreateLeadUseCase(repo)
        update_uc = UpdateLeadStatusUseCase(repo)
        tenant_id = test_organization.tenant_id

        lead_resp = await use_case.execute(
            CreateLeadRequest(buyer_name="Lifecycle Test"),
            tenant_id,
        )
        lead_id = lead_resp.id

        # new → contacted
        result = await update_uc.execute(
            lead_id,
            UpdateLeadStatusRequest(new_status=LeadStatus.CONTACTED, reason="Called buyer"),
            tenant_id,
        )
        assert result.status == LeadStatus.CONTACTED

        # contacted → qualified
        result = await update_uc.execute(
            lead_id,
            UpdateLeadStatusRequest(new_status=LeadStatus.QUALIFIED),
            tenant_id,
        )
        assert result.status == LeadStatus.QUALIFIED

        # qualified → appointment_set
        result = await update_uc.execute(
            lead_id,
            UpdateLeadStatusRequest(new_status=LeadStatus.APPOINTMENT_SET),
            tenant_id,
        )
        assert result.status == LeadStatus.APPOINTMENT_SET

        # appointment_set → lost
        result = await update_uc.execute(
            lead_id,
            UpdateLeadStatusRequest(new_status=LeadStatus.LOST, reason="Buyer changed mind"),
            tenant_id,
        )
        assert result.status == LeadStatus.LOST

    @pytest.mark.asyncio
    async def test_update_creates_audit_log_entries(self, db_session, test_organization, test_user):
        """Each status update should create an audit log entry."""
        repo = SqlAlchemyLeadRepository(db_session)
        create_uc = CreateLeadUseCase(repo)
        update_uc = UpdateLeadStatusUseCase(repo)
        detail_uc = GetLeadDetailsUseCase(repo)
        tenant_id = test_organization.tenant_id
        user_id = test_user.id  # Use real user ID to satisfy FK

        lead_resp = await create_uc.execute(
            CreateLeadRequest(buyer_name="Audit Test"),
            tenant_id,
        )

        await update_uc.execute(
            lead_resp.id,
            UpdateLeadStatusRequest(new_status=LeadStatus.CONTACTED),
            tenant_id,
            changed_by_user_id=user_id,
        )

        details = await detail_uc.execute(lead_resp.id, tenant_id)
        assert len(details.audit_logs) >= 1
        assert details.audit_logs[0].changed_by_user_id == user_id


# =============================================================================
# ListLeadsUseCase integration tests
# =============================================================================


class TestListLeadsUseCaseIntegration:
    """Integration tests for ListLeadsUseCase role-based filtering."""

    @pytest.mark.asyncio
    async def test_vendedor_sees_only_own_leads(self, db_session, test_organization, test_user, test_seller_user):
        """SALES_AGENT should see only their own leads."""
        repo = SqlAlchemyLeadRepository(db_session)
        create_uc = CreateLeadUseCase(repo)
        list_uc = ListLeadsUseCase(repo)
        tenant_id = test_organization.tenant_id

        # Use real user IDs from DB fixtures
        vendedor = make_user(RoleType.SALES_AGENT, tenant_id)
        # Override the UUID to match real DB user
        vendedor = vendedor.model_copy(update={"id": test_user.id})
        other_vendedor = make_user(RoleType.SALES_AGENT, tenant_id)
        other_vendedor = other_vendedor.model_copy(update={"id": test_seller_user.id})

        # Lead assigned to vendedor
        await create_uc.execute(
            CreateLeadRequest(
                buyer_name="Vendedor Lead",
                buyer_email=f"v1-{uuid4().hex[:6]}@test.com",
                vendedor_id=test_user.id,
            ),
            tenant_id,
        )

        # Lead assigned to other vendedor
        await create_uc.execute(
            CreateLeadRequest(
                buyer_name="Other Lead",
                buyer_email=f"v2-{uuid4().hex[:6]}@test.com",
                vendedor_id=test_seller_user.id,
            ),
            tenant_id,
        )

        result = await list_uc.execute(vendedor, ListLeadsRequest())
        # vendedor sees only leads where vendedor_id == vendedor.id
        assert all(
            item.vendedor_id == test_user.id
            for item in result.items
            if item.vendedor_id is not None
        )

    @pytest.mark.asyncio
    async def test_manager_sees_all_tenant_leads(self, db_session, test_organization, test_user, test_seller_user):
        """MANAGER should see all leads in the tenant."""
        repo = SqlAlchemyLeadRepository(db_session)
        create_uc = CreateLeadUseCase(repo)
        list_uc = ListLeadsUseCase(repo)
        tenant_id = test_organization.tenant_id

        manager = make_user(RoleType.MANAGER, tenant_id)

        # Create 3 leads using real user IDs for FK constraint
        for uid in [test_user.id, test_seller_user.id, None]:
            await create_uc.execute(
                CreateLeadRequest(
                    buyer_name="Lead",
                    buyer_email=f"l-{uuid4().hex[:6]}@test.com",
                    vendedor_id=uid,
                ),
                tenant_id,
            )

        result = await list_uc.execute(manager, ListLeadsRequest())
        assert result.total >= 3
