"""Image pipeline service for Facebook Marketplace compatibility."""

from io import BytesIO

from PIL import Image

from prosell.domain.ports.i_image_pipeline import IImagePipeline


class ImagePipelineService(IImagePipeline):
    """Processes images for Facebook Marketplace using Pillow."""

    MAX_SIZE_BYTES = 1_000_000
    FB_MAX_WIDTH = 1080
    # Use Resampling.LANCZOS for Pillow 10+ compatibility
    try:
        LANCZOS = Image.Resampling.LANCZOS
    except AttributeError:
        LANCZOS = Image.LANCZOS  # type: ignore[attr-defined]

    async def process(self, image_bytes: bytes) -> bytes:
        """Compress, resize to 1080px, convert to JPG, strip EXIF. Returns processed bytes."""
        img: Image.Image = Image.open(BytesIO(image_bytes))

        # Handle palette mode (P) — convert to RGBA first to preserve transparency, then RGB
        if img.mode == "P":
            img = img.convert("RGBA")
        # Convert RGBA, CMYK, LA, and any non-RGB mode to RGB
        if img.mode != "RGB":
            img = img.convert("RGB")

        # Resize if wider than FB_MAX_WIDTH (never upscale)
        if img.width > self.FB_MAX_WIDTH:
            ratio = self.FB_MAX_WIDTH / img.width
            new_height = int(img.height * ratio)
            img = img.resize((self.FB_MAX_WIDTH, new_height), self.LANCZOS)

        # Save as JPEG at quality=85 (strips EXIF — Pillow doesn't copy EXIF when saving fresh)
        output = BytesIO()
        img.save(output, format="JPEG", quality=85, optimize=True)

        # Iterative quality reduction if still > 1MB
        if output.tell() > self.MAX_SIZE_BYTES:
            for quality in [75, 65, 55, 45]:
                output = BytesIO()
                img.save(output, format="JPEG", quality=quality, optimize=True)
                if output.tell() <= self.MAX_SIZE_BYTES:
                    break

        return output.getvalue()
