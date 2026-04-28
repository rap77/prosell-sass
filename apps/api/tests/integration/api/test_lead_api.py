"""Integration tests for lead API endpoints — full stack with real DB.

Auth pattern: dependency_overrides for get_current_auth_user_from_cookie.
DB pattern: override get_async_session to use test database.
"""

from collections.abc import AsyncGenerator
from uuid import uuid4

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from prosell.domain.entities.role import Role, RoleType
from prosell.domain.entities.user import User, UserStatus
from prosell.infrastructure.api.dependencies import get_current_auth_user_from_cookie
from prosell.infrastructure.api.main import app
from prosell.infrastructure.database.session import get_async_session


# =============================================================================
# FIXTURES
# =============================================================================


def make_user_entity(role_type: RoleType, tenant_id) -> User:
    """Build User domain entity for dependency override."""
    role = Role(
        id=uuid4(),
        role_type=role_type,
        name=role_type.value,
        is_system_role=True,
    )
    return User(
        id=uuid4(),
        email=f"test-{uuid4().hex[:6]}@test.com",
        full_name="Test User",
        tenant_id=tenant_id,
        status=UserStatus.ACTIVE,
        email_verified=True,
        roles=[role],
    )


@pytest_asyncio.fixture
async def api_client_as_vendedor(db_session, test_organization, test_user):
    """AsyncClient authenticated as SALES_AGENT using real DB user."""
    user = make_user_entity(RoleType.SALES_AGENT, test_organization.tenant_id)
    # Override UUID to use real DB user's ID so FK constraints pass
    user = user.model_copy(update={"id": test_user.id})

    app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: user

    async def override_session() -> AsyncGenerator:
        yield db_session

    app.dependency_overrides[get_async_session] = override_session

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        yield client, user

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def api_client_as_manager(db_session, test_organization, test_user):
    """AsyncClient authenticated as MANAGER using real DB user."""
    user = make_user_entity(RoleType.MANAGER, test_organization.tenant_id)
    # Override UUID to use real DB user's ID so FK constraints pass
    user = user.model_copy(update={"id": test_user.id})

    app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: user

    async def override_session() -> AsyncGenerator:
        yield db_session

    app.dependency_overrides[get_async_session] = override_session

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        yield client, user

    app.dependency_overrides.clear()


# =============================================================================
# POST /api/v1/leads
# =============================================================================


class TestCreateLeadEndpoint:
    """Tests for POST /api/v1/leads."""

    @pytest.mark.asyncio
    async def test_create_lead_returns_201(self, api_client_as_vendedor):
        """Should return 201 with lead data."""
        client, user = api_client_as_vendedor

        response = await client.post(
            "/api/v1/leads",
            json={
                "buyer_name": "API Test Buyer",
                "buyer_email": f"api-{uuid4().hex[:6]}@test.com",
                "source": "manual",
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["buyer_name"] == "API Test Buyer"
        assert data["status"] == "new"
        assert data["tenant_id"] == str(user.tenant_id)

    @pytest.mark.asyncio
    async def test_create_lead_duplicate_returns_409(self, api_client_as_vendedor):
        """Should return 409 for duplicate lead within 24h."""
        client, user = api_client_as_vendedor
        email = f"dup409-{uuid4().hex[:6]}@test.com"
        vehicle_id = str(uuid4())

        payload = {
            "buyer_name": "Dup Buyer",
            "buyer_email": email,
            "vehicle_id": vehicle_id,
        }

        # First request succeeds
        r1 = await client.post("/api/v1/leads", json=payload)
        assert r1.status_code == 201

        # Second request returns 409
        r2 = await client.post("/api/v1/leads", json=payload)
        assert r2.status_code == 409

    @pytest.mark.asyncio
    async def test_create_lead_missing_buyer_name_returns_422(self, api_client_as_vendedor):
        """Should return 422 when buyer_name is missing."""
        client, _ = api_client_as_vendedor

        response = await client.post(
            "/api/v1/leads",
            json={"buyer_email": "test@test.com"},
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_lead_unauthenticated_returns_403(self, db_session):
        """Should return 403 when no auth provided."""
        app.dependency_overrides.clear()

        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as client:
            response = await client.post(
                "/api/v1/leads",
                json={"buyer_name": "Test"},
            )

        assert response.status_code in (401, 403)


# =============================================================================
# GET /api/v1/leads
# =============================================================================


class TestListLeadsEndpoint:
    """Tests for GET /api/v1/leads."""

    @pytest.mark.asyncio
    async def test_list_leads_returns_200(self, api_client_as_vendedor):
        """Should return 200 with lead list."""
        client, user = api_client_as_vendedor

        response = await client.get("/api/v1/leads")

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "limit" in data
        assert "offset" in data

    @pytest.mark.asyncio
    async def test_list_leads_pagination_params(self, api_client_as_vendedor):
        """Should accept limit and offset query params."""
        client, _ = api_client_as_vendedor

        response = await client.get("/api/v1/leads?limit=5&offset=0")

        assert response.status_code == 200
        data = response.json()
        assert data["limit"] == 5
        assert data["offset"] == 0

    @pytest.mark.asyncio
    async def test_list_leads_filter_by_status(self, api_client_as_vendedor):
        """Should filter leads by status query param."""
        client, _ = api_client_as_vendedor

        response = await client.get("/api/v1/leads?status=new")

        assert response.status_code == 200
        data = response.json()
        assert all(item["status"] == "new" for item in data["items"])

    @pytest.mark.asyncio
    async def test_manager_sees_all_leads(self, api_client_as_manager):
        """Manager endpoint should return all tenant leads."""
        client, _ = api_client_as_manager

        response = await client.get("/api/v1/leads")

        assert response.status_code == 200


# =============================================================================
# GET /api/v1/leads/{id}
# =============================================================================


class TestGetLeadDetailsEndpoint:
    """Tests for GET /api/v1/leads/{id}."""

    @pytest.mark.asyncio
    async def test_get_lead_details_returns_200(self, api_client_as_vendedor):
        """Should return lead with audit logs."""
        client, user = api_client_as_vendedor

        # Create a lead first
        create_resp = await client.post(
            "/api/v1/leads",
            json={
                "buyer_name": "Detail Test Buyer",
                "buyer_email": f"detail-{uuid4().hex[:6]}@test.com",
            },
        )
        assert create_resp.status_code == 201
        lead_id = create_resp.json()["id"]

        # Fetch details
        response = await client.get(f"/api/v1/leads/{lead_id}")

        assert response.status_code == 200
        data = response.json()
        assert "lead" in data
        assert "audit_logs" in data
        assert data["lead"]["id"] == lead_id

    @pytest.mark.asyncio
    async def test_get_lead_details_not_found_returns_404(self, api_client_as_vendedor):
        """Should return 404 for non-existent lead."""
        client, _ = api_client_as_vendedor

        response = await client.get(f"/api/v1/leads/{uuid4()}")

        assert response.status_code == 404


# =============================================================================
# PUT /api/v1/leads/{id}/status
# =============================================================================


class TestUpdateLeadStatusEndpoint:
    """Tests for PUT /api/v1/leads/{id}/status."""

    @pytest.mark.asyncio
    async def test_update_status_returns_200(self, api_client_as_vendedor):
        """Should return 200 with updated lead."""
        client, user = api_client_as_vendedor

        # Create lead
        create_resp = await client.post(
            "/api/v1/leads",
            json={
                "buyer_name": "Status Update Buyer",
                "buyer_email": f"status-{uuid4().hex[:6]}@test.com",
            },
        )
        assert create_resp.status_code == 201
        lead_id = create_resp.json()["id"]

        # Update status
        response = await client.put(
            f"/api/v1/leads/{lead_id}/status",
            json={"new_status": "contacted", "reason": "Called buyer"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "contacted"

    @pytest.mark.asyncio
    async def test_update_status_invalid_transition_returns_422(self, api_client_as_vendedor):
        """Should return 422 for invalid state transition."""
        client, user = api_client_as_vendedor

        # Create lead (status = new)
        create_resp = await client.post(
            "/api/v1/leads",
            json={
                "buyer_name": "Invalid Transition Buyer",
                "buyer_email": f"inv-{uuid4().hex[:6]}@test.com",
            },
        )
        assert create_resp.status_code == 201
        lead_id = create_resp.json()["id"]

        # Try invalid transition: new → appointment_set (skip states)
        response = await client.put(
            f"/api/v1/leads/{lead_id}/status",
            json={"new_status": "appointment_set"},
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_update_status_not_found_returns_404(self, api_client_as_vendedor):
        """Should return 404 for non-existent lead."""
        client, _ = api_client_as_vendedor

        response = await client.put(
            f"/api/v1/leads/{uuid4()}/status",
            json={"new_status": "contacted"},
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_status_tenant_isolation(self, db_session, test_organization):
        """Should not update lead from different tenant."""
        from prosell.infrastructure.models.organization_model import OrganizationModel

        # Create second tenant
        tenant2_id = uuid4()
        org2 = OrganizationModel(
            id=tenant2_id,
            name=f"Org2-{uuid4().hex[:6]}",
            tenant_id=tenant2_id,
            status="active",
            description="Second test org",
            settings={},
        )
        db_session.add(org2)
        await db_session.flush()

        # Create lead in tenant1
        user_t1 = make_user_entity(RoleType.SALES_AGENT, test_organization.tenant_id)

        async def override_session() -> AsyncGenerator:
            yield db_session

        app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: user_t1
        app.dependency_overrides[get_async_session] = override_session

        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as client:
            create_resp = await client.post(
                "/api/v1/leads",
                json={
                    "buyer_name": "Tenant1 Buyer",
                    "buyer_email": f"t1-{uuid4().hex[:6]}@test.com",
                },
            )
            assert create_resp.status_code == 201
            lead_id = create_resp.json()["id"]

        # Try to update from tenant2
        user_t2 = make_user_entity(RoleType.SALES_AGENT, tenant2_id)
        app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: user_t2

        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as client:
            response = await client.put(
                f"/api/v1/leads/{lead_id}/status",
                json={"new_status": "contacted"},
            )

        app.dependency_overrides.clear()

        assert response.status_code == 404  # Lead not found in tenant2
