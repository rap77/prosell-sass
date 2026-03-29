"""Integration tests for Dealer API endpoints."""

from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import status
from httpx import ASGITransport, AsyncClient

from prosell.domain.entities.dealer import Dealer
from prosell.domain.entities.role import Role, RoleType
from prosell.domain.entities.user import User
from prosell.domain.exceptions.dealer_exceptions import SlugNotUniqueError
from prosell.infrastructure.api.main import app


@pytest.fixture
def admin_user():
    """Create admin user fixture."""
    return User(
        id=uuid4(),
        email="admin@example.com",
        full_name="Admin User",
        tenant_id=uuid4(),
        is_active=True,
        email_verified=True,
    )


@pytest.fixture
def admin_role():
    """Create admin role fixture."""
    return Role.create_system_role(RoleType.ADMIN)


@pytest.fixture
def mock_dealer_repo():
    """Mock dealer repository."""
    repo = AsyncMock()

    # Mock get_by_id to return a dealer
    async def mock_get_by_id(dealer_id, tenant_id):
        return Dealer(
            id=dealer_id,
            tenant_id=tenant_id,
            name="Test Dealer",
            slug="test-dealer",
        )

    repo.get_by_id = mock_get_by_id
    return repo


@pytest.fixture
def mock_create_dealer_use_case(admin_user):
    """Mock CreateDealerUseCase."""
    use_case = AsyncMock()

    async def mock_execute(request, tenant_id):
        return Dealer(
            id=uuid4(),
            tenant_id=tenant_id,
            name=request.name,
            slug=request.name.lower().replace(" ", "-"),
        )

    use_case.execute = mock_execute
    return use_case


@pytest.fixture
def mock_get_dealer_use_case():
    """Mock GetDealerUseCase."""
    use_case = AsyncMock()

    async def mock_execute(dealer_id, tenant_id):
        return Dealer(
            id=dealer_id,
            tenant_id=tenant_id,
            name="Test Dealer",
            slug="test-dealer",
        )

    use_case.execute = mock_execute
    return use_case


@pytest.fixture
def mock_list_dealers_use_case():
    """Mock ListDealersUseCase."""
    from datetime import datetime, UTC
    from prosell.application.dto.dealer import DealerListResponse, DealerResponse

    use_case = AsyncMock()

    async def mock_execute(tenant_id, limit, offset):
        return DealerListResponse(
            items=[
                DealerResponse(
                    id=str(uuid4()),
                    tenant_id=str(tenant_id),
                    name="Test Dealer",
                    slug="test-dealer",
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
    admin_role,
    mock_dealer_repo,
    mock_create_dealer_use_case,
    mock_get_dealer_use_case,
    mock_list_dealers_use_case,
):
    """Set up dependency overrides for all tests."""
    from prosell.infrastructure.api.dependencies import get_current_auth_user
    from prosell.infrastructure.api.di import (
        get_create_dealer_use_case,
        get_get_dealer_use_case,
        get_list_dealers_use_case,
    )

    # Mock auth user with admin role
    async def get_mock_user():
        # Attach role to user
        admin_user._roles = [admin_role]
        return admin_user

    app.dependency_overrides[get_current_auth_user] = get_mock_user
    app.dependency_overrides[get_create_dealer_use_case] = lambda: mock_create_dealer_use_case
    app.dependency_overrides[get_get_dealer_use_case] = lambda: mock_get_dealer_use_case
    app.dependency_overrides[get_list_dealers_use_case] = lambda: mock_list_dealers_use_case

    yield

    app.dependency_overrides.clear()


class TestDealerEndpoints:
    """Test suite for Dealer API endpoints."""

    async def test_create_dealer_admin(self):
        """POST /api/dealers creates dealer for admin users."""
        dealer_data = {
            "name": "Test Dealer",
            "slug": "test-dealer",
        }

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/v1/dealers",
                json=dealer_data,
            )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["name"] == "Test Dealer"
        assert "id" in data

    async def test_create_dealer_slug_unique(self, mock_create_dealer_use_case):
        """POST /api/dealers validates slug uniqueness."""
        # Mock use case to raise SlugNotUniqueError
        async def mock_execute_with_error(request, tenant_id):
            raise SlugNotUniqueError("test-dealer")

        mock_create_dealer_use_case.execute = mock_execute_with_error

        dealer_data = {
            "name": "Test Dealer",
            "slug": "test-dealer",
        }

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/v1/dealers",
                json=dealer_data,
            )

        assert response.status_code == status.HTTP_409_CONFLICT
        assert "slug" in response.json()["detail"].lower()

    async def test_get_dealer_by_id(self):
        """GET /api/dealers/{id} retrieves dealer by ID."""
        dealer_id = uuid4()

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(f"/api/v1/dealers/{dealer_id}")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == str(dealer_id)
        assert data["name"] == "Test Dealer"

    async def test_get_dealer_invalid_uuid(self):
        """GET /api/dealers/{id} returns 400 for invalid UUID."""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/dealers/invalid-uuid")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    async def test_list_dealers(self):
        """GET /api/dealers lists dealers with pagination."""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/dealers")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "items" in data
        assert "total" in data
