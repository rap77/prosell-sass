"""Unit tests for image router returning signed (presigned) URLs.

These tests pin the contract that the image endpoints return presigned URLs
that the browser can actually fetch. Without presigning, the returned URL is
the internal docker network endpoint (e.g. http://minio:9000/...) which the
browser cannot resolve — that's the bug this suite regresses against.

The DOSpacesService is mocked: we simulate that upload_file returns a KEY
(not a URL), and generate_download_url returns a presigned URL with the
X-Amz-Signature query parameter. The router MUST call generate_download_url
after upload_file to convert the key into a browser-fetchable URL.
"""

from collections.abc import AsyncGenerator
from io import BytesIO
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID

import pytest
from fastapi import status
from httpx import ASGITransport, AsyncClient
from PIL import Image

from prosell.domain.entities.user import User
from prosell.infrastructure.api.dependencies import (
    get_current_auth_user_from_cookie,
    get_spaces_service,
)
from prosell.infrastructure.api.main import app

# Sample signed URL with X-Amz-Signature (what the browser will receive)
SIGNED_URL = (
    "http://localhost:9000/prosell-assets/orgs/tenant-1/vehicles/abc.jpg"
    "?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=deadbeef"
)
TEST_TENANT_ID = UUID("11111111-1111-1111-1111-111111111111")
TEST_USER_ID = UUID("22222222-2222-2222-2222-222222222222")


def _make_user() -> User:
    """Build a User entity with tenant_id, suitable for dependency override."""
    return User(
        id=TEST_USER_ID,
        email="test@example.com",
        full_name="Test User",
        tenant_id=TEST_TENANT_ID,
    )


def _make_spaces() -> MagicMock:
    """Build a mocked IDOSpacesService.

    upload_file returns a KEY (not a URL) — this is the new contract that
    forces the router to call generate_download_url after uploading.
    generate_download_url returns a presigned URL for any key (the upload
    path uses the router-generated file_path, not the upload_file result).
    """
    spaces = MagicMock()
    spaces.upload_file = AsyncMock(
        return_value="orgs/tenant-1/vehicles/abc.jpg",  # key, not URL
    )
    spaces.generate_download_url = AsyncMock(return_value=SIGNED_URL)
    spaces.check_file_exists = AsyncMock(return_value=True)
    return spaces


@pytest.fixture
async def async_client() -> AsyncGenerator[AsyncClient]:
    """Return async HTTP client with the auth and spaces dependencies overridden."""
    user = _make_user()
    spaces = _make_spaces()

    app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: user
    app.dependency_overrides[get_spaces_service] = lambda: spaces

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    # Clean up overrides so other tests aren't affected
    app.dependency_overrides.pop(get_current_auth_user_from_cookie, None)
    app.dependency_overrides.pop(get_spaces_service, None)


def _sample_jpeg_bytes() -> bytes:
    """Return a tiny in-memory JPEG to satisfy the upload validation."""
    img = Image.new("RGB", (100, 100), color="red")
    buffer = BytesIO()
    img.save(buffer, format="JPEG")
    return buffer.getvalue()


class TestImageUploadReturnsSignedURL:
    """POST /api/v1/images/upload must return a presigned URL."""

    @pytest.mark.asyncio
    async def test_upload_response_url_is_presigned(self, async_client: AsyncClient) -> None:
        """The url field in the response is a presigned URL with X-Amz-Signature.

        It must NOT be a hardcoded internal endpoint (e.g. http://minio:9000/...)
        nor the raw storage key. The browser cannot resolve internal docker
        hostnames and cannot fetch objects from a private bucket without a
        valid signature.
        """
        response = await async_client.post(
            "/api/v1/images/upload",
            files={"file": ("test.jpg", _sample_jpeg_bytes(), "image/jpeg")},
        )

        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert "url" in body
        url = body["url"]
        # The URL must be presigned (has the signature query parameter)
        assert "X-Amz-Signature=" in url, (
            f"Expected presigned URL with X-Amz-Signature, got: {url!r}"
        )
        # And it must NOT be the internal docker network endpoint
        assert "minio:9000" not in url, f"URL leaked internal endpoint (minio:9000), got: {url!r}"


class TestImageStatusReturnsSignedURL:
    """GET /api/v1/images/status/{file_id} must return a presigned URL when present."""

    @pytest.mark.asyncio
    async def test_status_response_url_is_presigned(self, async_client: AsyncClient) -> None:
        """When the file exists, the url field is a presigned URL with X-Amz-Signature.

        Same regression as upload: must not leak internal endpoint.
        """
        response = await async_client.get(
            "/api/v1/images/status/abc-uuid-1234",
        )

        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body["status"] == "complete"
        assert body["url"] is not None
        url = body["url"]
        # The URL must be presigned
        assert "X-Amz-Signature=" in url, (
            f"Expected presigned URL with X-Amz-Signature, got: {url!r}"
        )
        # And it must NOT be the internal docker network endpoint
        assert "minio:9000" not in url, f"URL leaked internal endpoint (minio:9000), got: {url!r}"


class TestImageUploadReturnsStorageKey:
    """POST /api/v1/images/upload MUST return BOTH:
      - `url`  : a presigned URL (signed against the public endpoint so the
                 browser can fetch the just-uploaded object from the private
                 bucket during the current session)
      - `key`  : the raw S3 storage path, e.g. `orgs/{tenant}/vehicles/{uuid}.jpg`

    The frontend MUST persist the `key` into `product.image_urls` (the storage
    layer is opaque to the rest of the system). If the create form persists
    the `url` instead, the row stores an expiring signed URL — images break
    1h later, and re-signing the malformed key produces a URL the browser
    cannot load (signature is calculated against a key that already contains
    `?X-Amz-...`).
    """

    @pytest.mark.asyncio
    async def test_upload_response_includes_storage_key(self, async_client: AsyncClient) -> None:
        """The response MUST include a `key` field with the raw storage path."""
        response = await async_client.post(
            "/api/v1/images/upload",
            files={"file": ("test.jpg", _sample_jpeg_bytes(), "image/jpeg")},
        )

        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert "key" in body, f"Response missing `key` field; got: {body!r}"
        key = body["key"]
        # The key MUST be the raw S3 path — no signature query string.
        assert "?" not in key, f"key contains a query string (signed URL leaked): {key!r}"
        # And it MUST start with the tenant prefix.
        assert key.startswith(f"orgs/{TEST_TENANT_ID}/vehicles/"), (
            f"key does not match expected tenant prefix: {key!r}"
        )
        # The signed `url` should still be returned (for browser preview).
        assert "url" in body
        assert "X-Amz-Signature=" in body["url"]
