"""
Integration tests for User-Branch assignment API endpoints.

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

from prosell.application.dto.user_branch import (
    AssignBranchRequest,
    BulkAssignRequest,
    UserBranchListResponse,
    UserBranchResponse,
)
from prosell.application.use_cases.user_branch.assign_user_branch import (
    AssignUserBranchUseCase,
)
from prosell.application.use_cases.user_branch.bulk_assign import BulkAssignUseCase
from prosell.application.use_cases.user_branch.remove_user_branch import (
    RemoveUserBranchUseCase,
)
from prosell.domain.entities.user import User
from prosell.domain.entities.user_branch import UserBranch
from prosell.domain.exceptions.branch_exceptions import BranchNotFoundError
from prosell.domain.exceptions.user_branch_exceptions import (
    UserBranchAlreadyAssignedError,
)

# =============================================================================
# DTO TESTS
# =============================================================================


def test_user_branch_dtos() -> None:
    """Test 1-4: UserBranch DTOs validate correctly."""

    # Test 1: AssignBranchRequest validates branch_id field
    branch_id = uuid4()
    request = AssignBranchRequest(branch_id=branch_id)
    assert request.branch_id == branch_id

    # Test 2: BulkAssignRequest validates user_ids and branch_ids arrays
    user_ids = [uuid4(), uuid4()]
    branch_ids = [uuid4(), uuid4()]
    bulk_request = BulkAssignRequest(user_ids=user_ids, branch_ids=branch_ids)
    assert bulk_request.user_ids == user_ids
    assert bulk_request.branch_ids == branch_ids

    # Test 3: UserBranchResponse includes user_id, branch_id, assigned_at, assigned_by
    now = datetime.now(UTC)
    response = UserBranchResponse(
        id=uuid4(),
        user_id=uuid4(),
        branch_id=uuid4(),
        tenant_id=uuid4(),
        assigned_at=now,
        assigned_by=uuid4(),
    )
    assert response.user_id is not None
    assert response.branch_id is not None
    assert response.assigned_at == now
    assert response.assigned_by is not None

    # Test 4: UserBranchListResponse includes items array
    list_response = UserBranchListResponse(
        items=[
            UserBranchResponse(
                id=uuid4(),
                user_id=uuid4(),
                branch_id=uuid4(),
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
        BulkAssignRequest(user_ids=[], branch_ids=[uuid4()])

    with pytest.raises(ValidationError):
        BulkAssignRequest(user_ids=[uuid4()], branch_ids=[])


# =============================================================================
# USE CASE TESTS
# =============================================================================


@pytest.mark.asyncio
async def test_assign_user_branch_usecase(
    mock_user_branch_repo,
    mock_branch_repo,
) -> None:
    """Test AssignUserBranchUseCase assigns branch to user via repository."""
    # Arrange
    user_id = uuid4()
    branch_id = uuid4()
    tenant_id = uuid4()
    assigned_by = uuid4()
    request = AssignBranchRequest(branch_id=branch_id)

    # Act
    use_case = AssignUserBranchUseCase(
        user_branch_repository=mock_user_branch_repo,
        branch_repository=mock_branch_repo,
    )
    response = await use_case.execute(
        user_id=user_id,
        request=request,
        tenant_id=tenant_id,
        assigned_by=assigned_by,
    )

    # Assert
    assert response.user_id == user_id
    assert response.branch_id == branch_id
    assert response.tenant_id == tenant_id
    assert response.assigned_by == assigned_by
    assert isinstance(response.assigned_at, datetime)


@pytest.mark.asyncio
async def test_assign_user_branch_audit_fields(
    mock_user_branch_repo,
    mock_branch_repo,
) -> None:
    """Test AssignUserBranchUseCase populates audit fields."""
    # Arrange
    user_id = uuid4()
    branch_id = uuid4()
    tenant_id = uuid4()
    assigned_by = uuid4()
    request = AssignBranchRequest(branch_id=branch_id)

    # Act
    use_case = AssignUserBranchUseCase(
        user_branch_repository=mock_user_branch_repo,
        branch_repository=mock_branch_repo,
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
async def test_assign_user_branch_duplicate(
    mock_user_branch_repo,
    mock_branch_repo,
) -> None:
    """Test AssignUserBranchUseCase raises error for duplicate assignment."""
    # Arrange
    user_id = uuid4()
    branch_id = uuid4()
    tenant_id = uuid4()
    assigned_by = uuid4()
    request = AssignBranchRequest(branch_id=branch_id)

    # Make repo return True for exists
    async def mock_exists(user_id, branch_id, tenant_id):  # noqa: ARG001
        return True

    mock_user_branch_repo.exists = mock_exists

    # Act & Assert
    use_case = AssignUserBranchUseCase(
        user_branch_repository=mock_user_branch_repo,
        branch_repository=mock_branch_repo,
    )
    with pytest.raises(UserBranchAlreadyAssignedError):
        await use_case.execute(
            user_id=user_id,
            request=request,
            tenant_id=tenant_id,
            assigned_by=assigned_by,
        )


@pytest.mark.asyncio
async def test_assign_user_branch_response(
    mock_user_branch_repo,
    mock_branch_repo,
) -> None:
    """Test AssignUserBranchUseCase returns UserBranchResponse."""
    # Arrange
    user_id = uuid4()
    branch_id = uuid4()
    tenant_id = uuid4()
    assigned_by = uuid4()
    request = AssignBranchRequest(branch_id=branch_id)

    # Act
    use_case = AssignUserBranchUseCase(
        user_branch_repository=mock_user_branch_repo,
        branch_repository=mock_branch_repo,
    )
    response = await use_case.execute(
        user_id=user_id,
        request=request,
        tenant_id=tenant_id,
        assigned_by=assigned_by,
    )

    # Assert
    assert isinstance(response, UserBranchResponse)
    assert response.id is not None
    assert response.user_id == user_id
    assert response.branch_id == branch_id


@pytest.mark.asyncio
async def test_assign_user_branch_branch_not_found(
    mock_user_branch_repo,
    mock_branch_repo,
) -> None:
    """Test AssignUserBranchUseCase raises error when branch not found."""
    # Arrange
    user_id = uuid4()
    branch_id = uuid4()
    tenant_id = uuid4()
    assigned_by = uuid4()
    request = AssignBranchRequest(branch_id=branch_id)

    # Make repo return None for branch
    async def mock_get_by_id(branch_id, tenant_id):  # noqa: ARG001
        return None

    mock_branch_repo.get_by_id = mock_get_by_id

    # Act & Assert
    use_case = AssignUserBranchUseCase(
        user_branch_repository=mock_user_branch_repo,
        branch_repository=mock_branch_repo,
    )
    with pytest.raises(BranchNotFoundError):
        await use_case.execute(
            user_id=user_id,
            request=request,
            tenant_id=tenant_id,
            assigned_by=assigned_by,
        )


@pytest.mark.asyncio
async def test_bulk_assign_usecase(mock_user_branch_repo) -> None:
    """Test BulkAssignUseCase assigns multiple users to multiple branches."""
    # Arrange
    user_ids = [uuid4(), uuid4()]
    branch_ids = [uuid4(), uuid4()]
    tenant_id = uuid4()
    assigned_by = uuid4()
    request = BulkAssignRequest(user_ids=user_ids, branch_ids=branch_ids)

    # Act
    use_case = BulkAssignUseCase(user_branch_repository=mock_user_branch_repo)
    result = await use_case.execute(
        request=request,
        tenant_id=tenant_id,
        assigned_by=assigned_by,
    )

    # Assert
    assert "assigned_count" in result
    assert result["assigned_count"] == 4  # 2 users x 2 branches


@pytest.mark.asyncio
async def test_bulk_assign_usecase_skips_duplicates(
    mock_user_branch_repo,
) -> None:
    """Test BulkAssignUseCase skips duplicate assignments."""
    # Arrange
    user_ids = [uuid4()]
    branch_ids = [uuid4()]
    tenant_id = uuid4()
    assigned_by = uuid4()
    request = BulkAssignRequest(user_ids=user_ids, branch_ids=branch_ids)

    # Make repo return True for exists (already assigned)
    async def mock_exists(user_id, branch_id, tenant_id):  # noqa: ARG001
        return True

    mock_user_branch_repo.exists = mock_exists

    # Act
    use_case = BulkAssignUseCase(user_branch_repository=mock_user_branch_repo)
    result = await use_case.execute(
        request=request,
        tenant_id=tenant_id,
        assigned_by=assigned_by,
    )

    # Assert
    assert result["assigned_count"] == 0  # All skipped


@pytest.mark.asyncio
async def test_remove_user_branch_usecase(mock_user_branch_repo) -> None:
    """Test RemoveUserBranchUseCase deletes assignment."""
    # Arrange
    user_id = uuid4()
    branch_id = uuid4()
    tenant_id = uuid4()

    # Act
    use_case = RemoveUserBranchUseCase(user_branch_repository=mock_user_branch_repo)
    await use_case.execute(
        user_id=user_id,
        branch_id=branch_id,
        tenant_id=tenant_id,
    )

    # Assert - no exception raised
    assert True


@pytest.mark.asyncio
async def test_remove_user_branch_usecase_idempotent(
    mock_user_branch_repo,
) -> None:
    """Test RemoveUserBranchUseCase is idempotent (no error if already removed)."""
    # Arrange
    user_id = uuid4()
    branch_id = uuid4()
    tenant_id = uuid4()

    # Make repo return False (already removed)
    async def mock_remove(user_id, branch_id, tenant_id):  # noqa: ARG001
        return False

    mock_user_branch_repo.remove = mock_remove

    # Act & Assert - no exception raised
    use_case = RemoveUserBranchUseCase(user_branch_repository=mock_user_branch_repo)
    await use_case.execute(
        user_id=user_id,
        branch_id=branch_id,
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


async def test_assign_seller_to_branch() -> None:
    """POST /api/users/{id}/branches assigns branch (201)."""
    from fastapi import status
    from httpx import ASGITransport, AsyncClient

    from prosell.domain.entities.branch import Branch
    from prosell.domain.entities.role import Role, RoleType
    from prosell.domain.entities.user_branch import UserBranch
    from prosell.infrastructure.api.main import app

    # Arrange
    user_id = uuid4()
    branch_id = uuid4()
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

    mock_branch = Branch(
        id=branch_id,
        tenant_id=tenant_id,
        name="Test Branch",
        slug="test-branch",
    )

    mock_user_branch_repo = AsyncMock()
    mock_user_branch_repo.exists = AsyncMock(return_value=False)
    mock_user_branch_repo.assign = AsyncMock(
        return_value=UserBranch.assign(
            user_id=user_id,
            branch_id=branch_id,
            tenant_id=tenant_id,
            assigned_by=assigned_by,
        )
    )

    mock_branch_repo = AsyncMock()
    mock_branch_repo.get_by_id = AsyncMock(return_value=mock_branch)

    # Set up dependencies
    from prosell.infrastructure.api.dependencies import (
        get_assign_user_branch_use_case,
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
        mock_user.roles = []  # For debug code in router
        mock_user.has_role = Mock(return_value=True)  # Always True for admin tests
        return mock_user

    # Mock use case
    mock_use_case = AsyncMock()
    mock_use_case.execute = AsyncMock(
        return_value=UserBranchResponse(
            id=uuid4(),
            user_id=user_id,
            branch_id=branch_id,
            tenant_id=tenant_id,
            assigned_at=datetime.now(UTC),
            assigned_by=assigned_by,
        )
    )
    app.dependency_overrides[get_current_auth_user_from_cookie] = get_mock_user
    app.dependency_overrides[get_assign_user_branch_use_case] = lambda: mock_use_case

    try:
        # Act
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                f"/api/users/{user_id}/branches",
                json={"branch_id": str(branch_id)},
            )

        # Assert
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["user_id"] == str(user_id)
        assert data["branch_id"] == str(branch_id)
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
    branch_ids = [uuid4(), uuid4()]

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
                    "branch_ids": [str(did) for did in branch_ids],
                },
            )

        # Assert
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["assigned_count"] == 4
    finally:
        app.dependency_overrides.clear()


async def test_remove_seller_from_branch() -> None:
    """DELETE /api/users/{id}/branches/{branch_id} removes (204)."""
    from fastapi import status
    from httpx import ASGITransport, AsyncClient

    from prosell.domain.entities.role import Role, RoleType
    from prosell.infrastructure.api.main import app

    # Arrange
    user_id = uuid4()
    branch_id = uuid4()
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
        get_remove_user_branch_use_case,
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
    app.dependency_overrides[get_remove_user_branch_use_case] = lambda: mock_use_case

    try:
        # Act
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.delete(
                f"/api/users/{user_id}/branches/{branch_id}",
            )

        # Assert
        assert response.status_code == status.HTTP_204_NO_CONTENT
    finally:
        app.dependency_overrides.clear()


async def test_list_user_branches() -> None:
    """GET /api/users/{id}/branches lists assignments (200)."""
    from fastapi import status
    from httpx import ASGITransport, AsyncClient

    from prosell.domain.entities.role import Role, RoleType
    from prosell.infrastructure.api.main import app

    # Arrange
    user_id = uuid4()
    branch_id = uuid4()
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
        get_user_branch_repository,
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
    mock_repo.get_user_branch_ids = AsyncMock(return_value=[branch_id])
    mock_repo.get_assignment = AsyncMock(
        return_value=UserBranch.assign(
            user_id=user_id,
            branch_id=branch_id,
            tenant_id=tenant_id,
            assigned_by=admin_user.id,
        )
    )
    app.dependency_overrides[get_user_branch_repository] = lambda: mock_repo

    try:
        # Act
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(f"/api/users/{user_id}/branches")

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
    branch_id = uuid4()
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
        get_assign_user_branch_use_case,
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
    app.dependency_overrides[get_assign_user_branch_use_case] = lambda: mock_use_case

    try:
        # Act
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                f"/api/users/{user_id}/branches",
                json={"branch_id": str(branch_id)},
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
def mock_user_branch_repo():
    """Mock UserBranchRepository."""

    class MockUserBranchRepo:
        async def assign(self, user_id, branch_id, tenant_id, assigned_by=None):
            return UserBranch.assign(
                user_id=user_id,
                branch_id=branch_id,
                tenant_id=tenant_id,
                assigned_by=assigned_by,
            )

        async def exists(self, user_id, branch_id, tenant_id):  # noqa: ARG002
            return False

        async def remove(self, user_id, branch_id, tenant_id):  # noqa: ARG002
            return True

    return MockUserBranchRepo()


@pytest.fixture
def mock_branch_repo():
    """Mock BranchRepository."""

    class MockBranchRepo:
        async def get_by_id(self, branch_id, tenant_id):
            from prosell.domain.entities.branch import Branch

            return Branch(
                id=branch_id,
                tenant_id=tenant_id,
                name="Test Branch",
                slug="test-branch",
            )

    return MockBranchRepo()


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
