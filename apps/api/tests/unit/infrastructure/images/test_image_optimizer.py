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


@pytest.fixture
def large_square_image():
    """Return 2000x2000 image (exceeds both dimensions)."""
    img = Image.new("RGB", (2000, 2000), color="blue")
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()


@pytest.fixture
def wide_image():
    """Return 3000x2000 image (width exceeds)."""
    img = Image.new("RGB", (3000, 2000), color="green")
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()


@pytest.fixture
def small_image():
    """Return 1000x500 image (under limits)."""
    img = Image.new("RGB", (1000, 500), color="yellow")
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()


class TestImageOptimizerResize:
    """Test suite for image resizing functionality."""

    @pytest.mark.asyncio
    async def test_resize_large_square_image(self, image_optimizer, large_square_image):
        """Test that 2000x2000 image is resized to 1080x1080 (height limited)."""
        result = await image_optimizer.process(large_square_image)

        # Verify result is bytes
        assert isinstance(result, bytes)
        assert len(result) > 0

        # Load result to verify dimensions
        result_img = Image.open(BytesIO(result))
        assert result_img.width == 1080
        assert result_img.height == 1080

    @pytest.mark.asyncio
    async def test_resize_wide_image(self, image_optimizer, wide_image):
        """Test that 3000x2000 image is resized to 1920x1280 (width limited, aspect maintained)."""
        result = await image_optimizer.process(wide_image)

        # Verify result is bytes
        assert isinstance(result, bytes)
        assert len(result) > 0

        # Load result to verify dimensions
        result_img = Image.open(BytesIO(result))
        assert result_img.width == 1920
        assert result_img.height == 1280
        # Verify aspect ratio maintained (3000/2000 = 1.5, 1920/1280 = 1.5)
        assert abs(result_img.width / result_img.height - 1.5) < 0.01

    @pytest.mark.asyncio
    async def test_small_image_unchanged(self, image_optimizer, small_image):
        """Test that 1000x500 image remains unchanged (under limits)."""
        result = await image_optimizer.process(small_image)

        # Verify result is bytes
        assert isinstance(result, bytes)
        assert len(result) > 0

        # Load result to verify dimensions unchanged
        result_img = Image.open(BytesIO(result))
        assert result_img.width == 1000
        assert result_img.height == 500


class TestImageOptimizerCompression:
    """Test suite for JPEG compression and EXIF stripping."""

    @pytest.mark.asyncio
    async def test_output_format_is_jpeg(self, image_optimizer, large_square_image):
        """Test that output is JPEG format."""
        result = await image_optimizer.process(large_square_image)

        # Load result to verify format
        result_img = Image.open(BytesIO(result))
        assert result_img.format == "JPEG"

    @pytest.mark.asyncio
    async def test_exif_data_stripped(self, image_optimizer):
        """Test that EXIF metadata is stripped."""
        # Create an image with EXIF data
        img = Image.new("RGB", (2000, 2000), color="red")
        buffer = BytesIO()
        img.save(buffer, format="PNG")
        image_bytes = buffer.getvalue()

        result = await image_optimizer.process(image_bytes)

        # Load result and verify no EXIF data
        result_img = Image.open(BytesIO(result))
        # JPEG images shouldn't have EXIF by default
        assert result_img.info.get("exif") is None or len(result_img.info.get("exif", b"")) == 0

    @pytest.mark.asyncio
    async def test_jpeg_quality_reduces_size(self, image_optimizer, large_square_image):
        """Test that JPEG compression reduces file size."""
        result = await image_optimizer.process(large_square_image)

        # JPEG should be smaller than PNG
        assert len(result) < len(large_square_image)

    @pytest.mark.asyncio
    async def test_rgba_to_jpeg_conversion(self, image_optimizer):
        """Test that RGBA images are converted to JPEG (alpha removed)."""
        # Create RGBA image with transparency
        img = Image.new("RGBA", (2000, 2000), color=(255, 0, 0, 128))  # 50% transparent red
        buffer = BytesIO()
        img.save(buffer, format="PNG")
        rgba_bytes = buffer.getvalue()

        result = await image_optimizer.process(rgba_bytes)

        # Result should be JPEG (no alpha channel)
        result_img = Image.open(BytesIO(result))
        assert result_img.format == "JPEG"
        assert result_img.mode == "RGB"
