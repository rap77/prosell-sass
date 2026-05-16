"""Integration tests for automatic lead assignment using LeadAssignmentRulesEngine.

These tests verify that when a lead is created without a vendedor_id,
the LeadAssignmentRulesEngine automatically assigns it to an available dealer.
"""

from uuid import UUID, uuid4

import pytest

from prosell.application.dto.lead.request import CreateLeadRequest
from prosell.application.use_cases.lead.create_lead import CreateLeadUseCase
from prosell.domain.entities.role import Role, RoleType
from prosell.domain.entities.user import User, UserStatus
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.models.role_model import UserRoleModel
from prosell.infrastructure.models.team_model import TeamMemberModel, TeamModel
from prosell.infrastructure.models.user_model import UserModel
from prosell.infrastructure.repositories.lead_repository_impl import SqlAlchemyLeadRepository
from prosell.infrastructure.repositories.product_repository_impl import SqlAlchemyProductRepository
from prosell.infrastructure.repositories.team_repository_impl import (
    SqlAlchemyTeamMemberRepository,
    SqlAlchemyTeamRepository,
)
from prosell.infrastructure.repositories.user_repository_impl import SqlAlchemyUserRepository

# =============================================================================
# HELPERS
# =============================================================================


def make_user_domain(role_type: RoleType, tenant_id, user_id: UUID | None = None) -> User:
    """Build a User domain entity for testing."""
    role = Role(
        id=uuid4(),
        role_type=role_type,
        name=role_type.value,
        is_system_role=True,
    )
    return User(
        id=user_id or uuid4(),
        email=f"user-{uuid4().hex[:6]}@test.com",
        full_name="Test User",
        tenant_id=tenant_id,
        status=UserStatus.ACTIVE,
        email_verified=True,
        roles=[role],
    )


async def create_dealer_users(
    db_session,
    organization: OrganizationModel,
    count: int = 3,
) -> list[UserModel]:
    """Create dealer users for testing assignment."""
    from prosell.infrastructure.models.role_model import RoleModel

    # Get or create SALES_AGENT role
    stmt = select(RoleModel).where(RoleModel.role_type == "SALES_AGENT")
    result = await db_session.execute(stmt)
    role = result.scalar_one_or_none()

    if not role:
        role = RoleModel(
            id=uuid4(),
            role_type="SALES_AGENT",
            name="Sales Agent",
            is_system_role=True,
            tenant_id=None,
        )
        db_session.add(role)
        await db_session.flush()

    dealers = []
    for i in range(count):
        user = UserModel(
            id=uuid4(),
            email=f"dealer-{i}-{uuid4().hex[:6]}@test.prosell.io",
            full_name=f"Dealer {i}",
            tenant_id=organization.tenant_id,
            status="active",
            email_verified=True,
            is_2fa_enabled=False,
            failed_login_attempts=0,
        )
        db_session.add(user)
        await db_session.flush()

        # Assign SALES_AGENT role
        user_role = UserRoleModel(
            id=uuid4(),
            user_id=user.id,
            role_id=role.id,
        )
        db_session.add(user_role)
        await db_session.flush()

        dealers.append(user)

    return dealers


async def create_sales_team(
    db_session,
    organization: OrganizationModel,
    dealers: list[UserModel],
) -> TeamModel:
    """Create a sales team with dealers as members."""
    team = TeamModel(
        id=uuid4(),
        name=f"Sales Team {uuid4().hex[:8]}",
        tenant_id=organization.tenant_id,
        org_id=organization.id,
        description="Sales team for lead assignment testing",
        parent_team_id=None,
    )
    db_session.add(team)
    await db_session.flush()

    # Add dealers as team members
    for dealer in dealers:
        member = TeamMemberModel(
            id=uuid4(),
            team_id=team.id,
            user_id=dealer.id,
            role="vendor",  # TeamMemberRole.VENDOR
            tenant_id=organization.tenant_id,
            commission_rate=None,
            joined_at=None,  # Will be set by DB default
        )
        db_session.add(member)
        await db_session.flush()

    return team


# =============================================================================
# TESTS
# =============================================================================


class TestLeadAutoAssignmentIntegration:
    """Integration tests for automatic lead assignment."""

    @pytest.mark.asyncio
    async def test_auto_assign_lead_to_dealer_when_vendedor_id_none(
        self,
        db_session,
        test_organization,
    ):
        """
        RED TEST: When creating a lead without vendedor_id,
        the LeadAssignmentRulesEngine should automatically assign it to a dealer.

        This test will FAIL because B4.3.06 is not yet implemented.
        After implementation, it should pass.
        """

        tenant_id = test_organization.tenant_id

        # Setup: Create dealer users and a team
        dealers = await create_dealer_users(db_session, test_organization, count=3)
        await create_sales_team(db_session, test_organization, dealers)

        # Create use case with all required dependencies
        lead_repo = SqlAlchemyLeadRepository(db_session)
        user_repo = SqlAlchemyUserRepository(db_session)
        product_repo = SqlAlchemyProductRepository(db_session)
        team_repo = SqlAlchemyTeamRepository(db_session)
        team_member_repo = SqlAlchemyTeamMemberRepository(db_session)

        # This will fail because CreateLeadUseCase doesn't accept these dependencies yet
        use_case = CreateLeadUseCase(
            lead_repository=lead_repo,
            user_repository=user_repo,
            product_repository=product_repo,
            team_repository=team_repo,
            team_member_repository=team_member_repo,
        )

        # Create lead WITHOUT vendedor_id - should auto-assign
        request = CreateLeadRequest(
            buyer_name="Auto Assignment Test",
            buyer_email=f"auto-{uuid4().hex[:6]}@test.com",
            # vendedor_id is None - trigger auto-assignment
        )

        result = await use_case.execute(request, tenant_id)

        # ASSERTIONS: Lead should be automatically assigned to one of the dealers
        assert result.id is not None
        assert result.vendedor_id is not None, "Lead should be auto-assigned to a dealer"
        assert result.vendedor_id in {d.id for d in dealers}, (
            f"Assigned dealer should be one of the team members. "
            f"Got {result.vendedor_id}, expected one of {[d.id for d in dealers]}"
        )

        # Verify in database
        found = await lead_repo.get_by_id(result.id, tenant_id)
        assert found is not None
        assert found.vendedor_id == result.vendedor_id

    @pytest.mark.asyncio
    async def test_auto_assign_respects_explicit_vendedor_id(
        self,
        db_session,
        test_organization,
    ):
        """
        When vendedor_id is explicitly provided, it should be respected
        and NOT overridden by auto-assignment.
        """
        tenant_id = test_organization.tenant_id

        # Setup: Create dealer users
        dealers = await create_dealer_users(db_session, test_organization, count=3)
        await create_sales_team(db_session, test_organization, dealers)

        # Create use case
        lead_repo = SqlAlchemyLeadRepository(db_session)
        user_repo = SqlAlchemyUserRepository(db_session)
        product_repo = SqlAlchemyProductRepository(db_session)
        team_repo = SqlAlchemyTeamRepository(db_session)
        team_member_repo = SqlAlchemyTeamMemberRepository(db_session)

        use_case = CreateLeadUseCase(
            lead_repository=lead_repo,
            user_repository=user_repo,
            product_repository=product_repo,
            team_repository=team_repo,
            team_member_repository=team_member_repo,
        )

        # Create lead WITH explicit vendedor_id
        explicit_dealer = dealers[0]
        request = CreateLeadRequest(
            buyer_name="Explicit Assignment Test",
            buyer_email=f"explicit-{uuid4().hex[:6]}@test.com",
            vendedor_id=explicit_dealer.id,  # Explicitly assigned
        )

        result = await use_case.execute(request, tenant_id)

        # ASSERTION: Explicit assignment should be respected
        assert result.vendedor_id == explicit_dealer.id, (
            f"Explicit vendedor_id should be respected. "
            f"Expected {explicit_dealer.id}, got {result.vendedor_id}"
        )

    @pytest.mark.asyncio
    async def test_auto_assign_round_robin_distribution(
        self,
        db_session,
        test_organization,
    ):
        """
        Multiple leads should be distributed across dealers using round-robin.
        After creating several leads, each dealer should have roughly equal leads.
        """
        tenant_id = test_organization.tenant_id

        # Setup: Create dealer users
        dealers = await create_dealer_users(db_session, test_organization, count=3)
        await create_sales_team(db_session, test_organization, dealers)

        # Create use case
        lead_repo = SqlAlchemyLeadRepository(db_session)
        user_repo = SqlAlchemyUserRepository(db_session)
        product_repo = SqlAlchemyProductRepository(db_session)
        team_repo = SqlAlchemyTeamRepository(db_session)
        team_member_repo = SqlAlchemyTeamMemberRepository(db_session)

        use_case = CreateLeadUseCase(
            lead_repository=lead_repo,
            user_repository=user_repo,
            product_repository=product_repo,
            team_repository=team_repo,
            team_member_repository=team_member_repo,
        )

        # Create 6 leads without vendedor_id
        lead_count = 6
        for i in range(lead_count):
            request = CreateLeadRequest(
                buyer_name=f"Round Robin Test {i}",
                buyer_email=f"rr-{i}-{uuid4().hex[:6]}@test.com",
            )
            await use_case.execute(request, tenant_id)

        # Count leads per dealer
        from sqlalchemy import select

        from prosell.infrastructure.models.lead_model import LeadModel

        stmt = select(LeadModel.vendedor_id).where(
            LeadModel.tenant_id == tenant_id,
            LeadModel.vendedor_id.is_not(None),
        )
        result = await db_session.execute(stmt)
        assigned_vendedor_ids = [row[0] for row in result.all()]

        # Count assignments per dealer
        from collections import Counter
        counts = Counter(assigned_vendedor_ids)

        # ASSERTION: With 3 dealers and 6 leads, each should get 2 leads (round-robin)
        assert len(counts) == 3, "All 3 dealers should have leads assigned"
        assert all(count == 2 for count in counts.values()), (
            f"With round-robin, each dealer should have 2 leads. Got: {dict(counts)}"
        )


# Import for create_dealer_users helper
from sqlalchemy import select
