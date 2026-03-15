"""Tests for ImagePipelineService — PUBLISH-10."""

from io import BytesIO

import pytest
from PIL import Image

from prosell.infrastructure.services.image_pipeline import ImagePipelineService


def make_image_bytes(width: int, height: int, mode: str = "RGB", fmt: str = "PNG") -> bytes:
    """Helper: create a synthetic image as bytes."""
    color = (128, 64, 32, 200) if mode == "RGBA" else (128, 64, 32)
    img = Image.new(mode, (width, height), color=color)
    output = BytesIO()
    img.save(output, format=fmt)
    return output.getvalue()


@pytest.fixture
def pipeline() -> ImagePipelineService:
    return ImagePipelineService()


@pytest.mark.asyncio
async def test_image_pipeline_converts_rgba_to_rgb(pipeline: ImagePipelineService) -> None:
    """PNG with alpha channel is converted to RGB JPEG without error."""
    rgba_bytes = make_image_bytes(800, 600, mode="RGBA")
    result = await pipeline.process(rgba_bytes)
    img = Image.open(BytesIO(result))
    assert img.mode == "RGB"
    assert img.format == "JPEG"


@pytest.mark.asyncio
async def test_image_pipeline_resizes_wide_images(pipeline: ImagePipelineService) -> None:
    """Images wider than 1080px are resized to 1080px maintaining aspect ratio."""
    wide_bytes = make_image_bytes(2000, 1000)
    result = await pipeline.process(wide_bytes)
    img = Image.open(BytesIO(result))
    assert img.width == 1080
    assert img.height == 540  # aspect ratio maintained: 1000 * (1080/2000)


@pytest.mark.asyncio
async def test_image_pipeline_does_not_upscale_small_images(
    pipeline: ImagePipelineService,
) -> None:
    """Images smaller than 1080px are NOT upscaled."""
    small_bytes = make_image_bytes(800, 600)
    result = await pipeline.process(small_bytes)
    img = Image.open(BytesIO(result))
    assert img.width == 800


@pytest.mark.asyncio
async def test_image_pipeline_output_under_1mb(pipeline: ImagePipelineService) -> None:
    """Output is always under 1MB."""
    large_bytes = make_image_bytes(1080, 1080)
    result = await pipeline.process(large_bytes)
    assert len(result) < 1_000_000


@pytest.mark.asyncio
async def test_image_pipeline_strips_exif(pipeline: ImagePipelineService) -> None:
    """EXIF data is stripped from output JPEG."""
    jpeg_bytes = make_image_bytes(800, 600, fmt="JPEG")
    result = await pipeline.process(jpeg_bytes)
    img = Image.open(BytesIO(result))
    exif_data = img.getexif()
    assert len(exif_data) == 0
