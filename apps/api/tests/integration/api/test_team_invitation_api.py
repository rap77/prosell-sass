"""Integration tests for Team Invitation API endpoints."""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi import status
from httpx import ASGITransport, AsyncClient

from prosell.domain.entities.organization import Organization
from prosell.domain.entities.role import Role, RoleType
from prosell.domain.entities.team import Team
from prosell.domain.entities.user import User
from prosell.infrastructure.api.dependencies import get_email_service
from prosell.infrastructure.api.main import app


# =============================================================================
# FIXTURES
# =============================================================================


@pytest.fixture
def mock_auth_user() -> User:
    """Mock authenticated user."""
    return User(
        id=uuid4(),
        email="test@example.com",
        full_name="Test User",
        tenant_id=uuid4(),
        is_active=True,
        email_verified=True,
    )


@pytest.fixture(autouse=True)
def auto_mock_auth(mock_auth_user):
    """Automatically mock auth for all tests."""
    from prosell.infrastructure.api.dependencies import (
        get_current_auth_user_from_cookie,
    )

    app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: mock_auth_user

    yield

    # Clean up after each test
    app.dependency_overrides.clear()


@pytest.fixture
def mock_role_repo_admin():
    """Mock role repository returning ADMIN role."""
    role = Role.create_system_role(RoleType.ADMIN)
    repo = MagicMock()
    repo.get_user_roles = AsyncMock(return_value=[role])
    return repo


@pytest.fixture
def with_admin_role(mock_role_repo_admin):
    """Override get_role_repository with ADMIN for RBAC-gated endpoints."""
    from prosell.infrastructure.api.dependencies import get_role_repository

    app.dependency_overrides[get_role_repository] = lambda: mock_role_repo_admin


@pytest.fixture
def mock_team_repo():
    """Mock team repository."""
    repo = MagicMock()
    repo.get_by_id = AsyncMock(return_value=None)
    repo.create = AsyncMock()
    repo.update = AsyncMock()
    return repo


@pytest.fixture
def mock_team_member_repo():
    """Mock team member repository."""
    from prosell.domain.entities.team import TeamMember, TeamMemberRole

    repo = MagicMock()
    repo.get_by_team = AsyncMock(return_value=[])
    repo.create = AsyncMock(
        return_value=TeamMember(
            id=uuid4(),
            team_id=uuid4(),
            user_id=uuid4(),
            role=TeamMemberRole.VENDOR,
            tenant_id=uuid4(),
        )
    )
    return repo


@pytest.fixture
def mock_invitation_repo():
    """Mock team invitation repository."""
    from datetime import UTC, datetime, timedelta
    from uuid import uuid4

    from prosell.domain.entities.team_invitation import TeamInvitation, TeamInvitationStatus

    repo = MagicMock()
    repo.get_pending_by_team_and_email = AsyncMock(return_value=None)
    repo.create = AsyncMock()
    repo.get_by_token = AsyncMock(return_value=None)
    repo.update = AsyncMock()

    # Sample invitation for testing
    invitation = TeamInvitation(
        id=uuid4(),
        team_id=uuid4(),
        email="test@example.com",
        role="vendor",
        token="a" * 64,  # SHA256 hash
        expires_at=datetime.now(UTC) + timedelta(days=7),
        status=TeamInvitationStatus.PENDING,
        tenant_id=uuid4(),
    )
    repo.get_by_token = AsyncMock(return_value=invitation)

    return repo


@pytest.fixture
def mock_email_service():
    """Mock email service."""
    service = MagicMock()
    service.send_team_invitation = AsyncMock()
    return service


@pytest.fixture
def sample_org(mock_auth_user):
    """Sample organization for tests."""
    tenant_id = mock_auth_user.tenant_id or uuid4()
    org = Organization.create(name="Test Org", tenant_id=tenant_id)
    return org


@pytest.fixture
def sample_team(sample_org):
    """Sample team for tests."""
    team = Team.create(name="Test Team", tenant_id=sample_org.tenant_id, org_id=sample_org.id)
    return team


# =============================================================================
# TESTS: POST /teams/{team_id}/invite
# =============================================================================


@pytest.mark.asyncio
async def test_invite_team_member_success(
    with_admin_role,
    mock_team_repo,
    sample_team,
    mock_invitation_repo,
    mock_email_service,
    mock_auth_user,
):
    """Test successful team member invitation."""
    from prosell.domain.entities.team_invitation import TeamInvitation
    from prosell.infrastructure.api.routers.team_router import (
        get_team_invitation_repository,
        get_team_repository,
    )

    # Setup mocks
    mock_team_repo.get_by_id = AsyncMock(return_value=sample_team)

    invitation = TeamInvitation.create(
        team_id=sample_team.id,
        email="newmember@example.com",
        role="vendor",
        tenant_id=sample_team.tenant_id,
    )
    mock_invitation_repo.create = AsyncMock(return_value=invitation)

    # Override dependencies
    app.dependency_overrides[get_team_repository] = lambda: mock_team_repo  # type: ignore
    app.dependency_overrides[get_team_invitation_repository] = lambda: mock_invitation_repo  # type: ignore
    app.dependency_overrides[get_email_service] = lambda: mock_email_service  # type: ignore

    # Test request
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post(
            f"/api/v1/teams/{sample_team.id}/invite",
            json={
                "email": "newmember@example.com",
                "role": "vendor",
                "expires_in_days": 7,
            },
        )

    # Assertions
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["email"] == "newmember@example.com"
    assert data["role"] == "vendor"
    assert data["status"] == "pending"
    mock_email_service.send_team_invitation.assert_called_once()

    # Cleanup
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_invite_team_member_team_not_found(
    with_admin_role,
    mock_team_repo,
    mock_invitation_repo,
    mock_email_service,
):
    """Test inviting to non-existent team returns 404."""
    from prosell.infrastructure.api.routers.team_router import (
        get_team_invitation_repository,
        get_team_repository,
    )

    team_id = uuid4()
    mock_team_repo.get_by_id = AsyncMock(return_value=None)

    app.dependency_overrides[get_team_repository] = lambda: mock_team_repo  # type: ignore
    app.dependency_overrides[get_team_invitation_repository] = lambda: mock_invitation_repo  # type: ignore
    app.dependency_overrides[get_email_service] = lambda: mock_email_service  # type: ignore

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post(
            f"/api/v1/teams/{team_id}/invite",
            json={
                "email": "newmember@example.com",
                "role": "vendor",
            },
        )

    assert response.status_code == status.HTTP_404_NOT_FOUND
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_invite_team_member_invalid_email(
    with_admin_role,
    mock_team_repo,
    sample_team,
    mock_invitation_repo,
    mock_email_service,
):
    """Test inviting with invalid email returns 422."""
    from prosell.infrastructure.api.routers.team_router import (
        get_team_invitation_repository,
        get_team_repository,
    )

    mock_team_repo.get_by_id = AsyncMock(return_value=sample_team)

    app.dependency_overrides[get_team_repository] = lambda: mock_team_repo  # type: ignore
    app.dependency_overrides[get_team_invitation_repository] = lambda: mock_invitation_repo  # type: ignore
    app.dependency_overrides[get_email_service] = lambda: mock_email_service  # type: ignore

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post(
            f"/api/v1/teams/{sample_team.id}/invite",
            json={
                "email": "not-an-email",
                "role": "vendor",
            },
        )

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    app.dependency_overrides.clear()


# =============================================================================
# TESTS: POST /teams/accept-invitation
# =============================================================================


@pytest.mark.asyncio
async def test_accept_team_invitation_success(
    mock_team_repo,
    sample_team,
    mock_team_member_repo,
    mock_invitation_repo,
    mock_auth_user,
):
    """Test successful team invitation acceptance."""
    from prosell.infrastructure.api.routers.team_router import (
        get_team_invitation_repository,
        get_team_member_repository,
        get_team_repository,
    )

    # Setup mocks
    mock_team_repo.get_by_id = AsyncMock(return_value=sample_team)

    # Override dependencies
    app.dependency_overrides[get_team_repository] = lambda: mock_team_repo  # type: ignore
    app.dependency_overrides[get_team_invitation_repository] = lambda: mock_invitation_repo  # type: ignore
    app.dependency_overrides[get_team_member_repository] = lambda: mock_team_member_repo  # type: ignore

    # Test request
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post(
            "/api/v1/teams/accept-invitation",
            json={"token": "a" * 64},
        )

    # Assertions
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "role" in data
    mock_team_member_repo.create.assert_called_once()
    mock_invitation_repo.update.assert_called_once()

    # Cleanup
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_accept_team_invitation_invalid_token(
    mock_team_repo,
    mock_team_member_repo,
    mock_invitation_repo,
):
    """Test accepting invitation with invalid token returns 400."""
    from prosell.infrastructure.api.routers.team_router import (
        get_team_invitation_repository,
        get_team_member_repository,
        get_team_repository,
    )

    mock_invitation_repo.get_by_token = AsyncMock(return_value=None)

    app.dependency_overrides[get_team_repository] = lambda: mock_team_repo  # type: ignore
    app.dependency_overrides[get_team_invitation_repository] = lambda: mock_invitation_repo  # type: ignore
    app.dependency_overrides[get_team_member_repository] = lambda: mock_team_member_repo  # type: ignore

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post(
            "/api/v1/teams/accept-invitation",
            json={"token": "a" * 64},  # Valid length but invalid token
        )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Invalid invitation token" in response.json()["detail"]
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_accept_team_invitation_expired_token(
    mock_team_repo,
    sample_team,
    mock_team_member_repo,
    mock_invitation_repo,
):
    """Test accepting expired invitation returns 400."""
    from datetime import UTC, datetime, timedelta
    from uuid import uuid4

    from prosell.domain.entities.team_invitation import TeamInvitation, TeamInvitationStatus
    from prosell.infrastructure.api.routers.team_router import (
        get_team_invitation_repository,
        get_team_member_repository,
        get_team_repository,
    )

    # Create expired invitation
    expired_invitation = TeamInvitation(
        id=uuid4(),
        team_id=sample_team.id,
        email="test@example.com",
        role="vendor",
        token="a" * 64,
        expires_at=datetime.now(UTC) - timedelta(days=1),
        status=TeamInvitationStatus.PENDING,
        tenant_id=uuid4(),
    )
    mock_invitation_repo.get_by_token = AsyncMock(return_value=expired_invitation)
    mock_team_repo.get_by_id = AsyncMock(return_value=sample_team)

    app.dependency_overrides[get_team_repository] = lambda: mock_team_repo  # type: ignore
    app.dependency_overrides[get_team_invitation_repository] = lambda: mock_invitation_repo  # type: ignore
    app.dependency_overrides[get_team_member_repository] = lambda: mock_team_member_repo  # type: ignore

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post(
            "/api/v1/teams/accept-invitation",
            json={"token": "a" * 64},
        )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "expired" in response.json()["detail"].lower()
    app.dependency_overrides.clear()
