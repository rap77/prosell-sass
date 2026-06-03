"""DigitalOcean Spaces integration for file storage."""

import asyncio
from uuid import uuid4

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

from prosell.application.ports.ido_spaces import IDOSpacesService
from prosell.core.config import settings


class DOSpacesService(IDOSpacesService):
    """DigitalOcean Spaces integration for file storage."""

    def __init__(
        self,
        region: str | None = None,
        bucket_name: str | None = None,
        access_key: str | None = None,
        secret_key: str | None = None,
    ) -> None:
        self.region = region or settings.do_region
        self.bucket = bucket_name or settings.do_bucket_name
        access_key_id = access_key or settings.do_access_key_id
        secret_access_key = secret_key or settings.do_secret_access_key

        self.endpoint = f"https://{self.region}.digitaloceanspaces.com"

        self.s3_client = boto3.client(
            "s3",
            endpoint_url=self.endpoint,
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
            config=Config(signature_version="s3v4"),
        )

    async def generate_presigned_url(
        self,
        file_path: str,
        content_type: str,
        max_size_bytes: int = 2_000_000,
    ) -> dict[str, str | int]:
        """
        Generate presigned URL for direct upload from browser.

        Args:
            file_path: Path where file will be stored
            content_type: MIME type of the file
            max_size_bytes: Maximum file size (default 2MB)

        Returns:
            Dict with upload_url, public_url, key (str) and max_size_bytes (int)

        Raises:
            ValueError: If max_size_bytes exceeds configured maximum
        """
        # Validate file size limit (max 10MB)
        max_allowed_size = 10_000_000  # 10MB hard limit
        if max_size_bytes > max_allowed_size:
            raise ValueError(
                f"Requested file size {max_size_bytes} bytes exceeds "
                f"maximum allowed size of {max_allowed_size} bytes"
            )

        key = file_path

        # Generate presigned URL for PUT operation (run sync boto3 call in thread pool)
        url = await asyncio.to_thread(
            lambda: self.s3_client.generate_presigned_url(
                "put_object",
                Params={
                    "Bucket": self.bucket,
                    "Key": key,
                    "ContentType": content_type,
                },
                ExpiresIn=3600,  # 1 hour
                HttpMethod="PUT",
            )
        )

        public_url = f"{self.endpoint}/{self.bucket}/{key}"

        return {
            "upload_url": url,
            "public_url": public_url,
            "key": key,
            "max_size_bytes": max_size_bytes,
        }

    async def delete_file(self, key: str) -> bool:
        """
        Delete a file from Spaces.

        Args:
            key: Storage key of the file to delete

        Returns:
            True if deleted, False otherwise
        """
        try:
            await asyncio.to_thread(
                self.s3_client.delete_object,
                Bucket=self.bucket,
                Key=key,
            )
            return True
        except Exception:
            return False

    async def check_file_exists(self, key: str) -> bool:
        """
        Check if a file exists in Spaces.

        Args:
            key: Storage key to check

        Returns:
            True if file exists, False otherwise
        """
        try:
            await asyncio.to_thread(
                self.s3_client.head_object,
                Bucket=self.bucket,
                Key=key,
            )
            return True
        except ClientError:
            return False

    async def upload_file(
        self,
        file_path: str,
        file_bytes: bytes,
        content_type: str = "image/jpeg",
    ) -> str:
        """
        Upload a file directly to Spaces (server-side upload).

        Args:
            file_path: Path where file will be stored
            file_bytes: File content as bytes
            content_type: MIME type of the file

        Returns:
            Public URL of the uploaded file
        """
        key = file_path

        # Upload file to Spaces (run sync boto3 call in thread pool)
        await asyncio.to_thread(
            lambda: self.s3_client.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=file_bytes,
                ContentType=content_type,
            )
        )

        # Return public URL
        public_url = f"{self.endpoint}/{self.bucket}/{key}"
        return public_url

    async def generate_download_url(self, key: str, expires_in: int = 3600) -> str:
        """
        Generate a presigned URL for downloading a private file.

        Args:
            key: Storage key (e.g., "orgs/{org_id}/vehicles/file.jpg")
            expires_in: Seconds until URL expires (default 1 hour)

        Returns:
            Presigned URL valid for downloading the file
        """
        url = await asyncio.to_thread(
            lambda: self.s3_client.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": self.bucket,
                    "Key": key,
                },
                ExpiresIn=expires_in,
            )
        )
        return url


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================


def generate_logo_path(org_id: str, filename: str | None = None) -> str:
    """
    Generate storage path for organization logo.

    Args:
        org_id: Organization UUID
        filename: Optional filename (auto-generated if None)

    Returns:
        Storage key path (e.g., "orgs/{org_id}/logo/{uuid}.jpg")
    """
    if filename is None:
        # Auto-generate with UUID and generic extension
        filename = f"{uuid4()}.jpg"

    return f"orgs/{org_id}/logo/{filename}"


def generate_banner_path(org_id: str, filename: str | None = None) -> str:
    """
    Generate storage path for organization banner.

    Args:
        org_id: Organization UUID
        filename: Optional filename (auto-generated if None)

    Returns:
        Storage key path
    """
    if filename is None:
        filename = f"{uuid4()}.jpg"

    return f"orgs/{org_id}/banner/{filename}"


def generate_product_image_path(org_id: str, product_id: str, filename: str) -> str:
    """
    Generate storage path for product image.

    Args:
        org_id: Organization UUID
        product_id: Product UUID
        filename: Original filename

    Returns:
        Storage key path
    """
    # Sanitize filename
    safe_filename = filename.replace(" ", "_").lower()
    return f"orgs/{org_id}/products/{product_id}/{safe_filename}"
