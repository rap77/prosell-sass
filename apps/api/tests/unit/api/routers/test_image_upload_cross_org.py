"""Unit tests for cross-org image upload (super_admin feature).

When a super_admin creates a product for another organization, uploaded images
must be stored under the target org's bucket, not the admin's own bucket.

The router validates the target organization server-side before accepting a
cross-org upload, so a compromised super_admin cannot push to arbitrary UUIDs.
"""

from io import BytesIO
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID, uuid4

import pytest
from fastapi import status
from httpx import ASGITransport, AsyncClient
from PIL import Image

from prosell.domain.entities.organization import Organization
from prosell.domain.entities.role import Role, RoleType
from prosell.domain.entities.user import User, UserStatus
from prosell.domain.value_objects.organization_status import OrganizationStatus
from prosell.infrastructure.api.main import app


@pytest.fixture
def sample_image_bytes() -> bytes:
    """Create a sample JPEG image for testing."""
    img = Image.new("RGB", (100, 100), color="red")
    buffer = BytesIO()
    img.save(buffer, format="JPEG")
    return buffer.getvalue()


@pytest.fixture
def mock_spaces() -> MagicMock:
    """Mock DO Spaces service."""
    spaces = MagicMock()
    spaces.upload_file = AsyncMock(return_value="https://example.com/image.webp")
    spaces.generate_download_url = AsyncMock(return_value="https://example.com/image.webp?signed=1")
    spaces.endpoint = "https://example.com"
    spaces.bucket = "test-bucket"
    return spaces


def _make_user(role_type: RoleType, tenant_id: UUID | None = None) -> User:
    """Build a User with the given role for dependency override."""
    role = Role.create_system_role(role_type)
    return User(
        id=uuid4(),
        email=f"{role_type.value}@prosell.com",
        full_name=f"Test {role_type.value}",
        tenant_id=tenant_id if tenant_id is not None else uuid4(),
        status=UserStatus.ACTIVE,
        email_verified=True,
        roles=[role],
    )


def _make_org(tenant_id: UUID, org_status: OrganizationStatus) -> Organization:
    """Build a minimal Organization with the given status."""
    return Organization(
        id=tenant_id,
        name=f"Test Org {tenant_id.hex[:6]}",
        tenant_id=tenant_id,
        status=org_status,
    )


def _override_spaces(mock_spaces: MagicMock) -> None:
    """Bind the DO Spaces dependency override."""
    from prosell.infrastructure.api.dependencies import get_spaces_service

    app.dependency_overrides[get_spaces_service] = lambda: mock_spaces


def _override_org_repo(orgs_by_tenant: dict[UUID, Organization | None]) -> None:
    """Bind the organization repository dependency override.

    For each (tenant_id -> Organization | None) the mock returns the mapped value
    from `get_by_tenant_id`. Pass None to simulate "org not found".
    """
    from prosell.infrastructure.api.dependencies import get_organization_repository

    repo = MagicMock()
    repo.get_by_tenant_id = AsyncMock(side_effect=lambda tid: orgs_by_tenant.get(tid))
    app.dependency_overrides[get_organization_repository] = lambda: repo


class TestImageUploadCrossOrg:
    """Tests for cross-org image upload (super_admin creating products for other orgs)."""

    @pytest.mark.asyncio
    async def test_super_admin_uploads_to_target_org(
        self, sample_image_bytes: bytes, mock_spaces: MagicMock
    ) -> None:
        """Super admin can upload images to a real, active org's bucket."""
        from prosell.infrastructure.api.dependencies import (
            get_current_auth_user_from_cookie,
            get_role_repository,
        )

        super_admin = _make_user(RoleType.SUPER_ADMIN)
        target_org_id = uuid4()
        target_org = _make_org(target_org_id, OrganizationStatus.ACTIVE)

        role = Role.create_system_role(RoleType.SUPER_ADMIN)
        mock_role_repo = MagicMock()
        mock_role_repo.get_user_roles = AsyncMock(return_value=[role])

        app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: super_admin
        app.dependency_overrides[get_role_repository] = lambda: mock_role_repo
        _override_spaces(mock_spaces)
        _override_org_repo({target_org_id: target_org})

        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.post(
                    "/api/v1/images/upload",
                    files={"file": ("test.jpg", BytesIO(sample_image_bytes), "image/jpeg")},
                    data={"organization_id": str(target_org_id)},
                )

            assert response.status_code == status.HTTP_200_OK
            file_path = mock_spaces.upload_file.call_args.kwargs["file_path"]
            assert f"orgs/{target_org_id}/vehicles/" in file_path
            assert f"orgs/{super_admin.tenant_id}" not in file_path
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_regular_admin_ignores_organization_id(
        self, sample_image_bytes: bytes, mock_spaces: MagicMock
    ) -> None:
        """Regular admin (not super_admin) ignores organization_id and uses own tenant."""
        from prosell.infrastructure.api.dependencies import (
            get_current_auth_user_from_cookie,
            get_role_repository,
        )

        regular_admin = _make_user(RoleType.ADMIN)
        target_org_id = uuid4()

        role = Role.create_system_role(RoleType.ADMIN)
        mock_role_repo = MagicMock()
        mock_role_repo.get_user_roles = AsyncMock(return_value=[role])

        app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: regular_admin
        app.dependency_overrides[get_role_repository] = lambda: mock_role_repo
        _override_spaces(mock_spaces)
        _override_org_repo({})  # regular admin never reaches the validation branch

        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.post(
                    "/api/v1/images/upload",
                    files={"file": ("test.jpg", BytesIO(sample_image_bytes), "image/jpeg")},
                    data={"organization_id": str(target_org_id)},
                )

            assert response.status_code == status.HTTP_200_OK
            file_path = mock_spaces.upload_file.call_args.kwargs["file_path"]
            assert f"orgs/{regular_admin.tenant_id}/vehicles/" in file_path
            assert f"orgs/{target_org_id}" not in file_path
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_super_admin_without_org_id_uses_own_tenant(
        self, sample_image_bytes: bytes, mock_spaces: MagicMock
    ) -> None:
        """Super admin without organization_id param uses their own tenant (backwards compat)."""
        from prosell.infrastructure.api.dependencies import (
            get_current_auth_user_from_cookie,
            get_role_repository,
        )

        super_admin = _make_user(RoleType.SUPER_ADMIN)

        role = Role.create_system_role(RoleType.SUPER_ADMIN)
        mock_role_repo = MagicMock()
        mock_role_repo.get_user_roles = AsyncMock(return_value=[role])

        app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: super_admin
        app.dependency_overrides[get_role_repository] = lambda: mock_role_repo
        _override_spaces(mock_spaces)
        _override_org_repo({})

        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.post(
                    "/api/v1/images/upload",
                    files={"file": ("test.jpg", BytesIO(sample_image_bytes), "image/jpeg")},
                )

            assert response.status_code == status.HTTP_200_OK
            file_path = mock_spaces.upload_file.call_args.kwargs["file_path"]
            assert f"orgs/{super_admin.tenant_id}/vehicles/" in file_path
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_super_admin_with_unknown_org_id_returns_404(
        self, sample_image_bytes: bytes, mock_spaces: MagicMock
    ) -> None:
        """Super admin cannot upload to an unknown organization (no arbitrary UUID writes)."""
        from prosell.infrastructure.api.dependencies import (
            get_current_auth_user_from_cookie,
            get_role_repository,
        )

        super_admin = _make_user(RoleType.SUPER_ADMIN)
        unknown_org_id = uuid4()

        role = Role.create_system_role(RoleType.SUPER_ADMIN)
        mock_role_repo = MagicMock()
        mock_role_repo.get_user_roles = AsyncMock(return_value=[role])

        app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: super_admin
        app.dependency_overrides[get_role_repository] = lambda: mock_role_repo
        _override_spaces(mock_spaces)
        _override_org_repo({unknown_org_id: None})  # org not found

        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.post(
                    "/api/v1/images/upload",
                    files={"file": ("test.jpg", BytesIO(sample_image_bytes), "image/jpeg")},
                    data={"organization_id": str(unknown_org_id)},
                )

            assert response.status_code == status.HTTP_404_NOT_FOUND
            mock_spaces.upload_file.assert_not_called()
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_super_admin_with_suspended_org_returns_403(
        self, sample_image_bytes: bytes, mock_spaces: MagicMock
    ) -> None:
        """Super admin cannot upload to a suspended or rejected organization."""
        from prosell.infrastructure.api.dependencies import (
            get_current_auth_user_from_cookie,
            get_role_repository,
        )

        super_admin = _make_user(RoleType.SUPER_ADMIN)
        target_org_id = uuid4()
        suspended_org = _make_org(target_org_id, OrganizationStatus.SUSPENDED)

        role = Role.create_system_role(RoleType.SUPER_ADMIN)
        mock_role_repo = MagicMock()
        mock_role_repo.get_user_roles = AsyncMock(return_value=[role])

        app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: super_admin
        app.dependency_overrides[get_role_repository] = lambda: mock_role_repo
        _override_spaces(mock_spaces)
        _override_org_repo({target_org_id: suspended_org})

        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.post(
                    "/api/v1/images/upload",
                    files={"file": ("test.jpg", BytesIO(sample_image_bytes), "image/jpeg")},
                    data={"organization_id": str(target_org_id)},
                )

            assert response.status_code == status.HTTP_403_FORBIDDEN
            mock_spaces.upload_file.assert_not_called()
        finally:
            app.dependency_overrides.clear()
