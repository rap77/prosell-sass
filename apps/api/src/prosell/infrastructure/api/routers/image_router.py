"""Image upload router for vehicle/product images.

Provides presigned URLs for direct cloud upload and polling for
server-side processing status.
"""

import logging
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from pydantic import BaseModel

from prosell.application.dto.image import ImageUploadUrlRequest, ImageUploadUrlResponse
from prosell.application.ports.ido_spaces import IDOSpacesService
from prosell.domain.entities.user import User
from prosell.infrastructure.api.dependencies import (
    get_current_auth_user_from_cookie,
    get_spaces_service,
)
from prosell.infrastructure.images.image_optimizer import ImageOptimizer

router = APIRouter(prefix="/images", tags=["images"])

logger = logging.getLogger(__name__)

_IMAGE_EXTENSIONS = {
    "image/png": ".png",
    "image/webp": ".webp",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
}


class ImageStatusResponse(BaseModel):
    """Response for image upload processing state."""

    status: str
    url: str | None = None


@router.post(
    "/upload-url",
    response_model=ImageUploadUrlResponse,
    summary="Generate presigned URL for vehicle image upload",
)
async def generate_image_upload_url(
    request: ImageUploadUrlRequest,
    current_user: Annotated[User, Depends(get_current_auth_user_from_cookie)],
    spaces: Annotated[IDOSpacesService, Depends(get_spaces_service)],
) -> ImageUploadUrlResponse:
    """
    Generate a presigned PUT URL for uploading vehicle/product images
    directly to DO Spaces from the browser.

    Flow:
    1. Frontend calls this endpoint with content_type
    2. Frontend PUTs the file directly to upload_url
    3. Frontend reads public_url and attaches it to vehicle payload
    """
    if not current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User does not have an associated organization",
        )

    file_id = str(uuid4())
    content_type = request.content_type or "image/jpeg"
    ext = _IMAGE_EXTENSIONS.get(content_type, ".jpg")

    file_path = f"orgs/{current_user.tenant_id}/vehicles/{file_id}{ext}"

    logger.info(f"Image upload URL requested: {file_path} (type={content_type})")

    result = await spaces.generate_presigned_url(
        file_path=file_path,
        content_type=content_type,
        max_size_bytes=10_000_000,  # 10MB
    )

    return ImageUploadUrlResponse(
        upload_url=result["upload_url"],
        public_url=result["public_url"],
        key=result["key"],
        fileId=file_id,
    )


@router.get(
    "/status/{file_id}",
    response_model=ImageStatusResponse,
    summary="Check image processing status",
)
async def get_image_status(
    file_id: str,
    current_user: Annotated[User, Depends(get_current_auth_user_from_cookie)],
    spaces: Annotated[IDOSpacesService, Depends(get_spaces_service)],
) -> ImageStatusResponse:
    """
    Check if an uploaded image has been processed.

    For initial implementation, images are uploaded directly to cloud
    without server-side processing. Returns "complete" if file exists,
    "pending" if not yet uploaded.
    """
    for ext in _IMAGE_EXTENSIONS.values():
        key = f"orgs/{current_user.tenant_id}/vehicles/{file_id}{ext}"
        if await spaces.check_file_exists(key):
            return ImageStatusResponse(
                status="complete",
                url=f"{spaces.endpoint}/{spaces.bucket}/{key}",
            )

    return ImageStatusResponse(status="pending")


# Dependencies
async def get_image_optimizer() -> ImageOptimizer:
    """Return ImageOptimizer instance."""
    return ImageOptimizer()


@router.post("/optimize", status_code=status.HTTP_200_OK)
async def optimize_image(
    file: Annotated[UploadFile, File()],
    optimizer: Annotated[ImageOptimizer, Depends(get_image_optimizer)],
) -> Response:
    """
    Optimize uploaded image.

    Performs:
    - Resize to max 1920x1080 pixels (maintaining aspect ratio)
    - JPEG compression at 85% quality
    - Strip EXIF metadata
    - Remove alpha channel (convert RGBA to RGB)

    Args:
        file: Uploaded image file
        optimizer: ImageOptimizer service

    Returns:
        Optimized image bytes (JPEG format)

    Raises:
        HTTPException: If file is invalid or optimization fails
    """
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image",
        )

    # Read file bytes
    file_bytes = await file.read()

    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is empty",
        )

    # Optimize image
    try:
        optimized_bytes = await optimizer.process(file_bytes)
        return Response(content=optimized_bytes, media_type="image/jpeg")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Image optimization failed: {str(e)}",
        ) from e
