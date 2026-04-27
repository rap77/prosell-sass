"""Integration tests for Organization API endpoints."""

from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import status
from httpx import ASGITransport, AsyncClient, Response

from prosell.domain.entities.organization import Organization
from prosell.domain.entities.user import User
from prosell.domain.entities.wallet import Wallet
from prosell.domain.value_objects.organization_status import OrganizationStatus
from prosell.infrastructure.api.main import app

# =============================================================================
# FIXTURES
# =============================================================================


@pytest.fixture(autouse=True)
def auto_mock_auth(mock_auth_user):
    """Automatically mock auth for all tests."""
    from prosell.infrastructure.api.dependencies import (
        get_current_auth_user,
        get_current_auth_user_from_cookie,
    )

    app.dependency_overrides[get_current_auth_user] = lambda: mock_auth_user
    app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: mock_auth_user

    yield

    # Clean up after each test
    app.dependency_overrides.clear()


@pytest.fixture
def mock_role_repo_super_admin():
    """Mock role repository returning SUPER_ADMIN role."""
    from unittest.mock import AsyncMock, MagicMock

    from prosell.domain.entities.role import Role, RoleType

    role = Role.create_system_role(RoleType.SUPER_ADMIN)
    repo = MagicMock()
    repo.get_user_roles = AsyncMock(return_value=[role])
    return repo


@pytest.fixture
def with_super_admin_role(mock_role_repo_super_admin):
    """Override get_role_repository with SUPER_ADMIN for RBAC-gated endpoints."""
    from prosell.infrastructure.api.dependencies import get_role_repository

    app.dependency_overrides[get_role_repository] = lambda: mock_role_repo_super_admin
    # cleanup handled by autouse auto_mock_auth fixture


@pytest.fixture
def mock_org_repo():
    """Mock organization repository."""
    from unittest.mock import MagicMock

    repo = MagicMock()
    repo.exists_by_name = AsyncMock(return_value=False)
    repo.create = AsyncMock()
    repo.get_by_id = AsyncMock(return_value=None)
    repo.get_by_tenant_id = AsyncMock(return_value=None)
    repo.get_all = AsyncMock(return_value=[])
    repo.update = AsyncMock()
    repo.count = AsyncMock(return_value=0)
    return repo


@pytest.fixture
def mock_wallet_repo():
    """Mock wallet repository."""
    from unittest.mock import MagicMock

    repo = MagicMock()
    repo.create = AsyncMock()
    return repo


@pytest.fixture
def sample_org():
    """Sample organization for tests."""
    tenant_id = uuid4()
    org = Organization.create(name="Test Org", tenant_id=tenant_id)
    return org


@pytest.fixture
def sample_wallet(sample_org):
    """Sample wallet for tests."""
    return Wallet.create(org_id=sample_org.id, tenant_id=sample_org.tenant_id)


@pytest.fixture
def mock_auth_user():
    """Mock authenticated user for tests."""
    return User(
        id=uuid4(),
        email="test@example.com",
        full_name="Test User",
        tenant_id=uuid4(),
        is_active=True,
        email_verified=True,
    )


# =============================================================================
# HELPERS
# =============================================================================


def make_org_dict(org: Organization) -> dict:
    """Convert org to dict for API responses."""
    return {
        "id": str(org.id),
        "name": org.name,
        "tenant_id": str(org.tenant_id),
        "status": org.status.value,
        "logo_url": org.logo_url,
        "banner_url": org.banner_url,
        "description": org.description,
        "website": org.website,
        "phone": org.phone,
        "verified_at": org.verified_at.isoformat() if org.verified_at else None,
        "wallet_id": str(org.wallet_id) if org.wallet_id else None,
        "settings": org.settings,
        "created_at": org.created_at.isoformat(),
        "updated_at": org.updated_at.isoformat(),
    }


async def create_org_with_client(
    client: AsyncClient,
    name: str = "Test Org",
    tenant_id: str | None = None,
) -> Response:
    """Helper to create org via API."""
    payload = {"name": name, "tenant_id": tenant_id or str(uuid4())}
    return await client.post("/api/v1/org", json=payload)


# =============================================================================
# POST /api/v1/org - Create Organization
# =============================================================================


class TestCreateOrganization:
    async def test_create_success(
        self,
        mock_org_repo,
        mock_wallet_repo,
        sample_org,
        sample_wallet,
        mock_auth_user,
        with_super_admin_role,
    ):
        """Creates org with 201 status."""
        # Setup mocks
        mock_org_repo.exists_by_name.return_value = False
        mock_org_repo.create.return_value = sample_org
        mock_wallet_repo.create.return_value = sample_wallet
        # After wallet linking
        linked_org = Organization.model_validate(sample_org.model_dump())
        linked_org.wallet_id = sample_wallet.id
        mock_org_repo.update.return_value = linked_org

        from prosell.infrastructure.api.routers.org_router import (
            get_org_repository,
            get_wallet_repository,
        )

        app.dependency_overrides[get_org_repository] = lambda: mock_org_repo
        app.dependency_overrides[get_wallet_repository] = lambda: mock_wallet_repo

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            payload = {
                "name": sample_org.name,
                "tenant_id": str(sample_org.tenant_id),
            }
            response = await client.post("/api/v1/org", json=payload)

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["name"] == sample_org.name
        assert data["status"] == OrganizationStatus.PENDING_VERIFICATION.value

        # Clean up handled by autouse fixture

    async def test_create_conflict_when_name_exists(
        self,
        mock_org_repo,
        mock_wallet_repo,
        with_super_admin_role,
    ):
        """Returns 409 when org name already exists."""
        mock_org_repo.exists_by_name.return_value = True

        from prosell.infrastructure.api.routers.org_router import (
            get_org_repository,
            get_wallet_repository,
        )

        app.dependency_overrides[get_org_repository] = lambda: mock_org_repo
        app.dependency_overrides[get_wallet_repository] = lambda: mock_wallet_repo

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            payload = {"name": "Existing", "tenant_id": str(uuid4())}
            response = await client.post(
                f"/api/v1/org?creator_id={uuid4()}",
                json=payload,
            )

        assert response.status_code == status.HTTP_409_CONFLICT
        assert "already exists" in response.json()["detail"].lower()

        # Clean up handled by autouse fixture


# =============================================================================
# GET /api/v1/org - List Organizations
# =============================================================================


class TestListOrganizations:
    async def test_list_empty(self, mock_org_repo):
        """Returns empty list when no orgs exist."""
        mock_org_repo.get_all.return_value = []
        mock_org_repo.count.return_value = 0

        from prosell.infrastructure.api.routers.org_router import get_org_repository

        app.dependency_overrides[get_org_repository] = lambda: mock_org_repo

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/org")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["organizations"] == []
        assert data["total"] == 0

        # Clean up handled by autouse fixture

    async def test_list_with_results(self, mock_org_repo, sample_org):
        """Returns list of organizations."""
        mock_org_repo.get_all.return_value = [sample_org]
        mock_org_repo.count.return_value = 1

        from prosell.infrastructure.api.routers.org_router import get_org_repository

        app.dependency_overrides[get_org_repository] = lambda: mock_org_repo

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/org")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total"] == 1
        assert len(data["organizations"]) == 1
        assert data["organizations"][0]["name"] == sample_org.name

        # Clean up handled by autouse fixture

    async def test_list_with_pagination(self, mock_org_repo, sample_org):
        """Applies skip and limit parameters."""
        mock_org_repo.get_all.return_value = [sample_org]
        mock_org_repo.count.return_value = 50

        from prosell.infrastructure.api.routers.org_router import get_org_repository

        app.dependency_overrides[get_org_repository] = lambda: mock_org_repo

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/org?skip=10&limit=5")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["skip"] == 10
        assert data["limit"] == 5
        assert data["total"] == 50

        # Verify repo was called with correct params
        mock_org_repo.get_all.assert_awaited_once_with(
            tenant_id=None,
            skip=10,
            limit=5,
        )

        # Clean up handled by autouse fixture


# =============================================================================
# GET /api/v1/org/me - Get Current User's Organization
# =============================================================================


class TestGetMyOrganization:
    async def test_get_my_org_success(self, mock_org_repo, sample_org):
        """Returns current user's org by tenant_id."""
        mock_org_repo.get_by_tenant_id.return_value = sample_org

        from prosell.infrastructure.api.routers.org_router import get_org_repository

        app.dependency_overrides[get_org_repository] = lambda: mock_org_repo

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(f"/api/v1/org/me?tenant_id={sample_org.tenant_id}")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["tenant_id"] == str(sample_org.tenant_id)

        # Clean up handled by autouse fixture

    async def test_get_my_org_not_found(self, mock_org_repo):
        """Returns 404 when tenant has no org."""
        mock_org_repo.get_by_tenant_id.return_value = None

        from prosell.infrastructure.api.routers.org_router import get_org_repository

        app.dependency_overrides[get_org_repository] = lambda: mock_org_repo

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(f"/api/v1/org/me?tenant_id={uuid4()}")

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "not found" in response.json()["detail"].lower()

        # Clean up handled by autouse fixture


# =============================================================================
# GET /api/v1/org/{org_id} - Get Organization by ID
# =============================================================================


class TestGetOrganizationById:
    async def test_get_by_id_success(self, mock_org_repo, sample_org):
        """Returns org by ID."""
        mock_org_repo.get_by_id.return_value = sample_org

        from prosell.infrastructure.api.routers.org_router import get_org_repository

        app.dependency_overrides[get_org_repository] = lambda: mock_org_repo

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(
                f"/api/v1/org/{sample_org.id}?tenant_id={sample_org.tenant_id}"
            )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == str(sample_org.id)

        # Clean up handled by autouse fixture

    async def test_get_by_id_not_found(self, mock_org_repo):
        """Returns 404 when org doesn't exist."""
        mock_org_repo.get_by_id.return_value = None

        from prosell.infrastructure.api.routers.org_router import get_org_repository

        app.dependency_overrides[get_org_repository] = lambda: mock_org_repo

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(f"/api/v1/org/{uuid4()}?tenant_id={uuid4()}")

        assert response.status_code == status.HTTP_404_NOT_FOUND

        # Clean up handled by autouse fixture


# =============================================================================
# PATCH /api/v1/org/{org_id} - Update Organization
# =============================================================================


class TestUpdateOrganization:
    async def test_update_success(self, mock_org_repo, sample_org):
        """Updates org and returns updated data."""
        mock_org_repo.get_by_id.return_value = sample_org

        updated_org = Organization.model_validate(sample_org.model_dump())
        updated_org.name = "Updated Name"
        mock_org_repo.update.return_value = updated_org

        from prosell.infrastructure.api.routers.org_router import get_org_repository

        app.dependency_overrides[get_org_repository] = lambda: mock_org_repo

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            payload = {"name": "Updated Name"}
            response = await client.patch(
                f"/api/v1/org/{sample_org.id}?tenant_id={sample_org.tenant_id}",
                json=payload,
            )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["name"] == "Updated Name"

        # Clean up handled by autouse fixture

    async def test_update_partial_fields(self, mock_org_repo, sample_org):
        """Updates only provided fields."""
        mock_org_repo.get_by_id.return_value = sample_org

        updated_org = Organization.model_validate(sample_org.model_dump())
        updated_org.description = "New description"
        mock_org_repo.update.return_value = updated_org

        from prosell.infrastructure.api.routers.org_router import get_org_repository

        app.dependency_overrides[get_org_repository] = lambda: mock_org_repo

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            payload = {"description": "New description"}
            response = await client.patch(
                f"/api/v1/org/{sample_org.id}?tenant_id={sample_org.tenant_id}",
                json=payload,
            )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["description"] == "New description"
        # Name should remain unchanged
        assert data["name"] == sample_org.name

        # Clean up handled by autouse fixture


# =============================================================================
# POST /api/v1/org/{org_id}/verify - Verify Organization
# =============================================================================


class TestVerifyOrganization:
    async def test_verify_success(self, mock_org_repo, sample_org, with_super_admin_role):
        """Verifies pending org and transitions to ACTIVE."""
        sample_org.status = OrganizationStatus.PENDING_VERIFICATION
        mock_org_repo.get_by_id.return_value = sample_org

        verified_org = Organization.model_validate(sample_org.model_dump())
        verifier_id = uuid4()
        verified_org.verify(verifier_id)
        mock_org_repo.update.return_value = verified_org

        from prosell.infrastructure.api.routers.org_router import get_org_repository

        app.dependency_overrides[get_org_repository] = lambda: mock_org_repo

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                f"/api/v1/org/{sample_org.id}/verify?verifier_id={verifier_id}&tenant_id={sample_org.tenant_id}"
            )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == OrganizationStatus.ACTIVE.value
        assert data["verified_at"] is not None

        # Clean up handled by autouse fixture

    async def test_verify_already_active_fails(
        self,
        mock_org_repo,
        sample_org,
        with_super_admin_role,
    ):
        """Returns 422 when verifying already ACTIVE org."""
        sample_org.status = OrganizationStatus.ACTIVE
        mock_org_repo.get_by_id.return_value = sample_org

        from prosell.infrastructure.api.routers.org_router import get_org_repository

        app.dependency_overrides[get_org_repository] = lambda: mock_org_repo

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                f"/api/v1/org/{sample_org.id}/verify?verifier_id={uuid4()}&tenant_id={sample_org.tenant_id}"
            )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        assert "verification failed" in response.json()["detail"].lower()

        # Clean up handled by autouse fixture


# =============================================================================
# POST /api/v1/org/{org_id}/reject - Reject Organization
# =============================================================================


class TestRejectOrganization:
    async def test_reject_success(self, mock_org_repo, sample_org, with_super_admin_role):
        """Rejects pending org."""
        sample_org.status = OrganizationStatus.PENDING_VERIFICATION
        mock_org_repo.get_by_id.return_value = sample_org

        rejected_org = Organization.model_validate(sample_org.model_dump())
        verifier_id = uuid4()
        rejected_org.reject(verifier_id)
        mock_org_repo.update.return_value = rejected_org

        from prosell.infrastructure.api.routers.org_router import get_org_repository

        app.dependency_overrides[get_org_repository] = lambda: mock_org_repo

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                f"/api/v1/org/{sample_org.id}/reject?verifier_id={verifier_id}&tenant_id={sample_org.tenant_id}"
            )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == OrganizationStatus.REJECTED.value

        # Clean up handled by autouse fixture


# =============================================================================
# POST /api/v1/org/{org_id}/suspend - Suspend Organization
# =============================================================================


class TestSuspendOrganization:
    async def test_suspend_success(self, mock_org_repo, sample_org, with_super_admin_role):
        """Suspends active org."""
        sample_org.status = OrganizationStatus.ACTIVE
        mock_org_repo.get_by_id.return_value = sample_org

        suspended_org = Organization.model_validate(sample_org.model_dump())
        suspended_org.suspend()
        mock_org_repo.update.return_value = suspended_org

        from prosell.infrastructure.api.routers.org_router import get_org_repository

        app.dependency_overrides[get_org_repository] = lambda: mock_org_repo

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                f"/api/v1/org/{sample_org.id}/suspend?tenant_id={sample_org.tenant_id}"
            )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == OrganizationStatus.SUSPENDED.value

        # Clean up handled by autouse fixture
