---
plan: "02"
phase: 1
wave: 1
depends_on: ["00"]
autonomous: true
files_modified:
  - apps/api/src/prosell/infrastructure/services/image_pipeline.py
  - apps/api/tests/unit/infrastructure/test_image_pipeline.py
requirements: [PUBLISH-10]
estimated_tasks: 2

must_haves:
  truths:
    - "RGBA PNG input is converted to RGB JPEG (no OSError on alpha channel)"
    - "Images wider than 1080px are resized maintaining aspect ratio"
    - "Output is always under 1MB (iterative quality reduction if needed)"
    - "Output JPEG has no EXIF data"
    - "All 4 unit tests in test_image_pipeline.py pass GREEN"
  artifacts:
    - path: "apps/api/src/prosell/infrastructure/services/image_pipeline.py"
      provides: "ImagePipelineService implementing IImagePipeline"
      exports: ["ImagePipelineService"]
  key_links:
    - from: "apps/api/src/prosell/infrastructure/services/image_pipeline.py"
      to: "Pillow (PIL)"
      via: "from PIL import Image"
      pattern: "from PIL import Image"
---

<objective>
Build the image processing pipeline that normalizes vehicle photos before Playwright uploads them to Facebook Marketplace.

Purpose: Scraper images can be PNG with transparency, WebP, CMYK, or >5MB. Facebook Marketplace has strict format/size requirements. This service is the gate between raw images and the publisher.
Output: ImagePipelineService (implements IImagePipeline) using Pillow — compress/resize/JPG/strip-EXIF.
</objective>

<execution_context>
@/home/rpadron/.claude/get-shit-done/workflows/execute-plan.md
@/home/rpadron/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-hybrid-publisher/01-RESEARCH.md
@apps/api/src/prosell/infrastructure/services/do_spaces_service.py
@apps/api/tests/unit/infrastructure/test_image_pipeline.py

<interfaces>
<!-- IImagePipeline port created in Plan 01 -->
From apps/api/src/prosell/domain/ports/i_image_pipeline.py:
```python
from abc import ABC, abstractmethod

class IImagePipeline(ABC):
    @abstractmethod
    async def process(self, image_bytes: bytes) -> bytes:
        """Compress, resize to 1080px, convert to JPG, strip EXIF. Returns processed bytes."""
```
</interfaces>
</context>

<tasks>

<task id="02-01" name="Task 1: Write failing tests for ImagePipelineService (RED)" tdd="true">
  <objective>Replace xfail stubs in test_image_pipeline.py with real failing tests that import the service and test actual behavior.</objective>
  <files>
    <modify>apps/api/tests/unit/infrastructure/test_image_pipeline.py</modify>
  </files>
  <behavior>
    - Test: RGBA PNG bytes → process() → RGB JPEG bytes (PIL.Image.open(result).mode == "RGB")
    - Test: image 2000px wide → process() → image 1080px wide (maintains aspect ratio)
    - Test: image 1200px wide → process() → image 1080px wide (resized down)
    - Test: image 800px wide → process() → image 800px wide (not upscaled)
    - Test: output bytes < 1_000_000 (1MB) for any valid input
    - Test: output JPEG has no EXIF data (piexif or exifread returns empty/None)
  </behavior>
  <implementation>
Replace the file content. Use `pytest.mark.asyncio` is not needed because `asyncio_mode=auto` is set in `pyproject.toml`.

Create synthetic test images using Pillow directly (no test fixtures on disk):

```python
"""Tests for ImagePipelineService — PUBLISH-10."""
import pytest
from io import BytesIO
from PIL import Image
from prosell.infrastructure.services.image_pipeline import ImagePipelineService


def make_image_bytes(width: int, height: int, mode: str = "RGB", format: str = "PNG") -> bytes:
    """Helper: create a synthetic image as bytes."""
    img = Image.new(mode, (width, height), color=(128, 64, 32) if mode != "RGBA" else (128, 64, 32, 200))
    output = BytesIO()
    img.save(output, format=format)
    return output.getvalue()


@pytest.fixture
def pipeline() -> ImagePipelineService:
    return ImagePipelineService()


async def test_image_pipeline_converts_rgba_to_rgb(pipeline):
    """PNG with alpha channel is converted to RGB JPEG without error."""
    rgba_bytes = make_image_bytes(800, 600, mode="RGBA")
    result = await pipeline.process(rgba_bytes)
    img = Image.open(BytesIO(result))
    assert img.mode == "RGB"
    assert img.format == "JPEG"


async def test_image_pipeline_resizes_wide_images(pipeline):
    """Images wider than 1080px are resized to 1080px maintaining aspect ratio."""
    wide_bytes = make_image_bytes(2000, 1000)
    result = await pipeline.process(wide_bytes)
    img = Image.open(BytesIO(result))
    assert img.width == 1080
    assert img.height == 540  # aspect ratio maintained: 1000 * (1080/2000)


async def test_image_pipeline_does_not_upscale_small_images(pipeline):
    """Images smaller than 1080px are NOT upscaled."""
    small_bytes = make_image_bytes(800, 600)
    result = await pipeline.process(small_bytes)
    img = Image.open(BytesIO(result))
    assert img.width == 800


async def test_image_pipeline_output_under_1mb(pipeline):
    """Output is always under 1MB."""
    large_bytes = make_image_bytes(1080, 1080)
    result = await pipeline.process(large_bytes)
    assert len(result) < 1_000_000


async def test_image_pipeline_strips_exif(pipeline):
    """EXIF data is stripped from output JPEG."""
    jpeg_bytes = make_image_bytes(800, 600, format="JPEG")
    result = await pipeline.process(jpeg_bytes)
    img = Image.open(BytesIO(result))
    exif_data = img.getexif()
    assert len(exif_data) == 0
```

Run tests first — they should FAIL (ImportError since service doesn't exist yet).
  </implementation>
  <verify>
    <automated>cd /home/rpadron/proy/prosell-sass/apps/api && uv run pytest tests/unit/infrastructure/test_image_pipeline.py -v --tb=short 2>&1 | grep -E "FAILED|ERROR|ImportError" | head -5</automated>
  </verify>
</task>

<task id="02-02" name="Task 2: Implement ImagePipelineService (GREEN)" tdd="true">
  <objective>Implement ImagePipelineService so all 5 tests pass.</objective>
  <files>
    <create>apps/api/src/prosell/infrastructure/services/image_pipeline.py</create>
  </files>
  <behavior>
    - All 5 tests from Task 1 must pass
    - Service is async (async def process) matching IImagePipeline contract
    - No external network calls — pure in-memory processing
  </behavior>
  <implementation>
Follow the exact Pattern 4 from RESEARCH.md. Key implementation details:

```python
"""Image pipeline service for Facebook Marketplace compatibility."""
from io import BytesIO
from PIL import Image
from prosell.domain.ports.i_image_pipeline import IImagePipeline


class ImagePipelineService(IImagePipeline):
    """Processes images for Facebook Marketplace using Pillow."""

    MAX_SIZE_BYTES = 1_000_000
    FB_MAX_WIDTH = 1080

    async def process(self, image_bytes: bytes) -> bytes:
        img = Image.open(BytesIO(image_bytes))

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
            img = img.resize((self.FB_MAX_WIDTH, new_height), Image.LANCZOS)

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
```

Note on EXIF stripping: When Pillow saves an image with `Image.save()` without passing the original `exif=` data, the output has no EXIF. This is automatic — no need for `piexif` to explicitly strip.
  </implementation>
  <verify>
    <automated>cd /home/rpadron/proy/prosell-sass/apps/api && uv run pytest tests/unit/infrastructure/test_image_pipeline.py -v --tb=short</automated>
  </verify>
</task>

</tasks>

<verification>
After all tasks complete:

1. `uv run pytest tests/unit/infrastructure/test_image_pipeline.py -v` — all 5 tests GREEN
2. `uv run pytest tests/unit/ -x --tb=short` — full unit suite passes
</verification>

<success_criteria>
- [ ] `ImagePipelineService` implements `IImagePipeline` ABC
- [ ] RGBA → RGB conversion works without OSError
- [ ] Images wider than 1080px are resized, narrower images are not upscaled
- [ ] Output is always under 1MB
- [ ] EXIF is stripped from output
- [ ] All 5 tests GREEN
</success_criteria>

<output>
After completion, create `.planning/phases/01-hybrid-publisher/01-02-SUMMARY.md`
</output>
