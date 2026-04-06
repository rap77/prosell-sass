"""Image upload router for vehicle/product images.

Provides presigned URLs for direct cloud upload and polling for
server-side processing status.
"""

import logging
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status

from prosell.application.dto.image import ImageUploadUrlRequest, ImageUploadUrlResponse
from prosell.application.ports.ido_spaces import IDOSpacesService
from prosell.infrastructure.api.dependencies import (
    get_current_auth_user_from_cookie,
    get_spaces_service,
)

router = APIRouter(prefix="/images", tags=["images"])

logger = logging.getLogger(__name__)

_IMAGE_EXTENSIONS = {
    "image/png": ".png",
    "image/webp": ".webp",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
}


@router.post(
    "/upload-url",
    response_model=ImageUploadUrlResponse,
    summary="Generate presigned URL for vehicle image upload",
)
async def generate_image_upload_url(
    request: ImageUploadUrlRequest,
    current_user=Depends(get_current_auth_user_from_cookie),
    spaces: IDOSpacesService = Depends(get_spaces_service),
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
    summary="Check image processing status",
)
async def get_image_status(
    file_id: str,
    current_user=Depends(get_current_auth_user_from_cookie),
    spaces: IDOSpacesService = Depends(get_spaces_service),
) -> dict:
    """
    Check if an uploaded image has been processed.

    For initial implementation, images are uploaded directly to cloud
    without server-side processing. Returns "complete" if file exists,
    "pending" if not yet uploaded.
    """
    for ext in _IMAGE_EXTENSIONS.values():
        key = f"orgs/{current_user.tenant_id}/vehicles/{file_id}{ext}"
        if await spaces.check_file_exists(key):
            return {
                "status": "complete",
                "url": f"{spaces.endpoint}/{spaces.bucket}/{key}",
            }

    return {"status": "pending"}
