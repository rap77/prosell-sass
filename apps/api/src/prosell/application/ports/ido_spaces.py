"""DO Spaces service port interface."""

from abc import ABC, abstractmethod


class IDOSpacesService(ABC):
    """Interface for DigitalOcean Spaces storage service."""

    @abstractmethod
    async def generate_presigned_url(
        self,
        file_path: str,
        content_type: str,
        max_size_bytes: int = 2_000_000,
    ) -> dict[str, str | int]:
        """
        Generate a presigned URL for direct upload from browser.

        Args:
            file_path: Path where file will be stored (e.g., "orgs/{org_id}/logo/file.jpg")
            content_type: MIME type of the file (e.g., "image/jpeg")
            max_size_bytes: Maximum file size in bytes (default 2MB)

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
