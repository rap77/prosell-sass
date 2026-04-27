"""
Integration tests for User-Dealer assignment API endpoints.

Tests cover:
- DTO validation
- Use case behavior
- Router endpoints
- Role-based access control
"""

from datetime import UTC, datetime
from unittest.mock import AsyncMock, Mock
from uuid import uuid4

import pytest
from pydantic import ValidationError

from prosell.application.dto.user_dealer import (
    AssignDealerRequest,
    BulkAssignRequest,
    UserDealerListResponse,
    UserDealerResponse,
)
from prosell.application.use_cases.user_dealer.assign_user_dealer import (
    AssignUserDealerUseCase,
)
from prosell.application.use_cases.user_dealer.bulk_assign import BulkAssignUseCase
from prosell.application.use_cases.user_dealer.remove_user_dealer import (
    RemoveUserDealerUseCase,
)
from prosell.domain.entities.user import User
from prosell.domain.entities.user_dealer import UserDealer
from prosell.domain.exceptions.dealer_exceptions import DealerNotFoundError
from prosell.domain.exceptions.user_dealer_exceptions import (
    UserDealerAlreadyAssignedError,
)

# =============================================================================
# DTO TESTS
# =============================================================================


def test_user_dealer_dtos() -> None:
    """Test 1-4: UserDealer DTOs validate correctly."""

    # Test 1: AssignDealerRequest validates dealer_id field
    dealer_id = uuid4()
    request = AssignDealerRequest(dealer_id=dealer_id)
    assert request.dealer_id == dealer_id

    # Test 2: BulkAssignRequest validates user_ids and dealer_ids arrays
    user_ids = [uuid4(), uuid4()]
    dealer_ids = [uuid4(), uuid4()]
    bulk_request = BulkAssignRequest(user_ids=user_ids, dealer_ids=dealer_ids)
    assert bulk_request.user_ids == user_ids
    assert bulk_request.dealer_ids == dealer_ids

    # Test 3: UserDealerResponse includes user_id, dealer_id, assigned_at, assigned_by
    now = datetime.now(UTC)
    response = UserDealerResponse(
        id=uuid4(),
        user_id=uuid4(),
        dealer_id=uuid4(),
        tenant_id=uuid4(),
        assigned_at=now,
        assigned_by=uuid4(),
    )
    assert response.user_id is not None
    assert response.dealer_id is not None
    assert response.assigned_at == now
    assert response.assigned_by is not None

    # Test 4: UserDealerListResponse includes items array
    list_response = UserDealerListResponse(
        items=[
            UserDealerResponse(
                id=uuid4(),
                user_id=uuid4(),
                dealer_id=uuid4(),
                tenant_id=uuid4(),
                assigned_at=now,
                assigned_by=uuid4(),
            )
        ],
        total=1,
    )
    assert len(list_response.items) == 1
    assert list_response.total == 1


def test_bulk_assign_request_validation_empty_lists() -> None:
    """Test BulkAssignRequest rejects empty lists."""
    with pytest.raises(ValidationError):
        BulkAssignRequest(user_ids=[], dealer_ids=[uuid4()])

    with pytest.raises(ValidationError):
        BulkAssignRequest(user_ids=[uuid4()], dealer_ids=[])


# =============================================================================
# USE CASE TESTS
# =============================================================================


@pytest.mark.asyncio
async def test_assign_user_dealer_usecase(
    mock_user_dealer_repo,
    mock_dealer_repo,
) -> None:
    """Test AssignUserDealerUseCase assigns dealer to user via repository."""
    # Arrange
    user_id = uuid4()
    dealer_id = uuid4()
    tenant_id = uuid4()
    assigned_by = uuid4()
    request = AssignDealerRequest(dealer_id=dealer_id)

    # Act
    use_case = AssignUserDealerUseCase(
        user_dealer_repository=mock_user_dealer_repo,
        dealer_repository=mock_dealer_repo,
    )
    response = await use_case.execute(
        user_id=user_id,
        request=request,
        tenant_id=tenant_id,
        assigned_by=assigned_by,
    )

    # Assert
    assert response.user_id == user_id
    assert response.dealer_id == dealer_id
    assert response.tenant_id == tenant_id
    assert response.assigned_by == assigned_by
    assert isinstance(response.assigned_at, datetime)


@pytest.mark.asyncio
async def test_assign_user_dealer_audit_fields(
    mock_user_dealer_repo,
    mock_dealer_repo,
) -> None:
    """Test AssignUserDealerUseCase populates audit fields."""
    # Arrange
    user_id = uuid4()
    dealer_id = uuid4()
    tenant_id = uuid4()
    assigned_by = uuid4()
    request = AssignDealerRequest(dealer_id=dealer_id)

    # Act
    use_case = AssignUserDealerUseCase(
        user_dealer_repository=mock_user_dealer_repo,
        dealer_repository=mock_dealer_repo,
    )
    before = datetime.now(UTC)
    response = await use_case.execute(
        user_id=user_id,
        request=request,
        tenant_id=tenant_id,
        assigned_by=assigned_by,
    )
    after = datetime.now(UTC)

    # Assert
    assert response.assigned_by == assigned_by
    assert before <= response.assigned_at <= after


@pytest.mark.asyncio
async def test_assign_user_dealer_duplicate(
    mock_user_dealer_repo,
    mock_dealer_repo,
) -> None:
    """Test AssignUserDealerUseCase raises error for duplicate assignment."""
    # Arrange
    user_id = uuid4()
    dealer_id = uuid4()
    tenant_id = uuid4()
    assigned_by = uuid4()
    request = AssignDealerRequest(dealer_id=dealer_id)

    # Make repo return True for exists
    async def mock_exists(user_id, dealer_id, tenant_id):  # noqa: ARG001
        return True

    mock_user_dealer_repo.exists = mock_exists

    # Act & Assert
    use_case = AssignUserDealerUseCase(
        user_dealer_repository=mock_user_dealer_repo,
        dealer_repository=mock_dealer_repo,
    )
    with pytest.raises(UserDealerAlreadyAssignedError):
        await use_case.execute(
            user_id=user_id,
            request=request,
            tenant_id=tenant_id,
            assigned_by=assigned_by,
        )


@pytest.mark.asyncio
async def test_assign_user_dealer_response(
    mock_user_dealer_repo,
    mock_dealer_repo,
) -> None:
    """Test AssignUserDealerUseCase returns UserDealerResponse."""
    # Arrange
    user_id = uuid4()
    dealer_id = uuid4()
    tenant_id = uuid4()
    assigned_by = uuid4()
    request = AssignDealerRequest(dealer_id=dealer_id)

    # Act
    use_case = AssignUserDealerUseCase(
        user_dealer_repository=mock_user_dealer_repo,
        dealer_repository=mock_dealer_repo,
    )
    response = await use_case.execute(
        user_id=user_id,
        request=request,
        tenant_id=tenant_id,
        assigned_by=assigned_by,
    )

    # Assert
    assert isinstance(response, UserDealerResponse)
    assert response.id is not None
    assert response.user_id == user_id
    assert response.dealer_id == dealer_id


@pytest.mark.asyncio
async def test_assign_user_dealer_dealer_not_found(
    mock_user_dealer_repo,
    mock_dealer_repo,
) -> None:
    """Test AssignUserDealerUseCase raises error when dealer not found."""
    # Arrange
    user_id = uuid4()
    dealer_id = uuid4()
    tenant_id = uuid4()
    assigned_by = uuid4()
    request = AssignDealerRequest(dealer_id=dealer_id)

    # Make repo return None for dealer
    async def mock_get_by_id(dealer_id, tenant_id):  # noqa: ARG001
        return None

    mock_dealer_repo.get_by_id = mock_get_by_id

    # Act & Assert
    use_case = AssignUserDealerUseCase(
        user_dealer_repository=mock_user_dealer_repo,
        dealer_repository=mock_dealer_repo,
    )
    with pytest.raises(DealerNotFoundError):
        await use_case.execute(
            user_id=user_id,
            request=request,
            tenant_id=tenant_id,
            assigned_by=assigned_by,
        )


@pytest.mark.asyncio
async def test_bulk_assign_usecase(mock_user_dealer_repo) -> None:
    """Test BulkAssignUseCase assigns multiple users to multiple dealers."""
    # Arrange
    user_ids = [uuid4(), uuid4()]
    dealer_ids = [uuid4(), uuid4()]
    tenant_id = uuid4()
    assigned_by = uuid4()
    request = BulkAssignRequest(user_ids=user_ids, dealer_ids=dealer_ids)

    # Act
    use_case = BulkAssignUseCase(user_dealer_repository=mock_user_dealer_repo)
    result = await use_case.execute(
        request=request,
        tenant_id=tenant_id,
        assigned_by=assigned_by,
    )

    # Assert
    assert "assigned_count" in result
    assert result["assigned_count"] == 4  # 2 users x 2 dealers


@pytest.mark.asyncio
async def test_bulk_assign_usecase_skips_duplicates(
    mock_user_dealer_repo,
) -> None:
    """Test BulkAssignUseCase skips duplicate assignments."""
    # Arrange
    user_ids = [uuid4()]
    dealer_ids = [uuid4()]
    tenant_id = uuid4()
    assigned_by = uuid4()
    request = BulkAssignRequest(user_ids=user_ids, dealer_ids=dealer_ids)

    # Make repo return True for exists (already assigned)
    async def mock_exists(user_id, dealer_id, tenant_id):  # noqa: ARG001
        return True

    mock_user_dealer_repo.exists = mock_exists

    # Act
    use_case = BulkAssignUseCase(user_dealer_repository=mock_user_dealer_repo)
    result = await use_case.execute(
        request=request,
        tenant_id=tenant_id,
        assigned_by=assigned_by,
    )

    # Assert
    assert result["assigned_count"] == 0  # All skipped


@pytest.mark.asyncio
async def test_remove_user_dealer_usecase(mock_user_dealer_repo) -> None:
    """Test RemoveUserDealerUseCase deletes assignment."""
    # Arrange
    user_id = uuid4()
    dealer_id = uuid4()
    tenant_id = uuid4()

    # Act
    use_case = RemoveUserDealerUseCase(user_dealer_repository=mock_user_dealer_repo)
    await use_case.execute(
        user_id=user_id,
        dealer_id=dealer_id,
        tenant_id=tenant_id,
    )

    # Assert - no exception raised
    assert True


@pytest.mark.asyncio
async def test_remove_user_dealer_usecase_idempotent(
    mock_user_dealer_repo,
) -> None:
    """Test RemoveUserDealerUseCase is idempotent (no error if already removed)."""
    # Arrange
    user_id = uuid4()
    dealer_id = uuid4()
    tenant_id = uuid4()

    # Make repo return False (already removed)
    async def mock_remove(user_id, dealer_id, tenant_id):  # noqa: ARG001
        return False

    mock_user_dealer_repo.remove = mock_remove

    # Act & Assert - no exception raised
    use_case = RemoveUserDealerUseCase(user_dealer_repository=mock_user_dealer_repo)
    await use_case.execute(
        user_id=user_id,
        dealer_id=dealer_id,
        tenant_id=tenant_id,
    )
    assert True


# =============================================================================
# ROUTER ENDPOINT TESTS
# =============================================================================


def postgres_is_available() -> bool:
    """Check if PostgreSQL is available for integration tests."""
    import os

    # Default to False - these tests require real DB connection
    # Set POSTGRES_AVAILABLE=true to enable these tests
    return os.getenv("POSTGRES_AVAILABLE", "false").lower() == "true"


async def test_assign_seller_to_dealer() -> None:
    """POST /api/users/{id}/dealers assigns dealer (201)."""
    from fastapi import status
    from httpx import ASGITransport, AsyncClient

    from prosell.domain.entities.dealer import Dealer
    from prosell.domain.entities.role import Role, RoleType
    from prosell.domain.entities.user_dealer import UserDealer
    from prosell.infrastructure.api.main import app

    # Arrange
    user_id = uuid4()
    dealer_id = uuid4()
    tenant_id = uuid4()
    assigned_by = uuid4()

    admin_user = User(
        id=assigned_by,
        email="admin@example.com",
        full_name="Admin User",
        tenant_id=tenant_id,
        is_active=True,
        email_verified=True,
    )
    admin_role = Role.create_system_role(RoleType.ADMIN)
    admin_user.roles = [admin_role]

    mock_dealer = Dealer(
        id=dealer_id,
        tenant_id=tenant_id,
        name="Test Dealer",
        slug="test-dealer",
    )

    mock_user_dealer_repo = AsyncMock()
    mock_user_dealer_repo.exists = AsyncMock(return_value=False)
    mock_user_dealer_repo.assign = AsyncMock(
        return_value=UserDealer.assign(
            user_id=user_id,
            dealer_id=dealer_id,
            tenant_id=tenant_id,
            assigned_by=assigned_by,
        )
    )

    mock_dealer_repo = AsyncMock()
    mock_dealer_repo.get_by_id = AsyncMock(return_value=mock_dealer)

    # Set up dependencies
    from prosell.infrastructure.api.dependencies import (
        get_assign_user_dealer_use_case,
        get_current_auth_user_from_cookie,
        get_user_dealer_repository,
    )

    # Mock auth user with admin role - use Mock to avoid DB connection issues
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

    # Mock use case
    mock_use_case = AsyncMock()
    mock_use_case.execute = AsyncMock(
        return_value=UserDealerResponse(
            id=uuid4(),
            user_id=user_id,
            dealer_id=dealer_id,
            tenant_id=tenant_id,
            assigned_at=datetime.now(UTC),
            assigned_by=assigned_by,
        )
    )
    app.dependency_overrides[get_current_auth_user_from_cookie] = get_mock_user
    app.dependency_overrides[get_assign_user_dealer_use_case] = lambda: mock_use_case

    try:
        # Act
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                f"/api/users/{user_id}/dealers",
                json={"dealer_id": str(dealer_id)},
            )

        # Assert
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["user_id"] == str(user_id)
        assert data["dealer_id"] == str(dealer_id)
    finally:
        app.dependency_overrides.clear()


async def test_bulk_assign_sellers() -> None:
    """POST /api/users/bulk-assign assigns multiple (200)."""
    from fastapi import status
    from httpx import ASGITransport, AsyncClient

    from prosell.domain.entities.role import Role, RoleType
    from prosell.infrastructure.api.main import app

    # Arrange
    tenant_id = uuid4()
    assigned_by = uuid4()
    user_ids = [uuid4(), uuid4()]
    dealer_ids = [uuid4(), uuid4()]

    admin_user = User(
        id=assigned_by,
        email="admin@example.com",
        full_name="Admin User",
        tenant_id=tenant_id,
        is_active=True,
        email_verified=True,
    )
    admin_role = Role.create_system_role(RoleType.ADMIN)
    admin_user.roles = [admin_role]

    # Set up dependencies
    from prosell.infrastructure.api.dependencies import (
        get_bulk_assign_use_case,
        get_current_auth_user_from_cookie,
    )

    # Mock auth user with admin role - use Mock to avoid DB connection issues
    async def get_mock_user():
        mock_user = Mock(spec=User)
        mock_user.id = admin_user.id
        mock_user.email = admin_user.email
        mock_user.full_name = admin_user.full_name
        mock_user.tenant_id = admin_user.tenant_id
        mock_user.is_active = True
        mock_user.email_verified = True
        mock_user.roles = []
        mock_user.has_role = Mock(return_value=True)
        return mock_user

    app.dependency_overrides[get_current_auth_user_from_cookie] = get_mock_user

    # Mock use case
    mock_use_case = AsyncMock()
    mock_use_case.execute = AsyncMock(return_value={"assigned_count": 4})
    app.dependency_overrides[get_bulk_assign_use_case] = lambda: mock_use_case

    try:
        # Act
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/users/bulk-assign",
                json={
                    "user_ids": [str(uid) for uid in user_ids],
                    "dealer_ids": [str(did) for did in dealer_ids],
                },
            )

        # Assert
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["assigned_count"] == 4
    finally:
        app.dependency_overrides.clear()


async def test_remove_seller_from_dealer() -> None:
    """DELETE /api/users/{id}/dealers/{dealer_id} removes (204)."""
    from fastapi import status
    from httpx import ASGITransport, AsyncClient

    from prosell.domain.entities.role import Role, RoleType
    from prosell.infrastructure.api.main import app

    # Arrange
    user_id = uuid4()
    dealer_id = uuid4()
    tenant_id = uuid4()

    admin_user = User(
        id=uuid4(),
        email="admin@example.com",
        full_name="Admin User",
        tenant_id=tenant_id,
        is_active=True,
        email_verified=True,
    )
    admin_role = Role.create_system_role(RoleType.ADMIN)
    admin_user.roles = [admin_role]

    # Set up dependencies
    from prosell.infrastructure.api.dependencies import (
        get_current_auth_user_from_cookie,
        get_remove_user_dealer_use_case,
    )

    # Mock auth user with admin role - use Mock to avoid DB connection issues
    async def get_mock_user():
        mock_user = Mock(spec=User)
        mock_user.id = admin_user.id
        mock_user.email = admin_user.email
        mock_user.full_name = admin_user.full_name
        mock_user.tenant_id = admin_user.tenant_id
        mock_user.is_active = True
        mock_user.email_verified = True
        mock_user.roles = []
        mock_user.has_role = Mock(return_value=True)
        return mock_user

    app.dependency_overrides[get_current_auth_user_from_cookie] = get_mock_user

    # Mock use case
    mock_use_case = AsyncMock()
    mock_use_case.execute = AsyncMock(return_value=None)
    app.dependency_overrides[get_remove_user_dealer_use_case] = lambda: mock_use_case

    try:
        # Act
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.delete(
                f"/api/users/{user_id}/dealers/{dealer_id}",
            )

        # Assert
        assert response.status_code == status.HTTP_204_NO_CONTENT
    finally:
        app.dependency_overrides.clear()


async def test_list_user_dealers() -> None:
    """GET /api/users/{id}/dealers lists assignments (200)."""
    from fastapi import status
    from httpx import ASGITransport, AsyncClient

    from prosell.domain.entities.role import Role, RoleType
    from prosell.infrastructure.api.main import app

    # Arrange
    user_id = uuid4()
    dealer_id = uuid4()
    tenant_id = uuid4()

    admin_user = User(
        id=uuid4(),
        email="admin@example.com",
        full_name="Admin User",
        tenant_id=tenant_id,
        is_active=True,
        email_verified=True,
    )
    admin_role = Role.create_system_role(RoleType.ADMIN)
    admin_user.roles = [admin_role]

    # Set up dependencies
    from prosell.infrastructure.api.dependencies import (
        get_current_auth_user_from_cookie,
        get_user_dealer_repository,
    )

    # Mock auth user with admin role - use Mock to avoid DB connection issues
    async def get_mock_user():
        mock_user = Mock(spec=User)
        mock_user.id = admin_user.id
        mock_user.email = admin_user.email
        mock_user.full_name = admin_user.full_name
        mock_user.tenant_id = admin_user.tenant_id
        mock_user.is_active = True
        mock_user.email_verified = True
        mock_user.roles = []
        mock_user.has_role = Mock(return_value=True)
        return mock_user

    app.dependency_overrides[get_current_auth_user_from_cookie] = get_mock_user

    # Mock repository
    mock_repo = AsyncMock()
    mock_repo.get_user_dealer_ids = AsyncMock(return_value=[dealer_id])
    mock_repo.get_assignment = AsyncMock(
        return_value=UserDealer.assign(
            user_id=user_id,
            dealer_id=dealer_id,
            tenant_id=tenant_id,
            assigned_by=admin_user.id,
        )
    )
    app.dependency_overrides[get_user_dealer_repository] = lambda: mock_repo

    try:
        # Act
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(f"/api/users/{user_id}/dealers")

        # Assert
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] == 1
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_admin_manager_only_access() -> None:
    """Admin/Manager-only access enforced (403 for sellers)."""
    from unittest.mock import AsyncMock

    from fastapi import status
    from httpx import ASGITransport, AsyncClient

    from prosell.domain.entities.role import Role, RoleType
    from prosell.infrastructure.api.main import app

    # Arrange
    user_id = uuid4()
    dealer_id = uuid4()
    tenant_id = uuid4()

    # Create seller user (not admin/manager)
    seller_user = User(
        id=uuid4(),
        email="seller@example.com",
        full_name="Seller User",
        tenant_id=tenant_id,
        is_active=True,
        email_verified=True,
    )
    seller_role = Role.create_system_role(RoleType.SALES_AGENT)
    seller_user.roles = [seller_role]

    # Set up dependencies
    from prosell.infrastructure.api.dependencies import (
        get_current_auth_user,
        get_current_auth_user_from_cookie,
    )
    from prosell.infrastructure.api.di import (
        get_assign_user_dealer_use_case,
    )

    # Mock auth user with seller role - use Mock to avoid DB connection issues
    async def get_mock_user():
        mock_user = Mock(spec=User)
        mock_user.id = seller_user.id
        mock_user.email = seller_user.email
        mock_user.full_name = seller_user.full_name
        mock_user.tenant_id = seller_user.tenant_id
        mock_user.is_active = True
        mock_user.email_verified = True
        mock_user.roles = []
        mock_user.has_role = Mock(return_value=False)  # Not admin/manager
        return mock_user

    app.dependency_overrides[get_current_auth_user] = get_mock_user
    app.dependency_overrides[get_current_auth_user_from_cookie] = get_mock_user

    # Mock use case
    mock_use_case = AsyncMock()
    app.dependency_overrides[get_assign_user_dealer_use_case] = lambda: mock_use_case

    try:
        # Act
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                f"/api/users/{user_id}/dealers",
                json={"dealer_id": str(dealer_id)},
            )

        # Assert
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "admin or manager" in response.json()["detail"].lower()
    finally:
        app.dependency_overrides.clear()


# =============================================================================
# FIXTURES
# =============================================================================


@pytest.fixture
def mock_user_dealer_repo():
    """Mock UserDealerRepository."""

    class MockUserDealerRepo:
        async def assign(self, user_id, dealer_id, tenant_id, assigned_by=None):
            return UserDealer.assign(
                user_id=user_id,
                dealer_id=dealer_id,
                tenant_id=tenant_id,
                assigned_by=assigned_by,
            )

        async def exists(self, user_id, dealer_id, tenant_id):  # noqa: ARG002
            return False

        async def remove(self, user_id, dealer_id, tenant_id):  # noqa: ARG002
            return True

    return MockUserDealerRepo()


@pytest.fixture
def mock_dealer_repo():
    """Mock DealerRepository."""

    class MockDealerRepo:
        async def get_by_id(self, dealer_id, tenant_id):
            from prosell.domain.entities.dealer import Dealer

            return Dealer(
                id=dealer_id,
                tenant_id=tenant_id,
                name="Test Dealer",
                slug="test-dealer",
            )

    return MockDealerRepo()


@pytest.fixture
def admin_role():
    """Create admin role fixture."""
    from prosell.domain.entities.role import Role, RoleType

    return Role.create_system_role(RoleType.ADMIN)


@pytest.fixture
def admin_user(admin_role):
    """Create admin user fixture."""
    user = User(
        id=uuid4(),
        email="admin@example.com",
        full_name="Admin User",
        tenant_id=uuid4(),
        is_active=True,
        email_verified=True,
    )
    user.roles = [admin_role]
    return user
