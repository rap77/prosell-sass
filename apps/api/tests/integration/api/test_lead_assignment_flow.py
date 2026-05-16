"""Integration tests for lead assignment flow via API.

These tests verify the complete end-to-end assignment flow:
  POST /api/v1/leads → CreateLeadUseCase → LeadAssignmentRulesEngine → DB

The distinction from use-case-level tests is that here we go through
the real HTTP layer (ASGITransport), which means dependency injection
in the router must wire all repositories correctly for auto-assignment
to work.
"""

from collections import Counter
from collections.abc import AsyncGenerator, AsyncIterator
from uuid import UUID, uuid4

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.application.use_cases.lead.create_lead import CreateLeadUseCase
from prosell.domain.entities.role import Role, RoleType
from prosell.domain.entities.user import User, UserStatus
from prosell.domain.services.lead_assignment_rules_engine import LeadAssignmentRulesEngine
from prosell.infrastructure.api.dependencies import get_current_auth_user_from_cookie
from prosell.infrastructure.api.main import app
from prosell.infrastructure.api.routers.lead_router import get_create_lead_use_case
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.models.lead_model import LeadModel
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.models.role_model import RoleModel, UserRoleModel
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


def _make_auth_user(role_type: RoleType, tenant_id: UUID, user_id: UUID) -> User:
    """Build a User domain entity for dependency override."""
    role = Role(
        id=uuid4(),
        role_type=role_type,
        name=role_type.value,
        is_system_role=True,
    )
    return User(
        id=user_id,
        email=f"caller-{uuid4().hex[:6]}@test.com",
        full_name="Caller User",
        tenant_id=tenant_id,
        status=UserStatus.ACTIVE,
        email_verified=True,
        roles=[role],
    )


async def _create_dealer_db_users(
    db_session: AsyncSession,
    tenant_id: UUID,
    count: int = 3,
) -> list[UserModel]:
    """Persist dealer UserModels with SALES_AGENT role, all in tenant_id."""
    # Reuse existing role if present
    stmt = select(RoleModel).where(RoleModel.role_type == "SALES_AGENT")
    result = await db_session.execute(stmt)
    role: RoleModel | None = result.scalar_one_or_none()
    if role is None:
        role = RoleModel(
            id=uuid4(),
            role_type="SALES_AGENT",
            name="Sales Agent",
            is_system_role=True,
            tenant_id=None,
        )
        db_session.add(role)
        await db_session.flush()

    dealers: list[UserModel] = []
    for i in range(count):
        user = UserModel(
            id=uuid4(),
            email=f"dealer-{i}-{uuid4().hex[:6]}@test.prosell.io",
            full_name=f"Dealer {i}",
            tenant_id=tenant_id,
            status="active",
            email_verified=True,
            is_2fa_enabled=False,
            failed_login_attempts=0,
        )
        db_session.add(user)
        await db_session.flush()

        user_role = UserRoleModel(id=uuid4(), user_id=user.id, role_id=role.id)
        db_session.add(user_role)
        await db_session.flush()

        dealers.append(user)

    return dealers


async def _create_sales_team(
    db_session: AsyncSession,
    org_id: UUID,
    tenant_id: UUID,
    dealers: list[UserModel],
) -> TeamModel:
    """Persist a TeamModel with all dealers as members."""
    team = TeamModel(
        id=uuid4(),
        name=f"Sales Team {uuid4().hex[:8]}",
        tenant_id=tenant_id,
        org_id=org_id,
        description="Assignment test team",
        parent_team_id=None,
    )
    db_session.add(team)
    await db_session.flush()

    for dealer in dealers:
        member = TeamMemberModel(
            id=uuid4(),
            team_id=team.id,
            user_id=dealer.id,
            role="vendor",
            tenant_id=tenant_id,
            commission_rate=None,
            joined_at=None,
        )
        db_session.add(member)
        await db_session.flush()

    return team


# =============================================================================
# FIXTURES
# =============================================================================


AssignmentClient = tuple[AsyncClient, User, list[UserModel], TeamModel]


@pytest_asyncio.fixture
async def assignment_client(
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    test_user: UserModel,
) -> AsyncIterator[AssignmentClient]:
    """
    AsyncClient + DB seeded with 3 dealers in a sales team.

    Returns (client, caller_user, dealers, team).

    A fresh LeadAssignmentRulesEngine is injected per test so that
    round-robin state does not bleed between tests.
    """
    tenant_id: UUID = test_organization.tenant_id
    org_id: UUID = test_organization.id

    # Create dealers and a team in the real DB
    dealers = await _create_dealer_db_users(db_session, tenant_id, count=3)
    team = await _create_sales_team(db_session, org_id, tenant_id, dealers)

    # Auth user is the main test_user (SUPER_ADMIN role, same tenant)
    caller = _make_auth_user(RoleType.SALES_AGENT, tenant_id, test_user.id)

    # Fresh engine per test — round-robin starts at index 0
    fresh_engine = LeadAssignmentRulesEngine()

    app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: caller

    async def override_session() -> AsyncGenerator[AsyncSession]:
        yield db_session

    async def override_create_lead_use_case() -> CreateLeadUseCase:
        return CreateLeadUseCase(
            lead_repository=SqlAlchemyLeadRepository(db_session),
            user_repository=SqlAlchemyUserRepository(db_session),
            product_repository=SqlAlchemyProductRepository(db_session),
            team_repository=SqlAlchemyTeamRepository(db_session),
            team_member_repository=SqlAlchemyTeamMemberRepository(db_session),
            assignment_engine=fresh_engine,
        )

    app.dependency_overrides[get_async_session] = override_session
    app.dependency_overrides[get_create_lead_use_case] = override_create_lead_use_case

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        yield client, caller, dealers, team

    app.dependency_overrides.clear()


# =============================================================================
# TESTS
# =============================================================================


class TestLeadAssignmentFlowAPI:
    """Full HTTP-stack integration tests for automatic lead assignment."""

    async def test_create_lead_auto_assigns_to_dealer(
        self,
        assignment_client: AssignmentClient,
    ):
        """
        POST /api/v1/leads without vendedor_id should auto-assign
        the lead to one of the dealers via LeadAssignmentRulesEngine.

        This test goes through the full HTTP stack:
          Client → Router → CreateLeadUseCase → LeadAssignmentRulesEngine → DB
        """
        client, _caller, dealers, _ = assignment_client

        response = await client.post(
            "/api/v1/leads",
            json={
                "buyer_name": "Auto Assign API Test",
                "buyer_email": f"autoapi-{uuid4().hex[:6]}@test.com",
                # vendedor_id intentionally omitted → triggers auto-assignment
            },
        )

        assert response.status_code == 201, response.text
        data = response.json()

        # Core assertion: auto-assignment happened
        assert data["vendedor_id"] is not None, (
            "Lead should have been auto-assigned to a dealer. "
            "This fails if get_create_lead_use_case does not wire team/user repos."
        )

        # Assigned dealer must belong to the team we created
        dealer_ids = {str(d.id) for d in dealers}
        assert data["vendedor_id"] in dealer_ids, (
            f"Assigned vendedor {data['vendedor_id']} is not in the team's dealers: {dealer_ids}"
        )

    async def test_explicit_vendedor_id_is_respected(
        self,
        assignment_client: AssignmentClient,
    ):
        """
        When vendedor_id is explicitly provided in the POST body,
        the assignment engine must NOT override it.
        """
        client, _caller, dealers, _ = assignment_client

        explicit_dealer = dealers[1]

        response = await client.post(
            "/api/v1/leads",
            json={
                "buyer_name": "Explicit Assignment API Test",
                "buyer_email": f"explicit-{uuid4().hex[:6]}@test.com",
                "vendedor_id": str(explicit_dealer.id),
            },
        )

        assert response.status_code == 201, response.text
        data = response.json()
        assert data["vendedor_id"] == str(explicit_dealer.id), (
            f"Explicit vendedor_id should be preserved. "
            f"Expected {explicit_dealer.id}, got {data['vendedor_id']}"
        )

    async def test_round_robin_distributes_leads_evenly(
        self,
        assignment_client: AssignmentClient,
        db_session: AsyncSession,
        test_organization: OrganizationModel,
    ):
        """
        Creating multiple leads without vendedor_id should distribute
        them evenly across the 3 dealers via round-robin.

        With 3 dealers and 6 leads, each dealer should get exactly 2.
        """
        client, _caller, dealers, _ = assignment_client
        tenant_id: UUID = test_organization.tenant_id

        # Create 6 leads, all without vendedor_id
        created_ids: list[str] = []
        for i in range(6):
            resp = await client.post(
                "/api/v1/leads",
                json={
                    "buyer_name": f"Round Robin Test {i}",
                    "buyer_email": f"rr-api-{i}-{uuid4().hex[:6]}@test.com",
                },
            )
            assert resp.status_code == 201, f"Lead {i} creation failed: {resp.text}"
            created_ids.append(resp.json()["id"])

        # Query DB for the created leads
        stmt = select(LeadModel.vendedor_id).where(
            LeadModel.id.in_([UUID(lid) for lid in created_ids]),
            LeadModel.tenant_id == tenant_id,
            LeadModel.vendedor_id.is_not(None),
        )
        result = await db_session.execute(stmt)
        assigned_ids = [row[0] for row in result.all()]

        # All 6 leads must be assigned
        assert len(assigned_ids) == 6, (
            f"Expected 6 assigned leads, got {len(assigned_ids)}. "
            "Check that the API wires assignment repositories correctly."
        )

        # Count per dealer
        counts = Counter(assigned_ids)
        dealer_id_set = {d.id for d in dealers}

        # Only our 3 dealers should appear
        assert set(counts.keys()) == dealer_id_set, (
            f"Unexpected dealers in assignment. Got {counts.keys()}, expected {dealer_id_set}"
        )

        # Even distribution: 6 leads / 3 dealers = 2 each
        assert all(count == 2 for count in counts.values()), (
            f"Round-robin should distribute leads evenly. Got distribution: {dict(counts)}"
        )

    async def test_lead_creation_response_contains_correct_fields(
        self,
        assignment_client: AssignmentClient,
    ):
        """
        The API response must include vendedor_id, status, tenant_id,
        and other core fields when auto-assignment runs.
        """
        client, caller, _, _ = assignment_client

        response = await client.post(
            "/api/v1/leads",
            json={
                "buyer_name": "Fields Test Buyer",
                "buyer_email": f"fields-{uuid4().hex[:6]}@test.com",
            },
        )

        assert response.status_code == 201, response.text
        data = response.json()

        # Required fields
        assert "id" in data
        assert "buyer_name" in data
        assert "status" in data
        assert "tenant_id" in data
        assert "vendedor_id" in data  # Must be present (auto-assigned)
        assert data["status"] == "new"
        assert data["tenant_id"] == str(caller.tenant_id)
