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
        return_value="https://region.digitaloceanspaces.com/bucket/orgs/{tenant}/products/uuid.jpg"
    )
    # The router signs download URLs via the CDN signer (generate_cdn_download_url).
    # Must be an AsyncMock or `await` on it fails with "MagicMock can't be awaited".
    signed_url = (
        "https://region.digitaloceanspaces.com/bucket/orgs/{tenant}/products/uuid.jpg?signed=1"
    )
    spaces.generate_cdn_download_url = AsyncMock(return_value=signed_url)
    # Legacy fallback (some old paths might still call it)
    spaces.generate_download_url = AsyncMock(return_value=signed_url)
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
        self, sample_image_bytes: bytes, mock_spaces: MagicMock
    ) -> None:
        """Generates correct orgs/{tenant}/products/ path."""
        from io import BytesIO

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            await client.post(
                "/api/v1/images/upload",
                files={"file": ("test.jpg", BytesIO(sample_image_bytes), "image/jpeg")},
            )

        # Verify the path structure
        call_args = mock_spaces.upload_file.call_args
        file_path = call_args.kwargs["file_path"]
        assert "/products/" in file_path
        assert file_path.startswith("orgs/")

    async def test_upload_stores_webp(
        self, sample_image_bytes: bytes, mock_spaces: MagicMock
    ) -> None:
        """Storage path stores gallery WebP + thumb WebP + OG JPEG (three uploads)."""
        from io import BytesIO

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/v1/images/upload",
                files={"file": ("test.jpg", BytesIO(sample_image_bytes), "image/jpeg")},
            )

        assert response.status_code == status.HTTP_200_OK
        # Now uploads THREE files: gallery WebP + thumb WebP + OG JPEG
        assert mock_spaces.upload_file.call_count == 3
        calls = mock_spaces.upload_file.call_args_list
        # First call: gallery WebP
        webp_call = calls[0]
        assert webp_call.kwargs["content_type"] == "image/webp"
        assert webp_call.kwargs["file_path"].endswith(".webp")
        assert not webp_call.kwargs["file_path"].endswith("-thumb.webp")
        webp_bytes = webp_call.kwargs["file_bytes"]
        assert webp_bytes[:4] == b"RIFF"
        assert webp_bytes[8:12] == b"WEBP"
        # Second call: thumbnail WebP (private, signed on demand)
        thumb_call = calls[1]
        assert thumb_call.kwargs["content_type"] == "image/webp"
        assert thumb_call.kwargs["file_path"].endswith("-thumb.webp")
        # ponytail: the thumbnail MUST stay private — the catalog grid
        # signs it on demand via the configured CDN endpoint. Setting
        # `make_public=True` here would expose the bucket (NFR2.1).
        assert thumb_call.kwargs.get("make_public", False) is False
        thumb_bytes = thumb_call.kwargs["file_bytes"]
        assert thumb_bytes[:4] == b"RIFF"
        assert thumb_bytes[8:12] == b"WEBP"
        # Third call: OG JPEG (public for WhatsApp/Facebook)
        og_call = calls[2]
        assert og_call.kwargs["content_type"] == "image/jpeg"
        assert og_call.kwargs["file_path"].endswith("-og.jpg")

    async def test_upload_returns_thumbnail_url_and_key(self, sample_image_bytes: bytes) -> None:
        """The response exposes thumbnail_url (1h presigned) and thumbnail_key (persist)."""
        from io import BytesIO

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/v1/images/upload",
                files={"file": ("test.jpg", BytesIO(sample_image_bytes), "image/jpeg")},
            )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "thumbnail_url" in data
        assert data["thumbnail_url"].startswith("https://")
        assert "thumbnail_key" in data
        # thumbnail_key uses the same path convention as the gallery entry
        # but with the `-thumb.webp` suffix.
        assert data["thumbnail_key"].endswith("-thumb.webp")
        assert data["thumbnail_key"].startswith("orgs/")
        assert "/products/" in data["thumbnail_key"]

    async def test_upload_thumbnail_is_exactly_600x600(
        self, sample_image_bytes: bytes, mock_spaces: MagicMock
    ) -> None:
        """The thumbnail upload receives exactly 600x600 WebP bytes."""
        from io import BytesIO

        from PIL import Image as PILImage

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            await client.post(
                "/api/v1/images/upload",
                files={"file": ("test.jpg", BytesIO(sample_image_bytes), "image/jpeg")},
            )

        # The thumbnail is the second upload (after gallery, before OG).
        thumb_call = mock_spaces.upload_file.call_args_list[1]
        thumb_bytes = thumb_call.kwargs["file_bytes"]
        # Decode and check dimensions.
        decoded = PILImage.open(BytesIO(thumb_bytes))
        assert decoded.size == (600, 600)

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
        """Flattens PNG alpha and stores it as WebP + thumb + OG JPEG."""
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
        assert _mock_spaces is not None
        # Uploads THREE files: WebP + thumb + OG JPEG
        assert _mock_spaces.upload_file.call_count == 3
        webp_call = _mock_spaces.upload_file.call_args_list[0]
        webp_bytes = webp_call.kwargs["file_bytes"]
        assert webp_bytes[:4] == b"RIFF"
        assert webp_bytes[8:12] == b"WEBP"

    async def test_upload_image_handles_large_image(self, sample_image_bytes: bytes) -> None:
        """Resizes images larger than 1920x1080."""
        from io import BytesIO

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/v1/images/upload",
                files={"file": ("large.jpg", BytesIO(sample_image_bytes), "image/jpeg")},
            )

        assert response.status_code == status.HTTP_200_OK
        assert _mock_spaces is not None
        # Uploads THREE files: WebP + thumb + OG JPEG
        assert _mock_spaces.upload_file.call_count == 3
        webp_call = _mock_spaces.upload_file.call_args_list[0]
        webp_bytes = webp_call.kwargs["file_bytes"]
        # Original 2000x2000 JPEG is ~63KB, optimized WebP should be smaller
        assert len(webp_bytes) < len(sample_image_bytes)
        assert webp_bytes[:4] == b"RIFF"
        assert webp_bytes[8:12] == b"WEBP"

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
