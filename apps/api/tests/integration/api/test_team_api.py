"""Integration test for POST /api/v1/teams.

Targeted regression for the reported bug: the frontend's `teamApi.create()`
sent `organization_id` while `CreateTeamRequest` expected `org_id`, and the
mismatch never surfaced because a Next.js mock BFF route intercepted the
request before it ever reached this backend endpoint (see
`aidlc/spaces/default/codekb/prosell-sass/architecture.md` § Interaction
Diagrams, diagram 11). This test exercises the real backend endpoint with the
now-corrected wire shape and proves it is accepted.
"""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi import status
from httpx import ASGITransport, AsyncClient

from prosell.domain.entities.team import Team
from prosell.domain.entities.user import User, UserStatus
from prosell.infrastructure.api.main import app

# =============================================================================
# FIXTURES
# =============================================================================


@pytest.fixture
def mock_auth_user() -> User:
    """Mock authenticated user with a tenant."""
    return User(
        id=uuid4(),
        email="test@example.com",
        full_name="Test User",
        tenant_id=uuid4(),
        status=UserStatus.ACTIVE,
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

    app.dependency_overrides.clear()


@pytest.fixture
def mock_team_repo():
    """Mock team repository — no database."""
    from prosell.infrastructure.api.routers.team_router import get_team_repository

    repo = MagicMock()
    repo.exists_by_name = AsyncMock(return_value=False)

    async def _create(team: Team) -> Team:
        return team

    repo.create = AsyncMock(side_effect=_create)

    app.dependency_overrides[get_team_repository] = lambda: repo
    yield repo


# =============================================================================
# TESTS: POST /api/v1/teams
# =============================================================================


@pytest.mark.asyncio
async def test_create_team_accepts_org_id_wire_shape(mock_team_repo):
    """The corrected frontend payload shape ({name, org_id}) is accepted.

    Before the fix, the frontend sent `organization_id` — this endpoint
    requires `org_id` and has no alias, so that payload would have raised a
    422 (missing required field) had it ever reached the real backend.
    """
    org_id = uuid4()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/v1/teams",
            json={"name": "Sales Team", "org_id": str(org_id)},
        )

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["org_id"] == str(org_id)
    assert data["name"] == "Sales Team"
    assert "organization_id" not in data
    mock_team_repo.create.assert_called_once()


@pytest.mark.asyncio
async def test_create_team_rejects_stale_organization_id_field(mock_team_repo):
    """The old (pre-fix) frontend field name is no longer accepted.

    Guards against a future regression reintroducing `organization_id` on the
    wire: `org_id` has no Pydantic alias, so sending only the old field name
    must fail validation.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/v1/teams",
            json={"name": "Sales Team", "organization_id": str(uuid4())},
        )

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    mock_team_repo.create.assert_not_called()
