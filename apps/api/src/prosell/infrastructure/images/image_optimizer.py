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

    def __init__(
        self,
        max_width: int = 1920,
        max_height: int = 1080,
        jpeg_quality: int = 85,
    ):
        """
        Initialize ImageOptimizer with configuration.

        Args:
            max_width: Maximum width in pixels (default: 1920)
            max_height: Maximum height in pixels (default: 1080)
            jpeg_quality: JPEG quality 1-100 (default: 85)
        """
        self.max_width = max_width
        self.max_height = max_height
        self.jpeg_quality = jpeg_quality

    async def process(self, image_bytes: bytes) -> bytes:
        """
        Compress, resize to max dimensions, convert to JPG, strip EXIF.

        Args:
            image_bytes: Raw image bytes

        Returns:
            Processed image bytes (JPEG format)
        """
        # Load image from bytes
        img = Image.open(BytesIO(image_bytes))

        # Convert RGBA to RGB if necessary (removes alpha channel)
        if img.mode == "RGBA":
            # Create white background for transparent images
            background = Image.new("RGB", img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[3])  # Use alpha channel as mask
            img = background
        elif img.mode not in ("RGB", "L"):
            img = img.convert("RGB")

        # Get original dimensions
        width, height = img.size

        # Check if resizing is needed
        if width > self.max_width or height > self.max_height:
            # Calculate aspect ratio
            aspect_ratio = width / height

            # Determine new dimensions maintaining aspect ratio
            if width > height:
                # Width is the limiting factor
                new_width = self.max_width
                new_height = int(self.max_width / aspect_ratio)
            else:
                # Height is the limiting factor
                new_height = self.max_height
                new_width = int(self.max_height * aspect_ratio)

            # Resize using LANCZOS resampling for high quality
            img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

        # Save to bytes as JPEG with compression (strips EXIF automatically)
        buffer = BytesIO()
        img.save(buffer, format="JPEG", quality=self.jpeg_quality, optimize=True)
        return buffer.getvalue()
