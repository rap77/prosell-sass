"""Integration tests for AssignLeadToVendedorUseCase."""

from uuid import uuid4

import pytest

from prosell.application.dto.lead.request import AssignLeadRequest, CreateLeadRequest
from prosell.application.use_cases.lead.assign_lead import AssignLeadToVendedorUseCase
from prosell.application.use_cases.lead.create_lead import CreateLeadUseCase
from prosell.domain.entities.role import RoleType
from prosell.domain.entities.user import User, UserStatus
from prosell.domain.exceptions.lead_exceptions import LeadNotFoundException
from prosell.infrastructure.repositories.lead_repository_impl import SqlAlchemyLeadRepository

# =============================================================================
# HELPERS
# =============================================================================


def make_user(role_type: RoleType, tenant_id) -> User:
    """Build a User domain entity for testing."""
    from prosell.domain.entities.role import Role

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
# AssignLeadToVendedorUseCase integration tests
# =============================================================================


class TestAssignLeadToVendedorUseCaseIntegration:
    """Integration tests for AssignLeadToVendedorUseCase."""

    @pytest.mark.asyncio
    async def test_assign_lead_to_vendedor_success(self, db_session, test_organization, test_user, test_seller_user):
        """Should assign lead to a new vendedor successfully."""
        repo = SqlAlchemyLeadRepository(db_session)
        create_uc = CreateLeadUseCase(repo)
        assign_uc = AssignLeadToVendedorUseCase(repo)
        tenant_id = test_organization.tenant_id

        # Create lead assigned to test_user
        lead_resp = await create_uc.execute(
            CreateLeadRequest(
                buyer_name="Test Buyer",
                buyer_email=f"buyer-{uuid4().hex[:6]}@test.com",
                vendedor_id=test_user.id,
            ),
            tenant_id,
        )

        # Assign to test_seller_user
        result = await assign_uc.execute(
            lead_id=lead_resp.id,
            request=AssignLeadRequest(vendedor_id=test_seller_user.id),
            tenant_id=tenant_id,
        )

        assert result.vendedor_id == test_seller_user.id
        assert result.id == lead_resp.id

        # Verify persistence
        found = await repo.get_by_id(lead_resp.id, tenant_id)
        assert found is not None
        assert found.vendedor_id == test_seller_user.id

    @pytest.mark.asyncio
    async def test_assign_lead_to_none_unassigns(self, db_session, test_organization, test_user):
        """Should unassign lead when vendedor_id is None."""
        repo = SqlAlchemyLeadRepository(db_session)
        create_uc = CreateLeadUseCase(repo)
        assign_uc = AssignLeadToVendedorUseCase(repo)
        tenant_id = test_organization.tenant_id

        lead_resp = await create_uc.execute(
            CreateLeadRequest(
                buyer_name="Test Buyer",
                buyer_email=f"buyer-{uuid4().hex[:6]}@test.com",
                vendedor_id=test_user.id,
            ),
            tenant_id,
        )

        # Unassign
        result = await assign_uc.execute(
            lead_id=lead_resp.id,
            request=AssignLeadRequest(vendedor_id=None),
            tenant_id=tenant_id,
        )

        assert result.vendedor_id is None

    @pytest.mark.asyncio
    async def test_assign_nonexistent_lead_raises(self, db_session, test_organization, test_user):
        """Should raise LeadNotFoundException if lead doesn't exist."""
        repo = SqlAlchemyLeadRepository(db_session)
        assign_uc = AssignLeadToVendedorUseCase(repo)
        tenant_id = test_organization.tenant_id

        with pytest.raises(LeadNotFoundException):
            await assign_uc.execute(
                lead_id=uuid4(),
                request=AssignLeadRequest(vendedor_id=test_user.id),
                tenant_id=tenant_id,
            )

    @pytest.mark.asyncio
    async def test_assign_lead_different_tenant_raises(self, db_session, test_organization, test_user):
        """Should raise LeadNotFoundException if lead belongs to different tenant."""
        repo = SqlAlchemyLeadRepository(db_session)
        create_uc = CreateLeadUseCase(repo)
        assign_uc = AssignLeadToVendedorUseCase(repo)
        tenant_id = test_organization.tenant_id
        other_tenant_id = uuid4()

        lead_resp = await create_uc.execute(
            CreateLeadRequest(
                buyer_name="Test Buyer",
                buyer_email=f"buyer-{uuid4().hex[:6]}@test.com",
                vendedor_id=test_user.id,
            ),
            tenant_id,
        )

        # Try to assign with different tenant_id
        with pytest.raises(LeadNotFoundException):
            await assign_uc.execute(
                lead_id=lead_resp.id,
                request=AssignLeadRequest(vendedor_id=test_user.id),
                tenant_id=other_tenant_id,
            )
