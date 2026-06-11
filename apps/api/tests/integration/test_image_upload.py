"""Tests for image upload endpoint with optimization."""

from collections.abc import Generator
from io import BytesIO
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi import status
from httpx import ASGITransport, AsyncClient
from PIL import Image

from prosell.domain.entities.role import Role, RoleType
from prosell.domain.entities.user import User, UserStatus
from prosell.infrastructure.api.main import app

# Global mock reference for tests
_mock_spaces = None


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
    global _mock_spaces
    spaces = MagicMock()
    spaces.upload_file = AsyncMock(
        return_value="https://region.digitaloceanspaces.com/bucket/orgs/123/vehicles/uuid.jpg"
    )
    # The router signs a download URL after upload (await spaces.generate_download_url).
    # Must be an AsyncMock or `await` on it fails with "MagicMock can't be awaited".
    spaces.generate_download_url = AsyncMock(
        return_value="https://region.digitaloceanspaces.com/bucket/orgs/123/vehicles/uuid.jpg?signed=1"
    )
    spaces.endpoint = "https://region.digitaloceanspaces.com"
    spaces.bucket = "test-bucket"
    _mock_spaces = spaces
    return spaces


@pytest.fixture(autouse=True)
def setup_auth(
    mock_auth_user: User,
    mock_role_repo: MagicMock,
    mock_spaces: MagicMock,
) -> Generator[None]:
    from prosell.infrastructure.api.dependencies import (
        get_current_auth_user_from_cookie,
        get_role_repository,
        get_spaces_service,
    )

    app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: mock_auth_user
    app.dependency_overrides[get_role_repository] = lambda: mock_role_repo
    app.dependency_overrides[get_spaces_service] = lambda: mock_spaces
    yield
    app.dependency_overrides.clear()
    global _mock_spaces
    _mock_spaces = None


@pytest.fixture
def sample_image_bytes() -> bytes:
    """Create a sample 2000x2000 JPEG image for testing."""
    img = Image.new("RGB", (2000, 2000), color="red")
    buffer = BytesIO()
    img.save(buffer, format="JPEG")
    return buffer.getvalue()


class TestImageUpload:
    """Tests for POST /upload endpoint."""

    async def test_upload_image_success(self, sample_image_bytes: bytes) -> None:
        """Uploads image, optimizes it, and returns public URL."""
        from io import BytesIO

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/v1/images/upload",
                files={"file": ("test.jpg", BytesIO(sample_image_bytes), "image/jpeg")},
            )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "url" in data
        assert data["url"].startswith("https://")

    async def test_upload_image_calls_optimization(self, sample_image_bytes: bytes) -> None:
        """Calls ImageOptimizer.process before upload."""
        from io import BytesIO

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            await client.post(
                "/api/v1/images/upload",
                files={"file": ("test.jpg", BytesIO(sample_image_bytes), "image/jpeg")},
            )

        # Verify upload_file was called (which happens after optimization)
        assert _mock_spaces is not None
        assert _mock_spaces.upload_file.called
        # Verify the uploaded bytes are smaller (optimized)
        uploaded_bytes = _mock_spaces.upload_file.call_args.kwargs["file_bytes"]
        assert len(uploaded_bytes) < len(sample_image_bytes)

    async def test_upload_image_generates_correct_path(
        self, sample_image_bytes: bytes, mock_spaces: MagicMock, mock_auth_user: User
    ) -> None:
        """Generates correct orgs/{tenant_id}/vehicles/ path."""
        from io import BytesIO

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            await client.post(
                "/api/v1/images/upload",
                files={"file": ("test.jpg", BytesIO(sample_image_bytes), "image/jpeg")},
            )

        # Verify the path includes tenant_id
        call_args = mock_spaces.upload_file.call_args
        file_path = call_args.kwargs["file_path"]
        assert f"orgs/{mock_auth_user.tenant_id}/vehicles/" in file_path

    async def test_upload_stores_webp(
        self, sample_image_bytes: bytes, mock_spaces: MagicMock
    ) -> None:
        """Storage path stores WebP: .webp key, image/webp content-type, WebP bytes."""
        from io import BytesIO

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/v1/images/upload",
                files={"file": ("test.jpg", BytesIO(sample_image_bytes), "image/jpeg")},
            )

        assert response.status_code == status.HTTP_200_OK
        call = mock_spaces.upload_file.call_args
        assert call.kwargs["content_type"] == "image/webp"
        assert call.kwargs["file_path"].endswith(".webp")
        uploaded = call.kwargs["file_bytes"]
        # WebP container: 'RIFF' .... 'WEBP'
        assert uploaded[:4] == b"RIFF"
        assert uploaded[8:12] == b"WEBP"

    async def test_upload_image_rejects_non_image(self) -> None:
        """Returns 400 for non-image files."""
        from io import BytesIO

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/v1/images/upload",
                files={"file": ("test.txt", BytesIO(b"not an image"), "text/plain")},
            )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    async def test_upload_image_rejects_empty_file(self) -> None:
        """Returns 400 for empty file."""
        from io import BytesIO

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/v1/images/upload",
                files={"file": ("empty.jpg", BytesIO(b""), "image/jpeg")},
            )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    async def test_upload_image_handles_png_with_alpha(self) -> None:
        """Flattens PNG alpha and stores it as WebP (storage path)."""
        # Create a PNG with alpha channel
        img = Image.new("RGBA", (1000, 1000), color=(255, 0, 0, 128))
        buffer = BytesIO()
        img.save(buffer, format="PNG")
        png_bytes = buffer.getvalue()

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/v1/images/upload",
                files={"file": ("test.png", BytesIO(png_bytes), "image/png")},
            )

        assert response.status_code == status.HTTP_200_OK
        # Verify upload was called with optimized WebP bytes
        assert _mock_spaces is not None
        assert _mock_spaces.upload_file.called
        uploaded_bytes = _mock_spaces.upload_file.call_args.kwargs["file_bytes"]
        # Verify it's WebP format (RIFF .... WEBP)
        assert uploaded_bytes[:4] == b"RIFF"
        assert uploaded_bytes[8:12] == b"WEBP"

    async def test_upload_image_handles_large_image(self, sample_image_bytes: bytes) -> None:
        """Resizes images larger than 1920x1080."""
        from io import BytesIO

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/v1/images/upload",
                files={"file": ("large.jpg", BytesIO(sample_image_bytes), "image/jpeg")},
            )

        assert response.status_code == status.HTTP_200_OK
        # Verify the file was optimized (should be smaller than original)
        assert _mock_spaces is not None
        uploaded_bytes = _mock_spaces.upload_file.call_args.kwargs["file_bytes"]
        # Original 2000x2000 JPEG is ~63KB, optimized should be smaller
        assert len(uploaded_bytes) < len(sample_image_bytes)
        # Verify it's a valid WebP (RIFF .... WEBP)
        assert uploaded_bytes[:4] == b"RIFF"
        assert uploaded_bytes[8:12] == b"WEBP"

    async def test_upload_without_tenant_id_returns_400(self, sample_image_bytes: bytes) -> None:
        """Returns 400 when user has no tenant_id."""
        from prosell.infrastructure.api.dependencies import get_current_auth_user_from_cookie

        # Create user without tenant_id
        user_no_tenant = User(
            id=uuid4(),
            email="notenant@example.com",
            full_name="No Tenant User",
            tenant_id=None,
            status=UserStatus.ACTIVE,
            email_verified=True,
        )
        app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: user_no_tenant

        from io import BytesIO

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/v1/images/upload",
                files={"file": ("test.jpg", BytesIO(sample_image_bytes), "image/jpeg")},
            )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "organization" in response.json()["detail"].lower()
