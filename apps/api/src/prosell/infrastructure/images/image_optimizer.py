"""Image optimization service for ProSell SaaS."""

from io import BytesIO

from PIL import Image

from prosell.domain.ports.i_image_pipeline import IImagePipeline


class ImageOptimizer(IImagePipeline):
    """
    Image optimization service using Pillow.

    Implements IImagePipeline port from domain layer.
    Optimizes images for web display: resize, compress, strip EXIF, convert to JPEG.
    """

    # Use Resampling.LANCZOS for Pillow 10+ compatibility
    try:
        RESAMPLING = Image.Resampling.LANCZOS
    except AttributeError:
        RESAMPLING = Image.LANCZOS  # type: ignore[attr-defined]

    def __init__(
        self,
        max_width: int = 1920,
        max_height: int = 1080,
        jpeg_quality: int = 85,
        output_format: str = "JPEG",
        webp_quality: int = 82,
    ):
        """
        Initialize ImageOptimizer with configuration.

        Args:
            max_width: Maximum width in pixels (default: 1920)
            max_height: Maximum height in pixels (default: 1080)
            jpeg_quality: JPEG quality 1-100 (default: 85)
            output_format: Stored image format, "JPEG" or "WEBP" (default: "JPEG").
                The storage upload path uses "WEBP" for smaller objects; the
                default stays "JPEG" so other callers are unaffected.
            webp_quality: WebP quality 1-100 when output_format="WEBP" (default: 82)
        """
        self.max_width = max_width
        self.max_height = max_height
        self.jpeg_quality = jpeg_quality
        self.output_format = output_format
        self.webp_quality = webp_quality

    def _prepare_image(self, image_bytes: bytes) -> Image.Image:
        """Load and convert image to RGB."""
        img: Image.Image = Image.open(BytesIO(image_bytes))
        if img.mode == "RGBA":
            background = Image.new("RGB", img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[3])
            return background
        if img.mode not in ("RGB", "L"):
            return img.convert("RGB")
        return img

    def _resize_to_fit(self, img: Image.Image, max_width: int, max_height: int) -> Image.Image:
        """Resize to fit within max dimensions, maintaining aspect ratio."""
        width, height = img.size
        if width <= max_width and height <= max_height:
            return img
        aspect = width / height
        if width > height:
            new_width, new_height = max_width, int(max_width / aspect)
        else:
            new_height, new_width = max_height, int(max_height * aspect)
        return img.resize((new_width, new_height), self.RESAMPLING)

    async def process(self, image_bytes: bytes) -> bytes:
        """
        Compress, resize to max dimensions, convert to configured format, strip EXIF.

        Args:
            image_bytes: Raw image bytes

        Returns:
            Processed image bytes in the configured output format (default JPEG,
            or WebP when output_format="WEBP" — used by the storage upload path).
        """
        img = self._prepare_image(image_bytes)
        img = self._resize_to_fit(img, self.max_width, self.max_height)
        buffer = BytesIO()
        if self.output_format == "WEBP":
            img.save(buffer, format="WEBP", quality=self.webp_quality, method=6)
        else:
            img.save(buffer, format="JPEG", quality=self.jpeg_quality, optimize=True)
        return buffer.getvalue()

    async def process_og(self, image_bytes: bytes) -> bytes:
        """Generate Open Graph optimized JPEG (1200x630, Facebook/WhatsApp compatible).

        ponytail: center-crop to 1200x630 aspect ratio, then resize.
        """
        img = self._prepare_image(image_bytes)
        width, height = img.size
        target_aspect = 1200 / 630  # ~1.9

        # Crop to OG aspect ratio (center crop)
        current_aspect = width / height
        if current_aspect > target_aspect:
            # Too wide: crop sides
            new_width = int(height * target_aspect)
            left = (width - new_width) // 2
            img = img.crop((left, 0, left + new_width, height))
        elif current_aspect < target_aspect:
            # Too tall: crop top/bottom
            new_height = int(width / target_aspect)
            top = (height - new_height) // 2
            img = img.crop((0, top, width, top + new_height))

        # Resize to exactly 1200x630
        img = img.resize((1200, 630), self.RESAMPLING)

        buffer = BytesIO()
        img.save(buffer, format="JPEG", quality=85, optimize=True)
        return buffer.getvalue()
