"""DigitalOcean Spaces integration for file storage."""

from uuid import uuid4

import boto3
from botocore.client import Config

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
        self.region = region or settings.DO_REGION  # type: ignore[attr-defined]
        self.bucket = bucket_name or settings.DO_BUCKET_NAME  # type: ignore[attr-defined]
        access_key_id = access_key or settings.DO_ACCESS_KEY_ID  # type: ignore[attr-defined]
        secret_access_key = secret_key or settings.DO_SECRET_ACCESS_KEY  # type: ignore[attr-defined]

        self.endpoint = f"https://{self.region}.digitaloceanspaces.com"  # type: ignore[call-arg]

        self.s3_client = boto3.client(  # type: ignore[call-arg]
            "s3",
            endpoint_url=self.endpoint,
            aws_access_key_id=access_key_id,  # type: ignore[arg-type]
            aws_secret_access_key=secret_access_key,  # type: ignore[arg-type]
            config=Config(signature_version="s3v4"),
        )

    async def generate_presigned_url(
        self,
        file_path: str,
        content_type: str,
        max_size_bytes: int = 2_000_000,
    ) -> dict[str, str]:
        """
        Generate presigned URL for direct upload from browser.

        Args:
            file_path: Path where file will be stored
            content_type: MIME type of the file
            max_size_bytes: Maximum file size (default 2MB)

        Returns:
            Dict with upload_url, public_url, key, and max_size_bytes

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

        # Generate presigned URL for PUT operation
        url = self.s3_client.generate_presigned_url(  # type: ignore[call-arg]
            "put_object",
            Params={
                "Bucket": self.bucket,  # type: ignore[dict-item]
                "Key": key,
                "ContentType": content_type,
            },
            ExpiresIn=3600,  # 1 hour
            HttpMethod="PUT",
        )

        public_url = f"{self.endpoint}/{self.bucket}/{key}"  # type: ignore[call-arg]

        return {
            "upload_url": url,
            "public_url": public_url,
            "key": key,
            "max_size_bytes": max_size_bytes,  # type: ignore[dict-item]
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
            self.s3_client.delete_object(  # type: ignore[call-arg]
                Bucket=self.bucket,  # type: ignore[dict-item]
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
            self.s3_client.head_object(  # type: ignore[call-arg]
                Bucket=self.bucket,  # type: ignore[dict-item]
                Key=key,
            )
            return True
        except self.s3_client.exceptions.ClientError:  # type: ignore[attr-defined]
            return False
        except Exception:
            return False


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
