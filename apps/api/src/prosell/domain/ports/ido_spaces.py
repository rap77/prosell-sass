"""DO Spaces service port interface."""

from abc import ABC, abstractmethod


class StorageUploadError(Exception):
    """Raised when a storage backend fails to upload a file.

    Implementations wrap their own client/network exceptions (e.g.
    botocore's ClientError/BotoCoreError) into this port-level type so
    callers can catch a specific, documented failure mode instead of a
    bare Exception.
    """


class StorageReadError(Exception):
    """Raised when a storage backend fails to read an object's bytes.

    Implementations wrap their own client/network exceptions (e.g.
    botocore's ClientError/BotoCoreError) into this port-level type so
    callers can catch a specific, documented failure mode instead of a
    bare Exception.
    """


class IDOSpacesService(ABC):
    """Interface for DigitalOcean Spaces storage service."""

    # Service configuration attributes
    endpoint: str
    bucket: str

    @abstractmethod
    async def generate_presigned_url(
        self,
        file_path: str,
        content_type: str,
        max_size_bytes: int = 2_000_000,
        make_public: bool = False,
    ) -> dict[str, str | int]:
        """
        Generate a presigned URL for direct upload from browser.

        Args:
            file_path: Path where file will be stored (e.g., "orgs/{org_id}/logo/file.jpg")
            content_type: MIME type of the file (e.g., "image/jpeg")
            max_size_bytes: Maximum file size in bytes (default 2MB)
            make_public: If True, require public-read ACL in upload

        Returns:
            Dict with keys:
                - upload_url: Presigned URL for PUT request (str)
                - public_url: Public URL after upload (str)
                - key: Storage key (str)
                - max_size_bytes: Maximum allowed file size in bytes (int)
        """
        pass

    @abstractmethod
    async def delete_file(self, key: str) -> bool:
        """
        Delete a file from Spaces.

        Args:
            key: Storage key of the file to delete

        Returns:
            True if deleted, False otherwise
        """
        pass

    @abstractmethod
    async def check_file_exists(self, key: str) -> bool:
        """
        Check if a file exists in Spaces.

        Args:
            key: Storage key to check

        Returns:
            True if file exists, False otherwise
        """
        pass

    @abstractmethod
    async def upload_file(
        self,
        file_path: str,
        file_bytes: bytes,
        content_type: str = "image/jpeg",
        make_public: bool = False,
    ) -> str:
        """
        Upload a file directly to Spaces (server-side upload).

        Args:
            file_path: Path where file will be stored (e.g., "orgs/{org_id}/vehicles/file.jpg")
            file_bytes: File content as bytes
            content_type: MIME type of the file (default: "image/jpeg")
            make_public: If True, set ACL to public-read for WhatsApp/OG sharing

        Returns:
            Public URL of the uploaded file
        """
        pass

    @abstractmethod
    async def generate_download_url(self, key: str, expires_in: int = 3600) -> str:
        """
        Generate a presigned URL for downloading a private file.

        Args:
            key: Storage key (e.g., "orgs/{org_id}/vehicles/file.jpg")
            expires_in: Seconds until URL expires (default 1 hour)

        Returns:
            Presigned URL valid for downloading the file
        """
        pass

    @abstractmethod
    async def generate_cdn_download_url(self, key: str, expires_in: int | None = None) -> str:
        """
        Generate a presigned URL against the CDN endpoint.

        Used for the catalog-grid cover-thumbnail flow (FR3.1, FR5.1):
        the browser fetches the thumbnail from the configured CDN, the
        CDN caches the response and proxies the first request to the
        origin. The signature is host-bound — signing against a host
        the browser will NOT use yields an invalid signature, so we
        sign against the CDN host explicitly.

        Args:
            key: Storage key (e.g., "orgs/{org_id}/products/{uuid}-thumb.webp")
            expires_in: Seconds until URL expires. Defaults to the
                implementation's default (15 minutes, per OQ2).

        Returns:
            Presigned URL valid for downloading the file from the CDN.

        Raises:
            StorageUploadError: If the CDN endpoint is not configured
                (NFR5.1 fail-fast — the CDN signer cannot be created
                without a CDN host).
        """
        pass

    @abstractmethod
    async def get_object(self, key: str) -> bytes:
        """
        Read a file's raw bytes from Spaces.

        Args:
            key: Storage key of the file to read

        Returns:
            The file's raw bytes.

        Raises:
            StorageReadError: If the object doesn't exist or the read fails.
        """
        pass

    @abstractmethod
    def get_public_url(self, key: str) -> str:
        """
        Generate direct public URL for a file (no signed params).

        Use this for Open Graph meta tags where simple URLs work better
        than signed URLs with WhatsApp/Facebook scrapers.

        Args:
            key: Storage key (e.g., "orgs/{org_id}/products/{id}/image.jpg")

        Returns:
            Direct public URL (e.g., "https://region.digitaloceanspaces.com/bucket/key")
        """
        pass
