"""Unit tests for image optimization router."""

from collections.abc import AsyncGenerator
from io import BytesIO

import pytest
from fastapi import status
from httpx import AsyncClient
from PIL import Image

from prosell.infrastructure.api.main import app


@pytest.fixture
def sample_image_bytes() -> bytes:
    """Return a sample image as bytes (2000x2000 red square)."""
    img = Image.new("RGB", (2000, 2000), color="red")
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()


@pytest.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    """Return async HTTP client for testing."""
    from httpx import ASGITransport

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


class TestImageOptimizationRouter:
    """Test suite for /api/v1/images/optimize endpoint."""

    @pytest.mark.asyncio
    async def test_optimize_endpoint_returns_jpeg(
        self, async_client: AsyncClient, sample_image_bytes: bytes
    ) -> None:
        """Test that /optimize endpoint returns optimized JPEG."""
        response = await async_client.post(
            "/api/v1/images/optimize",
            files={"file": ("test.png", sample_image_bytes, "image/png")},
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.content.startswith(b"\xff\xd8\xff")  # JPEG magic bytes

    @pytest.mark.asyncio
    async def test_optimize_endpoint_reduces_size(
        self, async_client: AsyncClient, sample_image_bytes: bytes
    ) -> None:
        """Test that /optimize endpoint reduces file size."""
        original_size = len(sample_image_bytes)

        response = await async_client.post(
            "/api/v1/images/optimize",
            files={"file": ("test.png", sample_image_bytes, "image/png")},
        )

        assert response.status_code == status.HTTP_200_OK
        optimized_size = len(response.content)
        assert optimized_size < original_size

    @pytest.mark.asyncio
    async def test_optimize_endpoint_requires_file(self, async_client: AsyncClient) -> None:
        """Test that /optimize endpoint requires file upload."""
        response = await async_client.post("/api/v1/images/optimize")

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
