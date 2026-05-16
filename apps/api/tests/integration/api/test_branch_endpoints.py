"""Integration tests for Branch API endpoints."""

from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import status
from httpx import ASGITransport, AsyncClient

from prosell.domain.entities.branch import Branch
from prosell.domain.entities.role import Role, RoleType
from prosell.domain.entities.user import User, UserStatus
from prosell.domain.exceptions.branch_exceptions import SlugNotUniqueError
from prosell.infrastructure.api.main import app


@pytest.fixture
def admin_user(admin_role):
    """Create admin user fixture."""
    user = User(
        id=uuid4(),
        email="admin@example.com",
        full_name="Admin User",
        tenant_id=uuid4(),
        status=UserStatus.ACTIVE,
        email_verified=True,
    )
    user.roles = [admin_role]
    return user


@pytest.fixture
def admin_role():
    """Create admin role fixture."""
    return Role.create_system_role(RoleType.ADMIN)


@pytest.fixture
def admin_user_with_role(admin_role):
    """Create admin user with role - separate fixture for dependency injection."""
    user = User(
        id=uuid4(),
        email="admin@example.com",
        full_name="Admin User",
        tenant_id=uuid4(),
        status=UserStatus.ACTIVE,
        email_verified=True,
    )
    user.roles = [admin_role]
    return user


@pytest.fixture
def mock_branch_repo():
    """Mock branch repository."""
    repo = AsyncMock()

    # Mock get_by_id to return a branch
    async def mock_get_by_id(branch_id, tenant_id):
        return Branch(
            id=branch_id,
            tenant_id=tenant_id,
            name="Test Branch",
            slug="test-branch",
        )

    repo.get_by_id = mock_get_by_id
    return repo


@pytest.fixture
def mock_create_branch_use_case():
    """Mock CreateBranchUseCase."""
    from datetime import UTC, datetime

    from prosell.application.dto.branch import BranchResponse

    use_case = AsyncMock()

    async def mock_execute(request, tenant_id):
        return BranchResponse(
            id=str(uuid4()),
            tenant_id=str(tenant_id),
            name=request.name,
            slug=request.slug or request.name.lower().replace(" ", "-"),
            logo_url=request.logo_url,
            address=request.address,
            city=request.city,
            state=request.state,
            country=request.country,
            postal_code=request.postal_code,
            phone=request.phone,
            email=request.email,
            website=request.website,
            timezone=request.timezone,
            settings=request.settings,
            latitude=None,
            longitude=None,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )

    use_case.execute = mock_execute
    return use_case


@pytest.fixture
def mock_get_branch_use_case():
    """Mock GetBranchUseCase."""
    from datetime import UTC, datetime

    from prosell.application.dto.branch import BranchResponse

    use_case = AsyncMock()

    async def mock_execute(branch_id, tenant_id):
        return BranchResponse(
            id=str(branch_id),
            tenant_id=str(tenant_id),
            name="Test Branch",
            slug="test-branch",
            logo_url=None,
            address=None,
            city=None,
            state=None,
            country=None,
            postal_code=None,
            phone=None,
            email=None,
            website=None,
            timezone="America/Montevideo",
            settings={},
            latitude=None,
            longitude=None,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )

    use_case.execute = mock_execute
    return use_case


@pytest.fixture
def mock_list_branches_use_case():
    """Mock ListBranchesUseCase."""
    from datetime import UTC, datetime

    from prosell.application.dto.branch import BranchListResponse, BranchResponse

    use_case = AsyncMock()

    async def mock_execute(tenant_id, limit, offset):
        return BranchListResponse(
            items=[
                BranchResponse(
                    id=str(uuid4()),
                    tenant_id=str(tenant_id),
                    name="Test Branch",
                    slug="test-branch",
                    logo_url=None,
                    address=None,
                    city=None,
                    state=None,
                    country=None,
                    postal_code=None,
                    phone=None,
                    email=None,
                    website=None,
                    timezone="America/Montevideo",
                    settings={},
                    latitude=None,
                    longitude=None,
                    created_at=datetime.now(UTC),
                    updated_at=datetime.now(UTC),
                )
            ],
            total=1,
            limit=limit,
            offset=offset,
        )

    use_case.execute = mock_execute
    return use_case


@pytest.fixture(autouse=True)
def setup_dependencies(
    admin_user,
    mock_branch_repo,  # noqa: ARG001
    mock_create_branch_use_case,
    mock_get_branch_use_case,
    mock_list_branches_use_case,
):
    """Set up dependency overrides for all tests."""
    from unittest.mock import Mock

    from prosell.infrastructure.api.dependencies import (
        get_current_auth_user,
        get_current_auth_user_from_cookie,
    )
    from prosell.infrastructure.api.di import (
        get_create_branch_use_case,
        get_get_branch_use_case,
        get_list_branches_use_case,
    )

    # Mock auth user with admin role - use Mock to avoid _roles attribute issue
    async def get_mock_user():
        mock_user = Mock(spec=User)
        mock_user.id = admin_user.id
        mock_user.email = admin_user.email
        mock_user.full_name = admin_user.full_name
        mock_user.tenant_id = admin_user.tenant_id
        mock_user.is_active = True
        mock_user.email_verified = True
        mock_user.roles = []  # For debug code in router
        mock_user.has_role = Mock(return_value=True)  # Always True for admin tests
        return mock_user

    app.dependency_overrides[get_current_auth_user] = get_mock_user
    app.dependency_overrides[get_current_auth_user_from_cookie] = get_mock_user
    app.dependency_overrides[get_create_branch_use_case] = lambda: mock_create_branch_use_case
    app.dependency_overrides[get_get_branch_use_case] = lambda: mock_get_branch_use_case
    app.dependency_overrides[get_list_branches_use_case] = lambda: mock_list_branches_use_case

    yield

    app.dependency_overrides.clear()


class TestBranchEndpoints:
    """Test suite for Branch API endpoints."""

    async def test_create_branch_admin(self):
        """POST /api/branches creates branch for admin users."""
        branch_data = {
            "name": "Test Branch",
            "slug": "test-branch",
        }

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/v1/branches",
                json=branch_data,
            )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["name"] == "Test Branch"
        assert "id" in data

    async def test_create_branch_slug_unique(self, mock_create_branch_use_case):
        """POST /api/branches validates slug uniqueness."""

        # Mock use case to raise SlugNotUniqueError
        async def mock_execute_with_error(_request, tenant_id):
            raise SlugNotUniqueError("test-branch", tenant_id)

        mock_create_branch_use_case.execute = mock_execute_with_error

        branch_data = {
            "name": "Test Branch",
            "slug": "test-branch",
        }

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/v1/branches",
                json=branch_data,
            )

        assert response.status_code == status.HTTP_409_CONFLICT
        assert "slug" in response.json()["detail"].lower()

    async def test_get_branch_by_id(self):
        """GET /api/branches/{id} retrieves branch by ID."""
        branch_id = uuid4()

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(f"/api/v1/branches/{branch_id}")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == str(branch_id)
        assert data["name"] == "Test Branch"

    async def test_get_branch_invalid_uuid(self):
        """GET /api/branches/{id} returns 400 for invalid UUID."""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/branches/invalid-uuid")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    async def test_list_branches(self):
        """GET /api/branches lists branches with pagination."""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/branches")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "items" in data
        assert "total" in data
