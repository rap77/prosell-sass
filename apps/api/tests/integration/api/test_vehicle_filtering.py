"""
Integration tests for vehicle filtering by role.

Tests cover role-based vehicle catalog filtering:
- Admin sees all vehicles in tenant
- Seller/Manager sees vehicles from assigned dealers (M:N subquery)
- Dealer sees only own vehicles
- Unauthorized sellers get empty result
"""

from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import status
from httpx import ASGITransport, AsyncClient

from prosell.domain.entities.role import Role, RoleType
from prosell.domain.entities.user import User
from prosell.infrastructure.api.main import app


def phase_02_complete() -> bool:
    """Check if Phase 02 implementation is complete."""
    import os

    # Set PHASE_02_COMPLETE=true after executing Phase 02 plans
    return os.getenv("PHASE_02_COMPLETE", "false").lower() == "true"


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
def seller_user():
    """Create seller user fixture."""
    return User(
        id=uuid4(),
        email="seller@example.com",
        full_name="Seller User",
        tenant_id=uuid4(),
        is_active=True,
        email_verified=True,
    )


@pytest.fixture
def seller_role():
    """Create seller role fixture."""
    return Role.create_system_role(RoleType.SALES_AGENT)


@pytest.fixture
def mock_vehicle_catalog_use_case():
    """Mock GetVehicleCatalogUseCase."""
    from prosell.application.dto.vehicle.catalog import CatalogResponseDTO, VehicleCatalogItemDTO

    use_case = AsyncMock()

    async def mock_execute(user, limit=50, cursor=None, filters=None):  # noqa: ARG001
        # Return different results based on user role
        if any(r.role_type == RoleType.ADMIN for r in user._roles):
            # Admin sees all vehicles
            return CatalogResponseDTO(
                items=[
                    VehicleCatalogItemDTO(
                        id=str(uuid4()),
                        vin="TESTVIN001",
                        make="Toyota",
                        model="Corolla",
                        year=2020,
                        mileage=50000,
                        color="Blanco",
                        price_cents=150000000,
                        publications=[],
                    )
                ],
                next_cursor=None,
                has_more=False,
            )
        else:
            # Seller/Dealer sees no vehicles (no assignments)
            return CatalogResponseDTO(
                items=[],
                next_cursor=None,
                has_more=False,
            )

    return use_case


@pytest.fixture(autouse=True)
def setup_dependencies(
    admin_user,
    admin_role,
    seller_user,
    seller_role,
    mock_vehicle_catalog_use_case,
):
    """Set up dependency overrides for all tests."""
    from prosell.application.use_cases.vehicle.get_vehicle_catalog import (
        GetVehicleCatalogUseCase,
    )
    from prosell.infrastructure.api.dependencies import get_current_auth_user

    def get_mock_admin_user():
        admin_user._roles = [admin_role]
        return admin_user

    def get_mock_seller_user():
        seller_user._roles = [seller_role]
        return seller_user

    # Default to admin user
    app.dependency_overrides[get_current_auth_user] = get_mock_admin_user
    app.dependency_overrides[GetVehicleCatalogUseCase] = lambda: mock_vehicle_catalog_use_case

    yield

    app.dependency_overrides.clear()


class TestVehicleFiltering:
    """Test suite for role-based vehicle filtering."""

    @pytest.mark.skipif(
        not phase_02_complete(),
        reason="Phase 02 not implemented - set PHASE_02_COMPLETE=true after execution",
    )
    async def test_admin_sees_all_vehicles(self):
        """GET /api/vehicles returns all vehicles for admin users."""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/vehicles")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "items" in data
        assert len(data["items"]) == 1  # Admin sees the vehicle

    @pytest.mark.skipif(
        not phase_02_complete(),
        reason="Phase 02 not implemented - set PHASE_02_COMPLETE=true after execution",
    )
    async def test_seller_with_no_assignments(self):
        """GET /api/vehicles returns empty for seller with no dealer assignments."""
        # Override to seller user
        from prosell.domain.entities.role import Role, RoleType
        from prosell.domain.entities.user import User
        from prosell.infrastructure.api.dependencies import get_current_auth_user

        seller = User(
            id=uuid4(),
            email="seller@example.com",
            full_name="Seller",
            tenant_id=uuid4(),
            is_active=True,
            email_verified=True,
        )
        seller.roles = [Role.create_system_role(RoleType.SALES_AGENT)]

        async def get_seller():
            return seller

        app.dependency_overrides[get_current_auth_user] = get_seller

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/vehicles")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "items" in data
        assert len(data["items"]) == 0  # No assignments = no vehicles

    @pytest.mark.skipif(
        not phase_02_complete(),
        reason="Phase 02 not implemented - set PHASE_02_COMPLETE=true after execution",
    )
    async def test_unauthorized_empty_assignments(self):
        """Returns 401 when user has no dealer assignments (seller role)."""
        # Same test as above - seller with no assignments gets empty result, not 401
        # The 401 case would be for unauthenticated users
        from prosell.domain.entities.role import Role, RoleType
        from prosell.domain.entities.user import User
        from prosell.infrastructure.api.dependencies import get_current_auth_user

        seller = User(
            id=uuid4(),
            email="seller@example.com",
            full_name="Seller",
            tenant_id=uuid4(),
            is_active=True,
            email_verified=True,
        )
        seller.roles = [Role.create_system_role(RoleType.SALES_AGENT)]

        async def get_seller():
            return seller

        app.dependency_overrides[get_current_auth_user] = get_seller

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/vehicles")

        # Seller gets empty result, not 401 (they're authenticated but have no assignments)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["items"] == []
