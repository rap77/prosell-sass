"""Unit tests for ImageOptimizer service."""

from io import BytesIO

import pytest
from PIL import Image


@pytest.fixture
def sample_image_bytes():
    """Return a sample image as bytes (2000x2000 red square)."""
    img = Image.new("RGB", (2000, 2000), color="red")
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()


@pytest.fixture
def image_optimizer():
    """Return an ImageOptimizer instance."""
    from prosell.infrastructure.images.image_optimizer import ImageOptimizer

    return ImageOptimizer()


class TestImageOptimizer:
    """Test suite for ImageOptimizer."""

    def test_image_optimizer_exists(self, image_optimizer):
        """Test that ImageOptimizer can be instantiated."""
        assert image_optimizer is not None
        assert hasattr(image_optimizer, "process")

    @pytest.mark.asyncio
    async def test_process_method_exists(self, image_optimizer):
        """Test that process method is callable."""
        assert callable(image_optimizer.process)

    def test_image_optimizer_has_config(self, image_optimizer):
        """Test that ImageOptimizer accepts configuration."""
        # Should have default config
        assert hasattr(image_optimizer, "max_width")
        assert hasattr(image_optimizer, "max_height")
        assert hasattr(image_optimizer, "jpeg_quality")

    def test_image_optimizer_custom_config(self):
        """Test that ImageOptimizer accepts custom configuration."""
        from prosell.infrastructure.images.image_optimizer import ImageOptimizer

        optimizer = ImageOptimizer(
            max_width=1280,
            max_height=720,
            jpeg_quality=90,
        )
        assert optimizer.max_width == 1280
        assert optimizer.max_height == 720
        assert optimizer.jpeg_quality == 90
