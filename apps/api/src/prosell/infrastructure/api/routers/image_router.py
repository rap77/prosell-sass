"""Image upload router for vehicle/product images.

Provides presigned URLs for direct cloud upload and polling for
server-side processing status.
"""

import logging
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile, status
from pydantic import BaseModel

from prosell.application.dto.image import (
    ImageUploadResponse,
    ImageUploadUrlRequest,
    ImageUploadUrlResponse,
)
from prosell.application.ports.ido_spaces import IDOSpacesService
from prosell.domain.entities.user import User
from prosell.domain.repositories.organization_repository import (
    AbstractOrganizationRepository,
)
from prosell.infrastructure.api.dependencies import (
    get_current_auth_user_from_cookie,
    get_organization_repository,
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


async def sign_image_urls(
    image_urls: list[str],
    spaces: IDOSpacesService,
    tenant_id: UUID | None = None,
) -> list[str]:
    """Replace each raw storage URL in `image_urls` with a presigned download URL.

    The DB stores raw internal-endpoint URLs (e.g. http://minio:9000/...
    in dev, or https://{bucket}.{region}.digitaloceanspaces.com/... in prod).
    Browsers cannot fetch objects from the private bucket without a valid
    signature, and the signature is host-bound — it must be issued by the
    signer that points at the host the browser will use (the public endpoint).

    The signer inside DOSpacesService handles the host binding: when
    `s3_public_endpoint_url` is set, generate_download_url signs against that
    public host, so the returned URL is valid for the browser.

    SECURITY: When `tenant_id` is provided, every extracted key MUST start
    with `orgs/{tenant_id}/` — otherwise the entry is dropped. This prevents
    a caller from minting presigned URLs for another tenant's objects
    (which would be a cross-tenant data exposure if `image_urls` is
    attacker-controllable, e.g. via UpdateProductRequest).

    Unparseable URLs (those that don't contain the bucket name) are also
    dropped, not echoed back. This fail-closed behavior blocks an attacker
    from smuggling external URLs through the response.
    """
    signed: list[str] = []
    tenant_prefix = f"orgs/{tenant_id}/" if tenant_id is not None else None
    for url in image_urls:
        try:
            key = url.split(f"{spaces.bucket}/", 1)[1]
        except (IndexError, AttributeError):
            # Fail-closed: drop the entry. Don't echo the original URL.
            continue
        if tenant_prefix is not None and not key.startswith(tenant_prefix):
            # Cross-tenant key: drop, never sign.
            continue
        signed.append(await spaces.generate_download_url(key))
    return signed


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
        upload_url=str(result["upload_url"]),
        public_url=str(result["public_url"]),
        key=str(result["key"]),
        file_id=file_id,
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
            # Return a presigned URL so the browser can fetch from the private
            # bucket. The signer inside DOSpacesService uses the public endpoint
            # (e.g. http://localhost:9000) so the signature matches the host
            # the browser will use.
            signed_url = await spaces.generate_download_url(key)
            return ImageStatusResponse(
                status="complete",
                url=signed_url,
            )

    return ImageStatusResponse(status="pending")


# Dependencies
async def get_image_optimizer() -> ImageOptimizer:
    """Return ImageOptimizer instance (JPEG output).

    Returns:
        ImageOptimizer service instance
    """
    return ImageOptimizer()


async def get_storage_optimizer() -> ImageOptimizer:
    """Return an ImageOptimizer that outputs WebP for the storage path.

    Stored objects use WebP (~25-35% smaller than JPEG) to cut DO Spaces cost.
    The publish path re-encodes to JPEG on the fly, so WebP storage is safe.
    """
    return ImageOptimizer(output_format="WEBP")


@router.post("/optimize", status_code=status.HTTP_200_OK, response_class=Response)
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
        Response with optimized image bytes (JPEG format)

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
            detail=f"Image optimization failed: {e!s}",
        ) from e


@router.post(
    "/upload",
    response_model=ImageUploadResponse,
    summary="Upload and optimize vehicle image",
)
async def upload_image(
    file: Annotated[UploadFile, File()],
    current_user: Annotated[User, Depends(get_current_auth_user_from_cookie)],
    optimizer: Annotated[ImageOptimizer, Depends(get_storage_optimizer)],
    spaces: Annotated[IDOSpacesService, Depends(get_spaces_service)],
    org_repository: Annotated[AbstractOrganizationRepository, Depends(get_organization_repository)],
    organization_id: Annotated[UUID | None, Form()] = None,
) -> ImageUploadResponse:
    """
    Upload, optimize, and store vehicle/product image.

    Flow:
    1. Receive file from frontend
    2. Optimize with ImageOptimizer (resize, compress, strip EXIF)
    3. Upload optimized bytes to DO Spaces
    4. Return public URL

    This replaces the presigned URL flow for better control over optimization.
    """
    if not current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User does not have an associated organization",
        )

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
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Image optimization failed: {e!s}",
        ) from e

    # Generate file path
    # ponytail: super_admin can upload to a different org's bucket (cross-org product
    # creation). We validate the target org server-side (exists + can operate) so a
    # compromised super_admin cannot push to arbitrary UUIDs — only to real, active orgs.
    target_tenant = current_user.tenant_id
    if organization_id and current_user.has_role("super_admin"):
        target_org = await org_repository.get_by_tenant_id(organization_id)
        if target_org is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Organization {organization_id} not found",
            )
        if not target_org.status.can_operate():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Organization {target_org.name} is "
                    f"{target_org.status.value} and cannot receive uploads"
                ),
            )
        target_tenant = organization_id
    file_id = str(uuid4())
    ext = ".webp"  # Storage path outputs WebP (see get_storage_optimizer)
    file_path = f"orgs/{target_tenant}/vehicles/{file_id}{ext}"

    logger.info(
        "Uploading optimized image: %s (original: %d bytes, optimized: %d bytes)",
        file_path,
        len(file_bytes),
        len(optimized_bytes),
    )

    # Upload to DO Spaces
    try:
        await spaces.upload_file(
            file_path=file_path,
            file_bytes=optimized_bytes,
            content_type="image/webp",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload to storage: {e!s}",
        ) from e

    # Return a presigned URL so the browser can fetch the just-uploaded object
    # from the private bucket. The signer inside DOSpacesService uses the public
    # endpoint (e.g. http://localhost:9000) so the signature matches the host
    # the browser will use.
    signed_url = await spaces.generate_download_url(file_path)

    # Also return the raw storage key so the frontend can persist it in
    # `product.image_urls` (the storage layer is opaque; the DB stores
    # bare keys, the browser receives signed URLs derived from those keys).
    return ImageUploadResponse(url=signed_url, key=file_path)
