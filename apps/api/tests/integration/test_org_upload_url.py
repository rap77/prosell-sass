"""Tests for organization upload URL endpoint."""

from collections.abc import Generator
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi import status
from httpx import ASGITransport, AsyncClient

from prosell.domain.entities.role import Role, RoleType
from prosell.domain.entities.user import User, UserStatus
from prosell.infrastructure.api.main import app


@pytest.fixture
def mock_auth_user() -> User:
    return User(
        id=uuid4(),
        email="test@example.com",
        full_name="Test User",
        tenant_id=uuid4(),
        status=UserStatus.ACTIVE,
        email_verified=True,
    )


@pytest.fixture
def mock_role_repo() -> MagicMock:
    role = Role.create_system_role(RoleType.SUPER_ADMIN)
    repo = MagicMock()
    repo.get_user_roles = AsyncMock(return_value=[role])
    return repo


@pytest.fixture
def mock_spaces() -> MagicMock:
    spaces = MagicMock()
    spaces.generate_presigned_url = AsyncMock(
        return_value={
            "upload_url": "https://region.digitaloceanspaces.com/put-signed-url",
            "public_url": "https://region.digitaloceanspaces.com/bucket/orgs/123/logo/uuid.jpg",
            "key": "orgs/123/logo/uuid.jpg",
            "max_size_bytes": 2_000_000,
        }
    )
    return spaces


@pytest.fixture
def mock_org_repo() -> MagicMock:
    from prosell.domain.entities.organization import Organization

    org = Organization.create(name="Test Org", tenant_id=uuid4())
    repo = MagicMock()
    repo.get_by_id = AsyncMock(return_value=org)
    return repo


@pytest.fixture(autouse=True)
def setup_auth(
    mock_auth_user: User,
    mock_role_repo: MagicMock,
    mock_spaces: MagicMock,
    mock_org_repo: MagicMock,
) -> Generator[None]:
    from prosell.infrastructure.api.dependencies import (
        get_current_auth_user,
        get_current_auth_user_from_cookie,
        get_role_repository,
        get_spaces_service,
    )
    from prosell.infrastructure.api.routers.org_router import get_org_repository

    app.dependency_overrides[get_current_auth_user] = lambda: mock_auth_user
    app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: mock_auth_user
    app.dependency_overrides[get_role_repository] = lambda: mock_role_repo
    app.dependency_overrides[get_spaces_service] = lambda: mock_spaces
    app.dependency_overrides[get_org_repository] = lambda: mock_org_repo
    yield
    app.dependency_overrides.clear()


class TestOrgUploadUrl:
    async def test_generate_logo_upload_url(self):
        """Returns presigned URL for logo upload."""
        org_id = uuid4()

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                f"/api/v1/org/{org_id}/upload-url",
                json={"file_type": "logo", "content_type": "image/jpeg"},
            )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "upload_url" in data
        assert "public_url" in data
        assert "key" in data
        assert "max_size_bytes" in data

    async def test_generate_banner_upload_url(self):
        """Returns presigned URL for banner upload."""
        org_id = uuid4()

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                f"/api/v1/org/{org_id}/upload-url",
                json={"file_type": "banner", "content_type": "image/png"},
            )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "upload_url" in data

    async def test_logo_generates_logo_path(self, mock_spaces):
        """Calls generate_presigned_url with logo path when file_type=logo."""
        org_id = uuid4()

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            await client.post(
                f"/api/v1/org/{org_id}/upload-url",
                json={"file_type": "logo", "content_type": "image/jpeg"},
            )

        call_args = mock_spaces.generate_presigned_url.call_args
        assert f"orgs/{org_id}/logo" in call_args.kwargs["file_path"]

    async def test_banner_generates_banner_path(self, mock_spaces):
        """Calls generate_presigned_url with banner path when file_type=banner."""
        org_id = uuid4()

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            await client.post(
                f"/api/v1/org/{org_id}/upload-url",
                json={"file_type": "banner", "content_type": "image/jpeg"},
            )

        call_args = mock_spaces.generate_presigned_url.call_args
        assert f"orgs/{org_id}/banner" in call_args.kwargs["file_path"]

    async def test_invalid_file_type_returns_422(self):
        """Returns 422 for invalid file_type."""
        org_id = uuid4()
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                f"/api/v1/org/{org_id}/upload-url",
                json={"file_type": "invalid", "content_type": "image/jpeg"},
            )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    async def test_unauthorized_org_returns_404(self, mock_org_repo):
        """Returns 404 when org doesn't belong to authenticated user's tenant."""
        from prosell.infrastructure.api.routers.org_router import get_org_repository

        mock_org_repo.get_by_id = AsyncMock(return_value=None)
        app.dependency_overrides[get_org_repository] = lambda: mock_org_repo

        org_id = uuid4()
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                f"/api/v1/org/{org_id}/upload-url",
                json={"file_type": "logo", "content_type": "image/jpeg"},
            )

        assert response.status_code == status.HTTP_404_NOT_FOUND
