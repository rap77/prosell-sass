"""Image pipeline port — PUBLISH-10."""

from abc import ABC, abstractmethod


class IImagePipeline(ABC):
    @abstractmethod
    async def process(self, image_bytes: bytes) -> bytes:
        """Compress, resize to 1080px, convert to JPG, strip EXIF. Returns processed bytes."""
