"""DigitalOcean Spaces integration for file storage."""

import asyncio
import logging
from typing import Any, Final
from uuid import uuid4

import boto3
from botocore.client import Config
from botocore.exceptions import BotoCoreError, ClientError

from prosell.application.ports.ido_spaces import (
    IDOSpacesService,
    StorageReadError,
    StorageUploadError,
)
from prosell.core.config import settings

logger = logging.getLogger(__name__)


class DOSpacesService(IDOSpacesService):
    """DigitalOcean Spaces integration for file storage."""

    # ponytail: OQ2 — signed private URLs default to 15 minutes,
    # consistent with GET /products/{id}/image-urls. Configurable via
    # constructor for tests; never exposed via env var (signed URL
    # lifetimes are an application-layer concern, not an infrastructure
    # one).
    DEFAULT_SIGNED_URL_EXPIRES_IN: Final[int] = 15 * 60  # 15 minutes

    def __init__(
        self,
        region: str | None = None,
        bucket_name: str | None = None,
        access_key: str | None = None,
        secret_key: str | None = None,
        endpoint_url: str | None = None,
        public_endpoint_url: str | None = None,
        cdn_endpoint: str | None = None,
        force_path_style: bool | None = None,
    ) -> None:
        self.region = region or settings.do_region
        self.bucket = bucket_name or settings.do_bucket_name
        access_key_id = access_key or settings.do_access_key_id
        secret_access_key = secret_key or settings.do_secret_access_key

        # Allow explicit override via constructor (used in tests) or env var
        # (used in docker-compose for MinIO). Defaults to the DO Spaces endpoint.
        override_endpoint = endpoint_url if endpoint_url is not None else settings.s3_endpoint_url
        override_public_endpoint = (
            public_endpoint_url
            if public_endpoint_url is not None
            else settings.s3_public_endpoint_url
        )
        override_cdn_endpoint = (
            cdn_endpoint if cdn_endpoint is not None else settings.do_cdn_endpoint
        )
        use_path_style = (
            force_path_style if force_path_style is not None else settings.s3_force_path_style
        )

        if override_endpoint:
            self.endpoint = override_endpoint
        else:
            self.endpoint = f"https://{self.region}.digitaloceanspaces.com"

        # Any is justified here: values are unpacked as **kwargs into
        # botocore.client.Config, whose many optional params have distinct
        # types (str, float, bool, Mapping) — dict[str, object] fails
        # pyright's **kwargs argument matching against that signature.
        boto_config_kwargs: dict[str, Any] = {"signature_version": "s3v4"}
        if use_path_style:
            boto_config_kwargs["s3"] = {"addressing_style": "path"}

        boto_config = Config(**boto_config_kwargs)

        self.s3_client = boto3.client(
            "s3",
            region_name=self.region,
            endpoint_url=self.endpoint,
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
            config=boto_config,
        )

        # Signer client: signs presigned URLs against the host the browser will use
        # (the PUBLIC endpoint), not the internal docker network endpoint. In dev
        # with MinIO these differ (http://minio:9000 vs http://localhost:9000); in
        # prod with DO Spaces they're the same, so we reuse the same client.
        if override_public_endpoint and override_public_endpoint != self.endpoint:
            self.s3_signer = boto3.client(
                "s3",
                region_name=self.region,
                endpoint_url=override_public_endpoint,
                aws_access_key_id=access_key_id,
                aws_secret_access_key=secret_access_key,
                config=boto_config,
            )
            # ponytail: public_endpoint is what the browser uses to fetch
            # files; the docker-network endpoint is unreachable from outside
            # the compose stack. Without this, public URLs saved in DB point
            # at "prosell-staging-minio" and the browser can't resolve them.
            self.public_endpoint = override_public_endpoint
        else:
            self.s3_signer = self.s3_client
            self.public_endpoint = self.endpoint

        # CDN signer: signs presigned URLs against the configured CDN host.
        # FR3.1, NFR5.1 — the browser fetches signed URLs from the CDN so
        # the CDN caches and serves from origin on miss. Without this, the
        # browser would hit the bucket endpoint directly, bypassing the
        # CDN entirely (defense-in-depth violation against cache-failure
        # storms and against load spikes).
        #
        # ponytail: the signature is host-bound; signing against a host
        # the browser does NOT use yields an invalid signature. The CDN
        # proxies to the bucket and validates the signature using the
        # same access/secret keys.
        self.cdn_endpoint = override_cdn_endpoint.strip() if override_cdn_endpoint else ""
        if self.cdn_endpoint and self.cdn_endpoint != self.public_endpoint:
            self.cdn_signer = boto3.client(
                "s3",
                region_name=self.region,
                endpoint_url=self.cdn_endpoint,
                aws_access_key_id=access_key_id,
                aws_secret_access_key=secret_access_key,
                config=boto_config,
            )
        else:
            # CDN endpoint not configured OR matches the public endpoint:
            # reuse the existing signer. The signed URL is functionally
            # identical (same host), no extra client needed.
            self.cdn_signer = self.s3_signer
            self.cdn_endpoint = self.public_endpoint

    def _require_cdn_signer(self) -> None:
        """Warn (NFR5.1) when a CDN-routed signed-URL operation has no
        CDN endpoint configured.

        Bugfix (prod, 2026-09-25): this used to hard-fail every call —
        catalog-grid covers and the product gallery went down entirely
        the moment `DO_CDN_ENDPOINT` was left unset (it was never wired
        into any deploy config, staging or prod). `__init__` already
        falls `self.cdn_signer` back to the public signer when the CDN
        endpoint is blank (same host, same credentials — a functionally
        valid signed URL, just not CDN-cached), so there was never a
        real reason to reject the request outright. Warn loudly instead,
        so the gap stays visible in logs without taking the feature
        down while DigitalOcean Spaces CDN gets enabled.

        Checks `self.cdn_endpoint` only (resolved once in `__init__` from
        either a constructor override or `settings.do_cdn_endpoint`) —
        not the global `settings` object again, so a constructor-injected
        endpoint (tests, or a future per-request override) is respected
        instead of silently re-reading the process-wide setting.
        """
        if not self.cdn_endpoint or self.cdn_endpoint == self.public_endpoint:
            logger.warning(
                "generate_cdn_download_url called with DO_CDN_ENDPOINT unset "
                "(NFR5.1) — falling back to the public signer, so this "
                "response will NOT be CDN-cached. Set DO_CDN_ENDPOINT once "
                "DigitalOcean Spaces CDN is enabled."
            )

    async def generate_presigned_url(
        self,
        file_path: str,
        content_type: str,
        max_size_bytes: int = 2_000_000,
        make_public: bool = False,
    ) -> dict[str, str | int]:
        """
        Generate presigned URL for direct upload from browser.

        Args:
            file_path: Path where file will be stored
            content_type: MIME type of the file
            max_size_bytes: Maximum file size (default 2MB)
            make_public: If True, require public-read ACL in upload

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

        params = {
            "Bucket": self.bucket,
            "Key": key,
            "ContentType": content_type,
        }

        # ponytail: public ACL for shareable product images (WhatsApp needs direct access)
        if make_public:
            params["ACL"] = "public-read"

        # Generate presigned URL for PUT operation (run sync boto3 call in thread pool)
        url = await asyncio.to_thread(
            lambda: self.s3_signer.generate_presigned_url(
                "put_object",
                Params=params,
                ExpiresIn=3600,  # 1 hour
                HttpMethod="PUT",
            )
        )

        public_url = f"{self.public_endpoint}/{self.bucket}/{key}"

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
        except (ClientError, BotoCoreError):
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
        make_public: bool = False,
    ) -> str:
        """
        Upload a file directly to Spaces (server-side upload).

        Args:
            file_path: Path where file will be stored
            file_bytes: File content as bytes
            content_type: MIME type of the file
            make_public: If True, set ACL to public-read for WhatsApp/OG sharing

        Returns:
            Public URL of the uploaded file
        """
        key = file_path

        put_params = {
            "Bucket": self.bucket,
            "Key": key,
            "Body": file_bytes,
            "ContentType": content_type,
        }

        # ponytail: public ACL for shareable product images (WhatsApp needs direct access)
        if make_public:
            put_params["ACL"] = "public-read"

        # Upload file to Spaces (run sync boto3 call in thread pool)
        try:
            await asyncio.to_thread(lambda: self.s3_client.put_object(**put_params))
        except (ClientError, BotoCoreError) as e:
            raise StorageUploadError(f"Failed to upload {key} to Spaces: {e}") from e

        # Return public URL
        public_url = f"{self.public_endpoint}/{self.bucket}/{key}"
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
            lambda: self.s3_signer.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": self.bucket,
                    "Key": key,
                },
                ExpiresIn=expires_in,
            )
        )
        return url

    async def generate_cdn_download_url(self, key: str, expires_in: int | None = None) -> str:
        """Generate a presigned URL against the CDN endpoint.

        Used for the catalog-grid cover-thumbnail flow (FR3.1, FR5.1):
        the browser fetches the thumbnail from the configured CDN, the
        CDN caches the response and proxies the first request to the
        origin. The signature is host-bound — signing against a host
        the browser will NOT use yields an invalid signature, so we
        sign against the CDN host explicitly.

        Args:
            key: Storage key (e.g., "orgs/{org_id}/products/{uuid}-thumb.webp")
            expires_in: Seconds until URL expires. Defaults to
                `DEFAULT_SIGNED_URL_EXPIRES_IN` (15min, per OQ2 —
                consistent with the existing GET /products/{id}/image-urls
                endpoint). Shorter values align with the lifetime of a
                catalog page; longer values reduce signing churn.

        Returns:
            Presigned URL valid for downloading the file from the CDN,
            or — when `do_cdn_endpoint` is unset — a presigned URL
            against the public (non-CDN) endpoint, with a warning
            logged (NFR5.1; see `_require_cdn_signer`).
        """
        self._require_cdn_signer()
        ttl = expires_in if expires_in is not None else self.DEFAULT_SIGNED_URL_EXPIRES_IN
        url = await asyncio.to_thread(
            lambda: self.cdn_signer.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": self.bucket,
                    "Key": key,
                },
                ExpiresIn=ttl,
            )
        )
        return url

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
        try:
            response = await asyncio.to_thread(
                self.s3_client.get_object,
                Bucket=self.bucket,
                Key=key,
            )
        except (ClientError, BotoCoreError) as e:
            raise StorageReadError(f"Failed to read {key} from Spaces: {e}") from e

        body = response["Body"]
        try:
            return await asyncio.to_thread(body.read)
        except (ClientError, BotoCoreError) as e:
            raise StorageReadError(f"Failed to read {key} from Spaces: {e}") from e

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
        # ponytail: simple URL construction - works if file has public-read ACL
        return f"{self.public_endpoint}/{self.bucket}/{key}"


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
