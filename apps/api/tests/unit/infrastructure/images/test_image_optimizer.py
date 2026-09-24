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


@pytest.fixture
def photo_like_image():
    """Return an 800x600 image with a varied gradient (compresses like a photo)."""
    img = Image.new("RGB", (800, 600))
    pixels = img.load()
    assert pixels is not None
    for y in range(600):
        for x in range(800):
            pixels[x, y] = (x % 256, y % 256, (x + y) % 256)
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()


class TestImageOptimizerWebP:
    """Storage path uses WebP (smaller objects on DO Spaces)."""

    def test_optimizer_accepts_webp_config(self):
        from prosell.infrastructure.images.image_optimizer import ImageOptimizer

        optimizer = ImageOptimizer(output_format="WEBP", webp_quality=82)
        assert optimizer.output_format == "WEBP"
        assert optimizer.webp_quality == 82

    def test_default_output_format_is_jpeg(self):
        # Default stays JPEG so /optimize and existing callers are unaffected.
        from prosell.infrastructure.images.image_optimizer import ImageOptimizer

        assert ImageOptimizer().output_format == "JPEG"

    @pytest.mark.asyncio
    async def test_webp_output_is_valid_webp(self, large_square_image):
        from prosell.infrastructure.images.image_optimizer import ImageOptimizer

        result = await ImageOptimizer(output_format="WEBP").process(large_square_image)

        result_img = Image.open(BytesIO(result))
        assert result_img.format == "WEBP"

    @pytest.mark.asyncio
    async def test_webp_respects_max_dimensions(self, large_square_image):
        from prosell.infrastructure.images.image_optimizer import ImageOptimizer

        result = await ImageOptimizer(output_format="WEBP").process(large_square_image)

        result_img = Image.open(BytesIO(result))
        assert result_img.width == 1080
        assert result_img.height == 1080

    @pytest.mark.asyncio
    async def test_webp_smaller_than_jpeg(self, photo_like_image):
        from prosell.infrastructure.images.image_optimizer import ImageOptimizer

        webp = await ImageOptimizer(output_format="WEBP").process(photo_like_image)
        jpeg = await ImageOptimizer(output_format="JPEG").process(photo_like_image)
        assert len(webp) < len(jpeg)


@pytest.fixture
def center_edge_image():
    """Return a 1000x600 image with distinguishable center vs edge pixels.

    Used to prove the centered square crop keeps the CENTER pixel and
    discards the EDGE pixels (the focal point of the photo is
    preserved, not the corners).
    """
    img = Image.new("RGB", (1000, 600), color=(0, 0, 0))  # black borders
    pixels = img.load()
    assert pixels is not None
    # EDGE marker: red border (excluded from the centered crop)
    for x in range(1000):
        pixels[x, 0] = (255, 0, 0)
        pixels[x, 599] = (255, 0, 0)
    for y in range(600):
        pixels[0, y] = (255, 0, 0)
        pixels[999, y] = (255, 0, 0)
    # CENTER marker: green square (preserved by the centered crop)
    for y in range(280, 320):
        for x in range(480, 520):
            pixels[x, y] = (0, 255, 0)
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()


@pytest.fixture
def tall_image():
    """Return a 600x1000 image (height exceeds width)."""
    img = Image.new("RGB", (600, 1000), color="yellow")
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()


class TestImageOptimizerThumbnail:
    """Private 600x600 thumbnail derivative for the catalog-card surface.

    ponytail: independent from `process()` (full-size gallery) and
    `process_og()` (1200x630 public OG). This derivative is uploaded as
    a PRIVATE object (no `make_public`); the catalog grid signs it on
    demand via the configured CDN endpoint.
    """

    @pytest.mark.asyncio
    async def test_thumbnail_output_is_valid_webp(self, large_square_image):
        """process_thumbnail() must produce a WebP byte stream."""
        from prosell.infrastructure.images.image_optimizer import ImageOptimizer

        result = await ImageOptimizer().process_thumbnail(large_square_image)

        # WebP magic: RIFF....WEBP
        assert result[:4] == b"RIFF"
        assert result[8:12] == b"WEBP"

    @pytest.mark.asyncio
    async def test_thumbnail_is_exactly_600x600(self, large_square_image):
        """process_thumbnail() must produce exactly 600x600 pixels."""
        from prosell.infrastructure.images.image_optimizer import ImageOptimizer

        result = await ImageOptimizer().process_thumbnail(large_square_image)

        result_img = Image.open(BytesIO(result))
        assert result_img.size == (600, 600)

    @pytest.mark.asyncio
    async def test_thumbnail_crop_is_centered(self, center_edge_image):
        """Centered square crop keeps center pixels, discards edge pixels."""
        from prosell.infrastructure.images.image_optimizer import ImageOptimizer

        result = await ImageOptimizer().process_thumbnail(center_edge_image)
        result_img = Image.open(BytesIO(result))

        # The green CENTER marker from the original (480-520, 280-320)
        # lives at src (500, 300). The center-crop window is
        # (left=(1000-600)/2=200, top=0, right=800, bottom=600), so
        # src (500, 300) maps to thumb ((500-200)*1, 300) = (300, 300).
        cx, cy = 300, 300
        center_color = result_img.getpixel((cx, cy))
        # The center should be the GREEN marker, not the red border.
        # Green: (0, 255, 0). Red: (255, 0, 0).
        assert isinstance(center_color, tuple)
        r, g = center_color[0], center_color[1]
        assert g > 200, f"center pixel should be green, got {center_color}"
        assert r < 50, f"center pixel should not be red, got {center_color}"

        # The CORNERS of the 600x600 thumbnail should NOT be the red
        # border (those pixels were cropped away).
        corner_color = result_img.getpixel((0, 0))
        assert isinstance(corner_color, tuple)
        assert corner_color != (255, 0, 0), (
            f"corner should not be the red border marker, got {corner_color}"
        )

    @pytest.mark.asyncio
    async def test_thumbnail_handles_tall_image(self, tall_image):
        """A taller-than-wide image still produces a 600x600 square (center-cropped)."""
        from prosell.infrastructure.images.image_optimizer import ImageOptimizer

        result = await ImageOptimizer().process_thumbnail(tall_image)
        result_img = Image.open(BytesIO(result))

        assert result_img.size == (600, 600)

    @pytest.mark.asyncio
    async def test_thumbnail_strips_exif(self):
        """process_thumbnail() must not preserve EXIF metadata."""
        from PIL import Image as PILImage

        from prosell.infrastructure.images.image_optimizer import ImageOptimizer

        # Create a JPEG with EXIF (the optimizer normalizes EXIF via
        # _prepare_image which strips it on save).
        img = PILImage.new("RGB", (1000, 1000), color="cyan")
        buffer = BytesIO()
        # Save with a fake EXIF block.
        exif = b"Exif\x00\x00" + b"\x00" * 100
        img.save(buffer, format="JPEG", exif=exif)
        jpeg_bytes = buffer.getvalue()

        result = await ImageOptimizer().process_thumbnail(jpeg_bytes)
        result_img = PILImage.open(BytesIO(result))

        # Pillow records EXIF under `info["exif"]`. After save with no
        # exif arg, the field should be absent or empty.
        exif_data = result_img.info.get("exif", b"")
        assert exif_data in (None, b""), f"EXIF should be stripped, got {exif_data!r}"

    @pytest.mark.asyncio
    async def test_thumbnail_does_not_break_gallery_or_og(self, large_square_image):
        """Adding process_thumbnail must NOT perturb process() or process_og()."""
        from prosell.infrastructure.images.image_optimizer import ImageOptimizer

        optimizer = ImageOptimizer()

        # process() still produces the gallery WebP at max dimensions.
        gallery = await optimizer.process(large_square_image)
        gallery_img = Image.open(BytesIO(gallery))
        assert gallery_img.size[0] <= 1920
        assert gallery_img.size[1] <= 1080

        # process_og() still produces the OG JPEG at exactly 1200x630.
        og = await optimizer.process_og(large_square_image)
        og_img = Image.open(BytesIO(og))
        assert og_img.size == (1200, 630)
        assert og_img.format == "JPEG"

        # process_thumbnail() produces the 600x600 WebP.
        thumb = await optimizer.process_thumbnail(large_square_image)
        thumb_img = Image.open(BytesIO(thumb))
        assert thumb_img.size == (600, 600)
        assert thumb_img.format == "WEBP"
